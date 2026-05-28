package com.smartpos.parking.data.payment

/** Terminal PlugPag ocupado com outra operação blocante (SV03 / PP1017 / PP1047). */
class PlugPagBusyException(message: String) : Exception(message)
