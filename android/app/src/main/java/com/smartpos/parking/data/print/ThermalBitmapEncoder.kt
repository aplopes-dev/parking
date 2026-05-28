package com.smartpos.parking.data.print

import android.graphics.Bitmap
import android.graphics.Color
import java.io.File
import java.io.FileOutputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder

/**
 * Codificadores para impressoras térmicas via PlugPag printFromFile.
 * Fallback: PNG → raw raster 1bpp → BMP 1-bit.
 */
object ThermalBitmapEncoder {

    private const val THRESHOLD = 160

    fun toMonochrome(bitmap: Bitmap): Bitmap {
        val width = bitmap.width
        val height = bitmap.height
        val mono = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val pixels = IntArray(width * height)
        bitmap.getPixels(pixels, 0, width, 0, 0, width, height)
        for (i in pixels.indices) {
            val p = pixels[i]
            val luminance = (0.299 * Color.red(p) + 0.587 * Color.green(p) + 0.114 * Color.blue(p)).toInt()
            pixels[i] = if (luminance < THRESHOLD) Color.BLACK else Color.WHITE
        }
        mono.setPixels(pixels, 0, width, 0, 0, width, height)
        return mono
    }

    /**
     * Raster 1bpp: [width:4 LE][height:4 LE][rows MSB-first, 1=preto].
     */
    fun writeRawRaster(file: File, bitmap: Bitmap) {
        val mono = toMonochrome(bitmap)
        val width = mono.width
        val height = mono.height
        val rowBytes = (width + 7) / 8
        val pixelData = encodeRows1bpp(mono, width, height, rowBytes)
        mono.recycle()

        FileOutputStream(file).use { out ->
            val header = ByteBuffer.allocate(8).order(ByteOrder.LITTLE_ENDIAN)
            header.putInt(width)
            header.putInt(height)
            out.write(header.array())
            out.write(pixelData)
        }
    }

    /** BMP 1-bit BI_RGB, bottom-up, tabela preto/branco. */
    fun writeMonoBmp(file: File, bitmap: Bitmap) {
        val mono = toMonochrome(bitmap)
        val width = mono.width
        val height = mono.height
        val rowBytes = ((width + 31) / 32) * 4
        val imageSize = rowBytes * height
        val headerSize = 14 + 40 + 8
        val fileSize = headerSize + imageSize

        val buffer = ByteBuffer.allocate(fileSize).order(ByteOrder.LITTLE_ENDIAN)

        // BITMAPFILEHEADER
        buffer.put('B'.code.toByte())
        buffer.put('M'.code.toByte())
        buffer.putInt(fileSize)
        buffer.putShort(0)
        buffer.putShort(0)
        buffer.putInt(headerSize)

        // BITMAPINFOHEADER
        buffer.putInt(40)
        buffer.putInt(width)
        buffer.putInt(height)
        buffer.putShort(1)
        buffer.putShort(1)
        buffer.putInt(0)
        buffer.putInt(imageSize)
        buffer.putInt(0)
        buffer.putInt(0)
        buffer.putInt(0)
        buffer.putInt(0)

        // Palette: [0]=preto, [1]=branco (BGRA)
        buffer.put(0x00.toByte()); buffer.put(0x00.toByte()); buffer.put(0x00.toByte()); buffer.put(0x00.toByte())
        buffer.put(0xFF.toByte()); buffer.put(0xFF.toByte()); buffer.put(0xFF.toByte()); buffer.put(0x00.toByte())

        for (y in height - 1 downTo 0) {
            val row = encodeRow1bpp(mono, width, y, rowBytes)
            buffer.put(row)
        }
        mono.recycle()

        FileOutputStream(file).use { it.write(buffer.array()) }
    }

    fun writePng(file: File, bitmap: Bitmap) {
        FileOutputStream(file).use { out ->
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
        }
    }

    private fun encodeRows1bpp(mono: Bitmap, width: Int, height: Int, rowBytes: Int): ByteArray {
        val data = ByteArray(rowBytes * height)
        for (y in 0 until height) {
            val row = encodeRow1bpp(mono, width, y, rowBytes)
            System.arraycopy(row, 0, data, y * rowBytes, rowBytes)
        }
        return data
    }

    private fun encodeRow1bpp(mono: Bitmap, width: Int, y: Int, rowBytes: Int): ByteArray {
        val row = ByteArray(rowBytes)
        for (x in 0 until width) {
            if (isBlack(mono.getPixel(x, y))) {
                val byteIndex = x / 8
                val bit = 7 - (x % 8)
                row[byteIndex] = (row[byteIndex].toInt() or (1 shl bit)).toByte()
            }
        }
        return row
    }

    private fun isBlack(pixel: Int): Boolean {
        val luminance = (0.299 * Color.red(pixel) + 0.587 * Color.green(pixel) + 0.114 * Color.blue(pixel))
        return luminance < THRESHOLD
    }
}
