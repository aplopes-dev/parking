package com.smartpos.parking.data.print

enum class PrintFileFormat(val label: String) {
    PNG("PNG"),
    RAW_RASTER("Bitmap raw 1bpp"),
    MONO_BMP("BMP monocromático")
}
