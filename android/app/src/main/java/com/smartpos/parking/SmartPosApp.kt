package com.smartpos.parking

import android.app.Application
import com.smartpos.parking.data.api.AuthTokenStore
import com.smartpos.parking.data.api.ParkingApiClient
import com.smartpos.parking.data.api.ValetRealtimeClient
import com.smartpos.parking.data.auth.AuthRepository
import com.smartpos.parking.data.payment.MockPlugPagPaymentGateway
import com.smartpos.parking.data.payment.PaymentGateway
import com.smartpos.parking.data.payment.PlugPagManager
import com.smartpos.parking.data.payment.PlugPagPaymentGateway
import com.smartpos.parking.data.print.ReceiptPrintService
import com.smartpos.parking.data.repository.ApiParkingRepository
import com.smartpos.parking.data.repository.ParkingRepository
import com.smartpos.parking.data.security.SecureStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class SmartPosApp : Application() {

    private val appScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    val secureStore: SecureStore by lazy { SecureStore(this) }
    val tokenStore: AuthTokenStore by lazy { AuthTokenStore(secureStore) }

    val apiParkingRepository: ApiParkingRepository by lazy {
        ApiParkingRepository(parkingApiClient)
    }

    private lateinit var authRef: AuthRepository

    val parkingApiClient: ParkingApiClient by lazy {
        ParkingApiClient(tokenStore) {
            if (::authRef.isInitialized) authRef.onUnauthorized()
        }
    }

    val valetRealtimeClient: ValetRealtimeClient? by lazy {
        if (BuildConfig.USE_MOCK_REPOSITORY) null
        else ValetRealtimeClient(
            okHttp = parkingApiClient.wsOkHttpClient,
            apiBase = BuildConfig.API_BASE_URL,
            tokenProvider = { tokenStore.accessToken },
            scope = appScope,
            onUpdate = { payload -> apiParkingRepository.applyRealtime(payload) }
        )
    }

    val authRepository: AuthRepository by lazy {
        AuthRepository(
            tokenStore,
            parkingApiClient,
            apiParkingRepository,
            valetRealtimeClient
        ).also { authRef = it }
    }

    val repository: ParkingRepository by lazy { apiParkingRepository }

    val plugPagManager: PlugPagManager by lazy { PlugPagManager.getInstance(this) }

    val receiptPrintService: ReceiptPrintService by lazy {
        ReceiptPrintService(this, plugPagManager)
    }

    val paymentGateway: PaymentGateway by lazy {
        val real = PlugPagPaymentGateway(plugPagManager)
        if (BuildConfig.DEBUG) MockPlugPagPaymentGateway(real) else real
    }

    override fun onCreate() {
        super.onCreate()
        appScope.launch(Dispatchers.IO) {
            plugPagManager.warmUp()
        }
    }
}
