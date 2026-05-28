package com.smartpos.parking.data.auth

import com.smartpos.parking.data.api.ApiMappers.toAuthUser
import com.smartpos.parking.data.api.AuthTokenStore
import com.smartpos.parking.data.api.ParkingApiClient
import com.smartpos.parking.data.api.ValetRealtimeClient
import com.smartpos.parking.data.api.apiCall
import com.smartpos.parking.data.api.dto.LoginRequestDto
import com.smartpos.parking.data.repository.ApiParkingRepository
import com.smartpos.parking.domain.model.AuthUser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class AuthRepository(
    private val tokenStore: AuthTokenStore,
    private val apiClient: ParkingApiClient,
    private val parkingRepository: ApiParkingRepository,
    private val valetRealtime: ValetRealtimeClient?
) {

    private val _currentUser = MutableStateFlow<AuthUser?>(null)
    val currentUser: StateFlow<AuthUser?> = _currentUser.asStateFlow()

    private val _isLoggedIn = MutableStateFlow(tokenStore.hasToken())
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()

    private val _sessionError = MutableStateFlow<String?>(null)
    val sessionError: StateFlow<String?> = _sessionError.asStateFlow()

    fun onUnauthorized() {
        valetRealtime?.disconnect()
        logout()
        _sessionError.value = "Sessão expirada. Faça login novamente."
    }

    fun clearSessionError() {
        _sessionError.value = null
    }

    suspend fun login(tenantSlug: String, email: String, password: String): Result<AuthUser> {
        val result = apiCall {
            apiClient.authApi.login(
                LoginRequestDto(
                    tenantSlug = tenantSlug.trim(),
                    email = email.trim(),
                    password = password
                )
            )
        }
        return result.fold(
            onSuccess = { response ->
                tokenStore.accessToken = response.accessToken
                val user = response.user.toAuthUser()
                persistUser(user, tenantSlug.trim())
                _currentUser.value = user
                _isLoggedIn.value = true
                parkingRepository.loadBootstrap().fold(
                    onSuccess = {
                        valetRealtime?.connect()
                        Result.success(user)
                    },
                    onFailure = { err ->
                        logout()
                        Result.failure(err)
                    }
                )
            },
            onFailure = { Result.failure(it) }
        )
    }

    suspend fun restoreSession(): Boolean {
        if (!tokenStore.hasToken()) {
            _isLoggedIn.value = false
            return false
        }
        val meResult = apiCall { apiClient.authApi.me() }
        if (meResult.isFailure) {
            logout()
            return false
        }
        val user = meResult.getOrThrow().toAuthUser()
        _currentUser.value = user
        _isLoggedIn.value = true
        val ok = parkingRepository.loadBootstrap().isSuccess
        if (ok) valetRealtime?.connect()
        return ok
    }

    fun logout() {
        valetRealtime?.disconnect()
        tokenStore.clear()
        _currentUser.value = null
        _isLoggedIn.value = false
        parkingRepository.clearLocalState()
    }

    private fun persistUser(user: AuthUser, tenantSlug: String) {
        tokenStore.tenantSlug = tenantSlug
        tokenStore.userName = user.name
        tokenStore.userEmail = user.email
    }

    fun savedTenantSlug(): String = tokenStore.tenantSlug ?: "home"

    fun savedEmail(): String = tokenStore.userEmail ?: ""
}
