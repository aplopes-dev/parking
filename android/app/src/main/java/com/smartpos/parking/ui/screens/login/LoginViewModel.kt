package com.smartpos.parking.ui.screens.login

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.smartpos.parking.data.api.ApiErrorParser
import com.smartpos.parking.data.auth.AuthRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class LoginUiState(
    val tenantSlug: String = "home",
    val email: String = "",
    val password: String = "",
    val loading: Boolean = false,
    val error: String? = null,
    val loginSuccess: Boolean = false
)

class LoginViewModel(
    private val authRepository: AuthRepository
) : ViewModel() {

    private val _ui = MutableStateFlow(
        LoginUiState(
            tenantSlug = authRepository.savedTenantSlug(),
            email = authRepository.savedEmail()
        )
    )
    val uiState: StateFlow<LoginUiState> = _ui.asStateFlow()

    fun setTenantSlug(value: String) {
        _ui.update { it.copy(tenantSlug = value, error = null) }
    }

    fun setEmail(value: String) {
        _ui.update { it.copy(email = value, error = null) }
    }

    fun setPassword(value: String) {
        _ui.update { it.copy(password = value, error = null) }
    }

    fun login() {
        val state = _ui.value
        if (state.tenantSlug.isBlank() || state.email.isBlank() || state.password.isBlank()) {
            _ui.update { it.copy(error = "Preencha organização, e-mail e senha") }
            return
        }
        viewModelScope.launch {
            _ui.update { it.copy(loading = true, error = null, loginSuccess = false) }
            authRepository.login(state.tenantSlug, state.email, state.password)
                .onSuccess {
                    _ui.update { it.copy(loading = false, loginSuccess = true) }
                }
                .onFailure { e ->
                    _ui.update {
                        it.copy(
                            loading = false,
                            error = ApiErrorParser.messageFrom(e)
                        )
                    }
                }
        }
    }

    fun clearError() {
        _ui.update { it.copy(error = null) }
    }

    companion object {
        fun factory(authRepository: AuthRepository) = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T =
                LoginViewModel(authRepository) as T
        }
    }
}
