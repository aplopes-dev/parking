package com.smartpos.parking.data.print

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Typeface
import com.smartpos.parking.domain.model.ReceiptDocument
import java.io.File
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Renderiza o recibo em bitmap e gera arquivos nos formatos suportados pelo PlugPag.
 */
object ReceiptPrintRenderer {

    const val PRINT_WIDTH_PX = 384

    private val currency: NumberFormat = NumberFormat.getCurrencyInstance(Locale("pt", "BR"))
    private val dateFormat = SimpleDateFormat("dd/MM/yyyy HH:mm", Locale.getDefault())

    fun renderBitmap(receipt: ReceiptDocument, forThermal: Boolean = false): Bitmap {
        val lines = buildLines(receipt)
        val paintTitle = Paint().apply {
            color = Color.BLACK
            textSize = 28f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            isAntiAlias = !forThermal
        }
        val paintBody = Paint().apply {
            color = Color.BLACK
            textSize = 22f
            isAntiAlias = !forThermal
        }
        val paintSmall = Paint().apply {
            color = Color.BLACK
            textSize = 18f
            isAntiAlias = !forThermal
        }

        val lineHeight = 30
        val padding = 24
        var height = padding * 2
        lines.forEach { line ->
            height += if (line.bold) lineHeight + 4 else lineHeight
        }

        val bitmap = Bitmap.createBitmap(PRINT_WIDTH_PX, height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        canvas.drawColor(Color.WHITE)

        var y = padding.toFloat() + 24f
        lines.forEach { line ->
            val paint = when {
                line.bold -> paintTitle
                line.small -> paintSmall
                else -> paintBody
            }
            if (line.centered) {
                val textWidth = paint.measureText(line.text)
                canvas.drawText(line.text, (PRINT_WIDTH_PX - textWidth) / 2f, y, paint)
            } else if (line.right != null) {
                canvas.drawText(line.text, padding.toFloat(), y, paint)
                val rw = paintSmall.measureText(line.right)
                canvas.drawText(line.right, PRINT_WIDTH_PX - padding - rw, y, paintSmall)
            } else {
                canvas.drawText(line.text, padding.toFloat(), y, paint)
            }
            y += if (line.bold) lineHeight + 4 else lineHeight
        }
        return bitmap
    }

    fun createPrintFiles(context: Context, receipt: ReceiptDocument): ReceiptPrintFiles {
        val id = receipt.id.take(8)
        val dir = File(context.cacheDir, "prints").apply { mkdirs() }

        val pngBitmap = renderBitmap(receipt, forThermal = false)
        val thermalBitmap = renderBitmap(receipt, forThermal = true)

        val png = File(dir, "receipt_${id}.png")
        val raw = File(dir, "receipt_${id}_raw")
        val bmp = File(dir, "receipt_${id}.bmp")

        ThermalBitmapEncoder.writePng(png, pngBitmap)
        ThermalBitmapEncoder.writeRawRaster(raw, thermalBitmap)
        ThermalBitmapEncoder.writeMonoBmp(bmp, thermalBitmap)

        pngBitmap.recycle()
        thermalBitmap.recycle()

        return ReceiptPrintFiles(png = png, rawRaster = raw, monoBmp = bmp)
    }

    private fun buildLines(receipt: ReceiptDocument): List<PrintLine> {
        val result = mutableListOf<PrintLine>()
        result += PrintLine(receipt.title, centered = true, bold = true)
        receipt.subtitle?.let { result += PrintLine(it, centered = true, small = true) }
        result += PrintLine(dateFormat.format(Date(receipt.issuedAt)), centered = true, small = true)
        result += PrintLine("--------------------------------", centered = true, small = true)
        receipt.lines.forEach { line ->
            result += PrintLine(line)
        }
        if (receipt.totalAmount != null) {
            result += PrintLine("--------------------------------", centered = true, small = true)
            result += PrintLine(
                receipt.totalLabel ?: "TOTAL",
                right = format(receipt.totalAmount),
                bold = true
            )
        }
        result += PrintLine("ID: ${receipt.id.take(8).uppercase()}", centered = true, small = true)
        result += PrintLine("Documento nao fiscal", centered = true, small = true)
        return result
    }

    private fun format(value: Double): String = currency.format(value)

    private data class PrintLine(
        val text: String,
        val right: String? = null,
        val centered: Boolean = false,
        val bold: Boolean = false,
        val small: Boolean = false
    )
}
