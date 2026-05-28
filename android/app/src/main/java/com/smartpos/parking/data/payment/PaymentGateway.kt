package com.smartpos.parking.data.payment

import com.smartpos.parking.domain.model.PagBankTransactionMeta
import com.smartpos.parking.domain.model.PaymentMethod

data class PaymentRequest(
    val tableId: String,
    val tableNumber: Int,
    val method: PaymentMethod,
    val amountReais: Double,
    val isPartial: Boolean,
    val installments: Int = 1,
    val printReceipt: Boolean = true
)

sealed class PaymentGatewayResult {
    data class Success(
        val amountReais: Double,
        val meta: PagBankTransactionMeta?
    ) : PaymentGatewayResult()

    data class Failure(val message: String, val errorCode: String? = null) : PaymentGatewayResult()

    data object Cancelled : PaymentGatewayResult()
}

interface PaymentGateway {
    suspend fun checkTerminalReady(): TerminalStatus
    suspend fun processPayment(request: PaymentRequest): PaymentGatewayResult
    suspend fun abortCurrentOperation(): Result<Unit>
    suspend fun voidTransaction(
        transactionCode: String,
        transactionId: String,
        originalMethod: PaymentMethod
    ): PaymentGatewayResult

    suspend fun startTerminalOnBoarding(): Result<Unit>

    /** Reserva valor no cartão (crédito — fluxo `doPreAutoCreate`). */
    suspend fun createPreAuthorization(request: PreAuthRequest): PaymentGatewayResult

    /** Captura a pré-autorização (cobrança efetiva — `doEffectuatePreAuto`). */
    suspend fun capturePreAuthorization(request: PreAuthCaptureRequest): PaymentGatewayResult

    /** Cancela reserva no cartão (`doPreAutoCancel`). */
    suspend fun cancelPreAuthorization(
        transactionId: String,
        transactionCode: String
    ): PaymentGatewayResult

    fun observeEvents(): kotlinx.coroutines.flow.Flow<PlugPagUiEvent>
}

data class TerminalStatus(
    val isAuthenticated: Boolean,
    val libraryVersion: String?,
    val message: String,
    val plugPagServiceInstalled: Boolean = true,
    val serviceBusy: Boolean = false
)

sealed class PlugPagUiEvent {
    data class Status(val message: String) : PlugPagUiEvent()
    data class Progress(val message: String) : PlugPagUiEvent()
}
