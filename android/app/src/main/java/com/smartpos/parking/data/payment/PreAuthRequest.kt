package com.smartpos.parking.data.payment

/**
 * Cria reserva no cartão via [PlugPag.doPreAutoCreate] (crédito no terminal).
 */
data class PreAuthRequest(
    val tableNumber: Int,
    val amountReais: Double,
    val installments: Int = 1,
    val printReceipt: Boolean = true
)

/**
 * Captura valor da pré-autorização via [PlugPag.doEffectuatePreAuto].
 */
data class PreAuthCaptureRequest(
    val tableNumber: Int,
    val captureAmountReais: Double,
    val transactionId: String,
    val transactionCode: String,
    val printReceipt: Boolean = true
)
