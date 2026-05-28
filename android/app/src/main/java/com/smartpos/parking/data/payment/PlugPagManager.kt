package com.smartpos.parking.data.payment

import android.content.Context
import android.content.pm.PackageManager
import android.util.Log
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPag
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagCustomPrinterLayout
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagEventData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagEventListener
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagEffectuatePreAutoData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPaymentData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPreAutoData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPrintResult
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPrinterData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagPrinterListener
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagStyleData
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagTransactionResult
import br.com.uol.pagseguro.plugpagservice.wrapper.PlugPagVoidData
import br.com.uol.pagseguro.plugpagservice.wrapper.exception.PlugPagException
import com.smartpos.parking.domain.model.PagBankTransactionMeta
import com.smartpos.parking.domain.model.PaymentMethod
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.math.roundToInt

/**
 * Singleton de integração PlugPag — padrão [SmartCoffee demo](https://github.com/pagseguro/pagseguro-plugpagservicewrapper-smartcoffeedemo).
 *
 * Boas práticas PagBank aplicadas:
 * - Uma instância de [PlugPag] por app
 * - Logs nos retornos do wrapper
 * - Operações blocantes serializadas (pagamento, estorno, impressão)
 * - [PlugPag.isServiceBusy] antes de operações blocantes
 * - [PlugPag.isAuthenticated] + [PlugPag.startOnBoarding] (sem ativar se já autenticado)
 */
