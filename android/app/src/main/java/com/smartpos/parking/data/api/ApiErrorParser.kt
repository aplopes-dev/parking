package com.smartpos.parking.data.api

import com.google.gson.Gson
import com.smartpos.parking.data.api.dto.ApiErrorDto
import retrofit2.HttpException

object ApiErrorParser {

    private val gson = Gson()

    fun messageFrom(throwable: Throwable): String = when (throwable) {
        is HttpException -> {
            val body = throwable.response()?.errorBody()?.string()
            parseBody(body) ?: "Erro HTTP ${throwable.code()}"
        }
        is ApiException -> throwable.message
        else -> throwable.message ?: "Erro desconhecido"
    }

    fun statusCodeFrom(throwable: Throwable): Int? = when (throwable) {
        is HttpException -> throwable.code()
        is ApiException -> throwable.statusCode
        else -> null
    }

    private fun parseBody(body: String?): String? {
        if (body.isNullOrBlank()) return null
        return runCatching {
            val dto = gson.fromJson(body, ApiErrorDto::class.java)
            when (val msg = dto.message) {
                is String -> msg
                is List<*> -> msg.joinToString { it.toString() }
                else -> dto.error
            }
        }.getOrNull()
    }
}
