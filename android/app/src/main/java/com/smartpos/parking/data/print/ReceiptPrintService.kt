package com.smartpos.parking.data.print

import android.content.Context
import com.smartpos.parking.BuildConfig
import com.smartpos.parking.data.payment.PlugPagManager
import com.smartpos.parking.data.payment.PlugPagPrintAttempt
import com.smartpos.parking.domain.model.ReceiptDocument
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

sealed class ReceiptPrintResult {
    data class Success(val formatUsed: PrintFileFormat) : ReceiptPrintResult()
    data class Failure(
        val message: String,
        val triedFormats: List<PrintFileFormat> = emptyList()
    ) : ReceiptPrintResult()
}

class ReceiptPrintService(
    private val context: Context,
    private val plugPagManager: PlugPagManager
) {

    private val formatAttempts = listOf(
        PrintFileFormat.PNG to { files: ReceiptPrintFiles -> files.png },
        PrintFileFormat.RAW_RASTER to { files: ReceiptPrintFiles -> files.rawRaster },
        PrintFileFormat.MONO_BMP to { files: ReceiptPrintFiles -> files.monoBmp }
    )

    suspend fun printReceipt(receipt: ReceiptDocument): ReceiptPrintResult = withContext(Dispatchers.IO) {
        val status = plugPagManager.getTerminalStatus()
        if (!status.isAuthenticated) {
            if (BuildConfig.DEBUG) {
                return@withContext ReceiptPrintResult.Success(PrintFileFormat.PNG)
            }
            return@withContext ReceiptPrintResult.Failure(
                "Terminal não autenticado. Faça login no PagBank para imprimir."
            )
        }

        val files = runCatching { ReceiptPrintRenderer.createPrintFiles(context, receipt) }
            .getOrElse { e ->
                return@withContext ReceiptPrintResult.Failure(
                    "Erro ao gerar arquivos do recibo: ${e.message}"
                )
            }

        val tried = mutableListOf<PrintFileFormat>()
        var lastError = "Falha desconhecida"

        for ((format, pathSelector) in formatAttempts) {
            tried += format
            plugPagManager.emitPrintStatus("Imprimindo (${format.label})...")

            when (val attempt = plugPagManager.printFromFile(pathSelector(files).absolutePath)) {
                is PlugPagPrintAttempt.Ok -> {
                    return@withContext ReceiptPrintResult.Success(format)
                }
                is PlugPagPrintAttempt.Error -> {
                    lastError = attempt.message
                    plugPagManager.emitPrintStatus("Falhou ${format.label}, tentando próximo formato...")
                }
            }
        }

        ReceiptPrintResult.Failure(
            message = "Impressão falhou em todos os formatos. Último erro: $lastError",
            triedFormats = tried
        )
    }
}
