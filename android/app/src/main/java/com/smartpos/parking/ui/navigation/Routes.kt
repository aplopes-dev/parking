package com.smartpos.parking.ui.navigation

object Routes {
    const val LOGIN = "login"
    const val VALET = "valet"
    const val RECEIVE = "receive"
    const val TICKET_DETAIL = "ticket/{ticketId}"
    const val DELIVER = "deliver/{ticketId}"

    fun ticketDetail(ticketId: String) = "ticket/$ticketId"
    fun deliver(ticketId: String) = "deliver/$ticketId"
}
