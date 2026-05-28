package com.smartpos.parking.data.api

class ApiException(
    override val message: String,
    val statusCode: Int? = null
) : Exception(message)
