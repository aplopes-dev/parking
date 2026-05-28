package com.smartpos.parking.data.api

import com.smartpos.parking.BuildConfig
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

class ParkingApiClient(
    private val tokenStore: AuthTokenStore,
    private val onUnauthorized: () -> Unit
) {

    val authApi: AuthApi
    val mobileParkingApi: MobileParkingApi

    val wsOkHttpClient: OkHttpClient by lazy { buildWsClient() }

    init {
        val client = buildHttpClient()
        val retrofit = Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL)
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
        authApi = retrofit.create(AuthApi::class.java)
        mobileParkingApi = retrofit.create(MobileParkingApi::class.java)
    }

    private fun buildHttpClient(): OkHttpClient {
        val authInterceptor = Interceptor { chain ->
            val token = tokenStore.accessToken
            val request = if (!token.isNullOrBlank()) {
                chain.request().newBuilder()
                    .addHeader("Authorization", "Bearer $token")
                    .build()
            } else {
                chain.request()
            }
            val response = chain.proceed(request)
            if (response.code == 401 && tokenStore.hasToken()) {
                onUnauthorized()
            }
            response
        }

        val builder = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(60, TimeUnit.SECONDS)
            .addInterceptor(authInterceptor)

        if (BuildConfig.DEBUG) {
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }
            builder.addInterceptor(logging)
        }

        return builder.build()
    }

    private fun buildWsClient(): OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(0, TimeUnit.SECONDS)
        .pingInterval(30, TimeUnit.SECONDS)
        .build()
}

suspend inline fun <T> apiCall(block: () -> T): Result<T> {
    return try {
        Result.success(block())
    } catch (e: retrofit2.HttpException) {
        val code = e.code()
        val msg = ApiErrorParser.messageFrom(e)
        Result.failure(ApiException(msg, code))
    } catch (e: java.io.IOException) {
        Result.failure(ApiException("Sem conexão com o servidor. Verifique a rede.", null))
    } catch (e: Exception) {
        Result.failure(ApiException(ApiErrorParser.messageFrom(e), null))
    }
}