class PlugPagManager private constructor(
    private val appContext: Context
) {

    companion object {
        private const val TAG = "PlugPagManager"
        private const val PLUGPAG_SERVICE_PACKAGE = "br.com.uol.pagseguro.plugpagservice"
        private const val DEFAULT_PRINTER_QUALITY = 4
        private const val INIT_TIMEOUT_MS = 4_000L
        private const val MIN_AMOUNT_CENTS = 100
        private const val MIN_INSTALLMENT_AMOUNT_CENTS = 1_000

        private const val COLOR_BG = 0xFF080A0F.toInt()
        private const val COLOR_GOLD = 0xFFD4AF37.toInt()
        private const val COLOR_GOLD_LIGHT = 0xFFF5E6B8.toInt()
        private const val COLOR_TEXT = 0xFFF4F4F6.toInt()

        private val SERVICE_BUSY_CODES = setOf("SV03", "PP1017", "PP1047")
        private val CANCELLED_CODES = setOf("C13", "B018")

        @Volatile
        private var instance: PlugPagManager? = null

        fun getInstance(context: Context): PlugPagManager {
            return instance ?: synchronized(this) {
                instance ?: PlugPagManager(context.applicationContext).also { instance = it }
            }
        }
    }

    private val initLock = Any()
    private val blockingMutex = Mutex()

    @Volatile
    private var plugPag: PlugPag? = null

    private var passwordMaskLength = 0

    private val _events = MutableSharedFlow<PlugPagUiEvent>(extraBufferCapacity = 32)
    val events: SharedFlow<PlugPagUiEvent> = _events.asSharedFlow()

    fun warmUp() {
        runCatching { ensureInitialized() }
    }

    private fun ensureInitialized(): PlugPag? {
        plugPag?.let { return it }
        synchronized(initLock) {
            plugPag?.let { return it }
            val instance = PlugPag(appContext)
            configureBranding(instance)
            configurePrinterListener(instance)
            plugPag = instance
            log("PlugPag inicializado")
            return instance
        }
    }

    private fun requirePlugPag(): PlugPag =
        ensureInitialized() ?: throw IllegalStateException("PlugPag não disponível neste dispositivo")

    private fun log(message: String) {
        Log.i(TAG, message)
    }

    private fun logResult(operation: String, result: PlugPagTransactionResult) {
        Log.i(
            TAG,
            "$operation result=${result.result} errorCode=${result.errorCode} message=${result.message}"
        )
    }

    private fun logPrintResult(operation: String, result: PlugPagPrintResult) {
        Log.i(
            TAG,
            "$operation result=${result.result} errorCode=${result.errorCode} message=${result.message}"
        )
    }

    fun isPlugPagServiceInstalled(): Boolean = runCatching {
        appContext.packageManager.getPackageInfo(PLUGPAG_SERVICE_PACKAGE, 0)
        true
    }.getOrDefault(false)

    /**
     * Abre o fluxo de onboarding PagBank quando o terminal não está autenticado
     * (mesmo padrão do SmartCoffee demo).
     */
    suspend fun startOnBoarding(): Result<Unit> = withContext(Dispatchers.IO) {
        runCatching {
            val pag = requirePlugPag()
            pag.startOnBoarding()
            log("startOnBoarding() chamado")
        }
    }

    suspend fun getTerminalStatus(): TerminalStatus = withContext(Dispatchers.IO) {
        withTimeoutOrNull(INIT_TIMEOUT_MS) {
            try {
                if (!isPlugPagServiceInstalled()) {
                    return@withTimeoutOrNull TerminalStatus(
                        isAuthenticated = false,
                        libraryVersion = null,
                        message = "Serviço PlugPag não instalado neste dispositivo",
                        plugPagServiceInstalled = false,
                        serviceBusy = false
                    )
                }
                val pag = requirePlugPag()
                val authenticated = pag.isAuthenticated()
                val busy = runCatching { pag.isServiceBusy() }.getOrDefault(false)
                val version = runCatching {
                    pag.javaClass.getMethod("getVersionLib").invoke(pag) as? String
                }.getOrNull()
                TerminalStatus(
                    isAuthenticated = authenticated,
                    libraryVersion = version,
                    message = when {
                        busy -> "Terminal ocupado — aguarde a operação atual"
                        authenticated -> "Terminal PagBank autenticado"
                        else -> "Terminal não autenticado — toque em Ativar terminal"
                    },
                    plugPagServiceInstalled = true,
                    serviceBusy = busy
                )
            } catch (e: PlugPagException) {
                Log.e(TAG, "getTerminalStatus", e)
                TerminalStatus(
                    isAuthenticated = false,
                    libraryVersion = null,
                    message = e.message ?: "PlugPag indisponível",
                    plugPagServiceInstalled = isPlugPagServiceInstalled(),
                    serviceBusy = false
                )
            }
        } ?: TerminalStatus(
            isAuthenticated = false,
            libraryVersion = null,
            message = "PlugPag indisponível (timeout — comum no emulador)",
            plugPagServiceInstalled = isPlugPagServiceInstalled(),
            serviceBusy = false
        )
    }

    private suspend fun <T> withBlockingOperation(
        operationName: String,
        block: suspend (PlugPag) -> T
    ): T = blockingMutex.withLock {
        val pag = ensureInitialized()
            ?: throw IllegalStateException("PlugPag indisponível neste dispositivo")
        if (runCatching { pag.isServiceBusy() }.getOrDefault(false)) {
            throw PlugPagBusyException("Terminal ocupado ($operationName). Aguarde e tente novamente.")
        }
        block(pag)
    }

    private fun ensureAuthenticated(pag: PlugPag): PaymentGatewayResult.Failure? {
        if (!pag.isAuthenticated()) {
            return PaymentGatewayResult.Failure(
                "Terminal não autenticado. Use \"Ativar terminal\" ou faça login no app PagBank."
            )
        }
        return null
    }

    suspend fun doPayment(request: PaymentRequest): PaymentGatewayResult = withContext(Dispatchers.IO) {
        try {
            withBlockingOperation("doPayment") { pag ->
                ensureAuthenticated(pag)?.let { return@withBlockingOperation it }

                val amountCents = (request.amountReais * 100).roundToInt()
                when {
                    amountCents < MIN_AMOUNT_CENTS ->
                        return@withBlockingOperation PaymentGatewayResult.Failure(
                            "Valor mínimo para transação: R$ 1,00"
                        )
                    request.method == PaymentMethod.CREDIT &&
                        request.installments > 1 &&
                        amountCents < MIN_INSTALLMENT_AMOUNT_CENTS ->
                        return@withBlockingOperation PaymentGatewayResult.Failure(
                            "Parcelamento exige valor mínimo de R$ 10,00"
                        )
                }

                passwordMaskLength = 0
                val paymentData = buildPaymentData(request, amountCents)
                _events.tryEmit(PlugPagUiEvent.Status("Iniciando transação no terminal..."))

                val result = pag.doPayment(paymentData)
                logResult("doPayment", result)
                handleTransactionResult(result, request.amountReais, pag)
            }
        } catch (e: PlugPagBusyException) {
            PaymentGatewayResult.Failure(e.message ?: "Terminal ocupado")
        } catch (e: PlugPagException) {
            Log.e(TAG, "doPayment", e)
            PaymentGatewayResult.Failure(e.message ?: "Erro PlugPag")
        }
    }

    suspend fun abort(): Result<Unit> = withContext(Dispatchers.IO) {
        val pag = ensureInitialized() ?: return@withContext Result.failure(
            Exception("PlugPag indisponível")
        )
        runCatching {
            pag.abort()
            log("abort() chamado")
            _events.tryEmit(PlugPagUiEvent.Status("Operação cancelada"))
            Unit
        }
    }

    fun emitPrintStatus(message: String) {
        _events.tryEmit(PlugPagUiEvent.Status(message))
    }

    suspend fun printFromFile(filePath: String): PlugPagPrintAttempt = withContext(Dispatchers.IO) {
        try {
            withBlockingOperation("printFromFile") { pag ->
                ensureAuthenticated(pag)?.let { failure ->
                    return@withBlockingOperation PlugPagPrintAttempt.Error(failure.message)
                }

                val steps = (10 * 12).coerceAtLeast(PlugPag.MIN_PRINTER_STEPS)
                val printerData = PlugPagPrinterData(
                    filePath = filePath,
                    printerQuality = DEFAULT_PRINTER_QUALITY,
                    steps = steps
                )

                _events.tryEmit(PlugPagUiEvent.Status("Enviando recibo para impressora..."))

                val result = pag.printFromFile(printerData)
                logPrintResult("printFromFile", result)
                if (result.result == PlugPag.RET_OK) {
                    PlugPagPrintAttempt.Ok
                } else {
                    PlugPagPrintAttempt.Error(
                        result.message?.takeIf { it.isNotBlank() }
                            ?: "Falha na impressão (código ${result.result})"
                    )
                }
            }
        } catch (e: PlugPagBusyException) {
            PlugPagPrintAttempt.Error(e.message ?: "Terminal ocupado")
        } catch (e: PlugPagException) {
            Log.e(TAG, "printFromFile", e)
            PlugPagPrintAttempt.Error(e.message ?: "Erro PlugPag ao imprimir")
        }
    }

    suspend fun voidPayment(
        transactionCode: String,
        transactionId: String,
        originalMethod: PaymentMethod
    ): PaymentGatewayResult = withContext(Dispatchers.IO) {
        try {
            withBlockingOperation("voidPayment") { pag ->
                ensureAuthenticated(pag)?.let { return@withBlockingOperation it }

                val voidType = when (originalMethod) {
                    PaymentMethod.PIX -> PlugPag.VOID_QRCODE
                    else -> PlugPag.VOID_PAYMENT
                }

                val voidData = PlugPagVoidData(
                    transactionCode = transactionCode,
                    transactionId = transactionId,
                    voidType = voidType,
                    printReceipt = false
                )
                val result = pag.voidPayment(voidData)
                logResult("voidPayment", result)
                handleTransactionResult(result, amountReais = null, pag)
            }
        } catch (e: PlugPagBusyException) {
            PaymentGatewayResult.Failure(e.message ?: "Terminal ocupado")
        } catch (e: PlugPagException) {
            Log.e(TAG, "voidPayment", e)
            PaymentGatewayResult.Failure(e.message ?: "Erro no estorno")
        }
    }

    suspend fun createPreAuthorization(request: PreAuthRequest): PaymentGatewayResult =
        withContext(Dispatchers.IO) {
            try {
                withBlockingOperation("doPreAutoCreate") { pag ->
                    ensureAuthenticated(pag)?.let { return@withBlockingOperation it }

                    val amountCents = (request.amountReais * 100).roundToInt()
                    if (amountCents < MIN_AMOUNT_CENTS) {
                        return@withBlockingOperation PaymentGatewayResult.Failure(
                            "Valor mínimo para pré-autorização: R$ 1,00"
                        )
                    }
                    if (request.installments > 1 && amountCents < MIN_INSTALLMENT_AMOUNT_CENTS) {
                        return@withBlockingOperation PaymentGatewayResult.Failure(
                            "Parcelamento exige valor mínimo de R$ 10,00"
                        )
                    }

                    val (installmentType, installments) = preAutoInstallmentParams(request.installments)
                    passwordMaskLength = 0
                    _events.tryEmit(PlugPagUiEvent.Status("Iniciando pré-autorização no cartão..."))

                    val result = pag.doPreAutoCreate(
                        PlugPagPreAutoData(
                            amountCents,
                            installmentType,
                            installments,
                            buildUserReference(request.tableNumber),
                            request.printReceipt
                        )
                    )
                    logResult("doPreAutoCreate", result)
                    handleTransactionResult(result, request.amountReais, pag)
                }
            } catch (e: PlugPagBusyException) {
                PaymentGatewayResult.Failure(e.message ?: "Terminal ocupado")
            } catch (e: PlugPagException) {
                Log.e(TAG, "createPreAuthorization", e)
                PaymentGatewayResult.Failure(e.message ?: "Erro na pré-autorização")
            }
        }

    suspend fun effectuatePreAuthorization(request: PreAuthCaptureRequest): PaymentGatewayResult =
        withContext(Dispatchers.IO) {
            try {
                withBlockingOperation("doEffectuatePreAuto") { pag ->
                    ensureAuthenticated(pag)?.let { return@withBlockingOperation it }

                    val captureCents = (request.captureAmountReais * 100).roundToInt()
                    if (captureCents < MIN_AMOUNT_CENTS) {
                        return@withBlockingOperation PaymentGatewayResult.Failure(
                            "Valor mínimo para captura: R$ 1,00"
                        )
                    }

                    passwordMaskLength = 0
                    _events.tryEmit(PlugPagUiEvent.Status("Capturando pré-autorização..."))

                    val result = pag.doEffectuatePreAuto(
                        PlugPagEffectuatePreAutoData(
                            captureCents,
                            buildUserReference(request.tableNumber),
                            request.printReceipt,
                            request.transactionId,
                            request.transactionCode
                        )
                    )
                    logResult("doEffectuatePreAuto", result)
                    handleTransactionResult(result, request.captureAmountReais, pag)
                }
            } catch (e: PlugPagBusyException) {
                PaymentGatewayResult.Failure(e.message ?: "Terminal ocupado")
            } catch (e: PlugPagException) {
                Log.e(TAG, "effectuatePreAuthorization", e)
                PaymentGatewayResult.Failure(e.message ?: "Erro ao capturar pré-autorização")
            }
        }

    suspend fun cancelPreAuthorization(
        transactionId: String,
        transactionCode: String
    ): PaymentGatewayResult = withContext(Dispatchers.IO) {
        try {
            withBlockingOperation("doPreAutoCancel") { pag ->
                ensureAuthenticated(pag)?.let { return@withBlockingOperation it }

                _events.tryEmit(PlugPagUiEvent.Status("Cancelando pré-autorização..."))
                val result = pag.doPreAutoCancel(transactionId, transactionCode)
                logResult("doPreAutoCancel", result)
                handleTransactionResult(result, amountReais = null, pag)
            }
        } catch (e: PlugPagBusyException) {
            PaymentGatewayResult.Failure(e.message ?: "Terminal ocupado")
        } catch (e: PlugPagException) {
            Log.e(TAG, "cancelPreAuthorization", e)
            PaymentGatewayResult.Failure(e.message ?: "Erro ao cancelar pré-autorização")
        }
    }

    private fun preAutoInstallmentParams(installments: Int): Pair<Int, Int> {
        return if (installments > 1) {
            PlugPag.INSTALLMENT_TYPE_PARC_VENDEDOR to installments
        } else {
            PlugPag.INSTALLMENT_TYPE_A_VISTA to PlugPag.A_VISTA_INSTALLMENT_QUANTITY
        }
    }

    private fun handleTransactionResult(
        result: PlugPagTransactionResult,
        amountReais: Double?,
        pag: PlugPag
    ): PaymentGatewayResult {
        if (result.errorCode in SERVICE_BUSY_CODES) {
            runCatching { pag.abort() }
            log("Serviço ocupado (${result.errorCode}) — abort() enviado")
            return PaymentGatewayResult.Failure(
                "Terminal ocupado. Aguarde a operação atual e tente novamente.",
                result.errorCode
            )
        }

        if (result.result == PlugPag.RET_OK) {
            val paid = amountReais ?: result.amount?.toDoubleOrNull()?.div(100.0) ?: 0.0
            return PaymentGatewayResult.Success(
                amountReais = paid,
                meta = PagBankTransactionMeta(
                    transactionId = result.transactionId,
                    transactionCode = result.transactionCode,
                    hostNsu = result.hostNsu,
                    nsu = result.nsu,
                    autoCode = result.autoCode,
                    cardBrand = result.cardBrand,
                    pixTxIdCode = result.pixTxIdCode,
                    plugPagPaymentType = result.paymentType,
                    processedOnTerminal = true
                )
            )
        }

        val code = result.errorCode?.takeIf { it.isNotBlank() }
        val msg = result.message?.takeIf { it.isNotBlank() }
            ?: plugPagErrorMessage(result.result)

        if (isCancelled(msg, code)) {
            return PaymentGatewayResult.Cancelled
        }

        return PaymentGatewayResult.Failure(msg, code)
    }

    private fun configurePrinterListener(plugPag: PlugPag) {
        try {
            plugPag.setPrinterListener(object : PlugPagPrinterListener {
                override fun onError(result: PlugPagPrintResult) {
                    logPrintResult("printerListener.onError", result)
                    val msg = result.message?.takeIf { it.isNotBlank() }
                        ?: "Erro na impressão (${result.errorCode ?: result.result})"
                    _events.tryEmit(PlugPagUiEvent.Status(msg))
                }

                override fun onSuccess(result: PlugPagPrintResult) {
                    logPrintResult("printerListener.onSuccess", result)
                    _events.tryEmit(PlugPagUiEvent.Status("Impressão concluída"))
                }
            })
        } catch (e: Exception) {
            Log.w(TAG, "setPrinterListener", e)
        }
    }

    private fun configureBranding(plugPag: PlugPag) {
        try {
            plugPag.setEventListener(object : PlugPagEventListener {
                override fun onEvent(data: PlugPagEventData) {
                    when (data.eventCode) {
                        PlugPagEventData.EVENT_CODE_DIGIT_PASSWORD -> {
                            passwordMaskLength++
                            _events.tryEmit(
                                PlugPagUiEvent.Progress("Senha: ${"•".repeat(passwordMaskLength.coerceAtMost(8))}")
                            )
                        }
                        PlugPagEventData.EVENT_CODE_NO_PASSWORD -> {
                            passwordMaskLength = 0
                            _events.tryEmit(PlugPagUiEvent.Progress("Digite a senha no terminal"))
                        }
                        else -> {
                            val msg = data.customMessage?.takeIf { it.isNotBlank() }
                                ?: data.foreignMessage?.takeIf { it.isNotBlank() }
                                ?: eventMessageForCode(data.eventCode)
                            _events.tryEmit(PlugPagUiEvent.Progress(msg))
                        }
                    }
                }
            })

            val style = PlugPagStyleData(
                headTextColor = COLOR_TEXT,
                headBackgroundColor = COLOR_BG,
                contentTextColor = COLOR_TEXT,
                contentTextValue1Color = COLOR_GOLD,
                contentTextValue2Color = COLOR_GOLD_LIGHT,
                positiveButtonTextColor = COLOR_BG,
                positiveButtonBackground = COLOR_GOLD,
                negativeButtonTextColor = COLOR_TEXT,
                negativeButtonBackground = COLOR_BG,
                genericButtonBackground = COLOR_GOLD,
                genericButtonTextColor = COLOR_BG,
                genericSmsEditTextBackground = COLOR_BG,
                genericSmsEditTextTextColor = COLOR_GOLD,
                lineColor = COLOR_GOLD
            )
            plugPag.setStyleData(style)

            plugPag.setPlugPagCustomPrinterLayout(
                PlugPagCustomPrinterLayout(
                    title = "SmartPos Food",
                    titleColor = COLOR_GOLD.toString(),
                    confirmTextColor = COLOR_BG.toString(),
                    cancelTextColor = COLOR_TEXT.toString(),
                    windowBackgroundColor = COLOR_BG.toString(),
                    buttonBackgroundColor = COLOR_GOLD.toString(),
                    buttonBackgroundColorDisabled = COLOR_TEXT.toString(),
                    sendSMSTextColor = COLOR_GOLD_LIGHT.toString(),
                    maxTimeShowPopup = 60
                )
            )
        } catch (e: Exception) {
            Log.w(TAG, "configureBranding", e)
        }
    }

    private fun buildPaymentData(request: PaymentRequest, amountCents: Int): PlugPagPaymentData {
        val type = when (request.method) {
            PaymentMethod.CREDIT -> PlugPag.TYPE_CREDITO
            PaymentMethod.DEBIT -> PlugPag.TYPE_DEBITO
            PaymentMethod.PIX -> PlugPag.TYPE_PIX
            PaymentMethod.CASH -> throw IllegalArgumentException("Dinheiro não usa PlugPag")
            PaymentMethod.PRE_AUTH -> throw IllegalArgumentException("Use createPreAuthorization para pré-autorizar")
        }

        val installmentType = if (request.method == PaymentMethod.CREDIT && request.installments > 1) {
            PlugPag.INSTALLMENT_TYPE_PARC_VENDEDOR
        } else {
            PlugPag.INSTALLMENT_TYPE_A_VISTA
        }

        val installments = if (request.method == PaymentMethod.CREDIT && request.installments > 1) {
            request.installments
        } else {
            PlugPag.A_VISTA_INSTALLMENT_QUANTITY
        }

        return PlugPagPaymentData(
            type = type,
            amount = amountCents,
            installmentType = installmentType,
            installments = installments,
            userReference = buildUserReference(request.tableNumber),
            printReceipt = request.printReceipt,
            partialPay = request.isPartial,
            isCarne = false
        )
    }

    private fun isCancelled(message: String, errorCode: String?): Boolean {
        if (errorCode in CANCELLED_CODES) return true
        val m = message.lowercase()
        return m.contains("cancel") || m.contains("abort") ||
            errorCode?.contains("CANCEL", ignoreCase = true) == true
    }

    private fun plugPagErrorMessage(result: Int?): String =
        "Falha na transação (código ${result ?: "?"})"

    private fun eventMessageForCode(eventCode: Int): String = when (eventCode) {
        PlugPagEventData.EVENT_CODE_WAITING_CARD -> "Aguardando cartão..."
        PlugPagEventData.EVENT_CODE_INSERTED_CARD -> "Cartão inserido"
        PlugPagEventData.EVENT_CODE_PIN_REQUESTED -> "Digite a senha"
        PlugPagEventData.EVENT_CODE_AUTHORIZING -> "Autorizando..."
        PlugPagEventData.EVENT_CODE_SALE_APPROVED -> "Venda aprovada"
        PlugPagEventData.EVENT_CODE_SALE_NOT_APPROVED -> "Venda não aprovada"
        PlugPagEventData.EVENT_CODE_QRCODE -> "Aguardando QR Code PIX"
        PlugPagEventData.EVENT_CODE_REMOVED_CARD -> "Remova o cartão"
        else -> "Processando pagamento..."
    }

    private fun buildUserReference(tableNumber: Int): String {
        val base = "M${tableNumber.coerceIn(0, 99)}"
        val suffix = (System.currentTimeMillis() % 10000).toString().padStart(4, '0')
        return (base + suffix).take(10).filter { it.isLetterOrDigit() }
    }
}
