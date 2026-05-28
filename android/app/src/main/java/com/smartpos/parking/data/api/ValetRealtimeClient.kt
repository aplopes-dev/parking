package com.smartpos.parking.data.api

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.smartpos.parking.data.api.dto.ValetQueueDto
import com.smartpos.parking.data.api.dto.ValetTicketDto
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import org.json.JSONObject
import java.net.URLEncoder
import java.util.concurrent.atomic.AtomicBoolean

data class ValetRealtimePayload(
    val queue: ValetQueueDto,
    val tickets: List<ValetTicketDto>,
    val facilityId: String?,
    val source: String? = null
)

/**
 * WebSocket `/mobile/ws?token=...` — eventos `parking.valet.snapshot` e `parking.valet.updated`.
 */
class ValetRealtimeClient(
    private val okHttp: OkHttpClient,
    private val apiBase: String,
    private val tokenProvider: () -> String?,
    private val scope: CoroutineScope,
    private val onUpdate: (ValetRealtimePayload) -> Unit
) {

    private val gson = Gson()
    private val ticketListType = object : TypeToken<List<ValetTicketDto>>() {}.type

    private var socket: WebSocket? = null
    private var retryMs = 1_000L
    private var reconnectJob: Job? = null
    private val shouldReconnect = AtomicBoolean(false)

    fun connect() {
        val token = tokenProvider() ?: return
        shouldReconnect.set(true)
        reconnectJob?.cancel()
        reconnectJob = null
        try {
            socket?.close(1000, null)
        } catch (_: Exception) {
            // ignore
        }
        socket = null
        val request = Request.Builder().url(buildWsUrl(token)).build()
        socket = okHttp.newWebSocket(request, socketListener)
        retryMs = 1_000L
    }

    fun disconnect() {
        shouldReconnect.set(false)
        reconnectJob?.cancel()
        reconnectJob = null
        try {
            socket?.close(1000, null)
        } catch (_: Exception) {
            // ignore
        }
        socket = null
    }

    private fun scheduleReconnect() {
        if (!shouldReconnect.get()) return
        reconnectJob?.cancel()
        reconnectJob = scope.launch {
            delay(retryMs)
            retryMs = minOf(retryMs * 2, MAX_RETRY_MS)
            connect()
        }
    }

    private fun buildWsUrl(token: String): String {
        val base = apiBase.trimEnd('/')
        val wsScheme = if (base.startsWith("https", ignoreCase = true)) "wss" else "ws"
        val hostPath = base
            .removePrefix("https://")
            .removePrefix("http://")
        val encoded = URLEncoder.encode(token, Charsets.UTF_8.name())
        return "$wsScheme://$hostPath/mobile/ws?token=$encoded"
    }

    private fun handleMessage(text: String) {
        val root = JSONObject(text)
        when (root.optString("event")) {
            "parking.valet.snapshot", "parking.valet.updated" -> {
                val data = root.optJSONObject("data") ?: return
                val queue = gson.fromJson(data.optJSONObject("queue")?.toString(), ValetQueueDto::class.java)
                    ?: return
                val arr = data.optJSONArray("tickets") ?: return
                val tickets: List<ValetTicketDto> = gson.fromJson(arr.toString(), ticketListType)
                onUpdate(
                    ValetRealtimePayload(
                        queue = queue,
                        tickets = tickets,
                        facilityId = data.optString("facilityId").takeIf { it.isNotBlank() },
                        source = data.optString("source").takeIf { it.isNotBlank() }
                    )
                )
            }
        }
    }

    private val socketListener = object : WebSocketListener() {
        override fun onOpen(webSocket: WebSocket, response: Response) {
            retryMs = 1_000L
        }

        override fun onMessage(webSocket: WebSocket, text: String) {
            try {
                handleMessage(text)
            } catch (_: Exception) {
                // payload inválido
            }
        }

        override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
            socket = null
            scheduleReconnect()
        }

        override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
            socket = null
            scheduleReconnect()
        }
    }

    companion object {
        private const val MAX_RETRY_MS = 30_000L
    }
}
