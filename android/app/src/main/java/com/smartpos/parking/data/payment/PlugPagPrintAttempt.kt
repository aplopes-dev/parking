package com.smartpos.parking.data.payment

sealed class PlugPagPrintAttempt {
    data object Ok : PlugPagPrintAttempt()
    data class Error(val message: String) : PlugPagPrintAttempt()
}
