package com.smartpos.parking.data.print

import java.io.File

data class ReceiptPrintFiles(
    val png: File,
    val rawRaster: File,
    val monoBmp: File
)
