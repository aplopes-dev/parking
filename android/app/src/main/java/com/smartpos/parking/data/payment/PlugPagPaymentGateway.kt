package com.smartpos.parking.data.payment

import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPag
import com.smartpos.parking.domain.model.PagBankTransactionMeta
import com.smartpos.parking.domain.model.PaymentMethod
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlin.random.Random

/**
 * Implementação do fluxo de pagamento via PlugPag.
 * Dinheiro é registrado localmente (sem terminal).
 */
class PlugPagPaymentGateway(
    private val plugPagManager: PlugPagManager
) : PaymentGateway {

    override suspend fun checkTerminalReady(): TerminalStatus =
        plugPagManager.getTerminalStatus()

    override suspend fun processPayment(request: PaymentRequest): PaymentGatewayResult {
        if (request.method == PaymentMethod.CASH) {
            return PaymentGatewayResult.Success(
                amountReais = request.amountReais,
                meta = PagBankTransactionMeta(processedOnTerminal = false)
            )
        }
        return plugPagManager.doPayment(request)
    }

    override suspend fun abortCurrentOperation(): Result<Unit> =
        plugPagManager.abort()

    override suspend fun voidTransaction(
        transactionCode: String,
        transactionId: String,
        originalMethod: PaymentMethod
    ): PaymentGatewayResult =
        plugPagManager.voidPayment(transactionCode, transactionId, originalMethod)

    override suspend fun startTerminalOnBoarding(): Result<Unit> =
        plugPagManager.startOnBoarding()

    override suspend fun createPreAuthorization(request: PreAuthRequest): PaymentGatewayResult =
        plugPagManager.createPreAuthorization(request)

    override suspend fun capturePreAuthorization(request: PreAuthCaptureRequest): PaymentGatewayResult =
        plugPagManager.effectuatePreAuthorization(request)

    override suspend fun cancelPreAuthorization(
        transactionId: String,
        transactionCode: String
    ): PaymentGatewayResult =
        plugPagManager.cancelPreAuthorization(transactionId, transactionCode)

    override fun observeEvents(): Flow<PlugPagUiEvent> = plugPagManager.events
}

/**
 * Simula o PlugPag em emulador/desenvolvimento quando o serviço não está disponível.
 */
class MockPlugPagPaymentGateway(
    private val realGateway: PlugPagPaymentGateway
) : PaymentGateway {

    override suspend fun checkTerminalReady(): TerminalStatus {
        val real = realGateway.checkTerminalReady()
        return if (real.isAuthenticated) {
            real
        } else {
            TerminalStatus(
                isAuthenticated = true,
                libraryVersion = "mock-dev",
                message = "Modo simulação (terminal PagBank indisponível)"
            )
        }
    }

    override suspend fun processPayment(request: PaymentRequest): PaymentGatewayResult {
        if (request.method == PaymentMethod.CASH) {
            delay(400)
            return PaymentGatewayResult.Success(request.amountReais, null)
        }

        val real = realGateway.processPayment(request)
        if (real is PaymentGatewayResult.Failure &&
            real.message.contains("autenticado", ignoreCase = true)
        ) {
            delay(1200)
            return PaymentGatewayResult.Success(
                amountReais = request.amountReais,
                meta = PagBankTransactionMeta(
                    transactionId = "MOCK${Random.nextInt(100000, 999999)}",
                    transactionCode = "MOCK${Random.nextInt(1000, 9999)}",
                    hostNsu = Random.nextInt(100000, 999999).toString(),
                    processedOnTerminal = false
                )
            )
        }
        return real
    }

    override suspend fun abortCurrentOperation(): Result<Unit> {
        delay(300)
        return Result.success(Unit)
    }

    override suspend fun voidTransaction(
        transactionCode: String,
        transactionId: String,
        originalMethod: PaymentMethod
    ): PaymentGatewayResult {
        delay(800)
        return PaymentGatewayResult.Success(0.0, null)
    }

    override suspend fun startTerminalOnBoarding(): Result<Unit> = Result.success(Unit)

    override suspend fun createPreAuthorization(request: PreAuthRequest): PaymentGatewayResult {
        val real = realGateway.createPreAuthorization(request)
        if (real is PaymentGatewayResult.Failure &&
            real.message.contains("autenticado", ignoreCase = true)
        ) {
            delay(1200)
            return PaymentGatewayResult.Success(
                amountReais = request.amountReais,
                meta = PagBankTransactionMeta(
                    transactionId = "PRE${Random.nextInt(100000, 999999)}",
                    transactionCode = "PRE${Random.nextInt(1000, 9999)}",
                    plugPagPaymentType = PlugPag.TYPE_PREAUTO_CARD,
                    processedOnTerminal = false
                )
            )
        }
        return real
    }

    override suspend fun capturePreAuthorization(request: PreAuthCaptureRequest): PaymentGatewayResult {
        val real = realGateway.capturePreAuthorization(request)
        if (real is PaymentGatewayResult.Failure &&
            real.message.contains("autenticado", ignoreCase = true)
        ) {
            delay(1000)
            return PaymentGatewayResult.Success(
                amountReais = request.captureAmountReais,
                meta = PagBankTransactionMeta(processedOnTerminal = false)
            )
        }
        return real
    }

    override suspend fun cancelPreAuthorization(
        transactionId: String,
        transactionCode: String
    ): PaymentGatewayResult {
        delay(600)
        return PaymentGatewayResult.Success(0.0, null)
    }

    override fun observeEvents(): Flow<PlugPagUiEvent> = realGateway.observeEvents()
}
