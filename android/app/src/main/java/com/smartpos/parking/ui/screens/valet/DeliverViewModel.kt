package com.smartpos.parking.ui.screens.valet

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.smartpos.parking.data.payment.PaymentGateway
import com.smartpos.parking.data.payment.PaymentGatewayResult
import com.smartpos.parking.data.payment.PaymentRequest
import com.smartpos.parking.data.repository.ParkingRepository
import com.smartpos.parking.domain.model.PaymentMethod
import com.smartpos.parking.domain.model.ValetQuote
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class DeliverUiState(
    val plate: String = "",
    val ticketCode: String = "",
    val quote: ValetQuote? = null,
    val selectedMethod: PaymentMethod = PaymentMethod.PIX,
    val loading: Boolean = false,
    val paying: Boolean = false,
    val success: Boolean = false,
    val error: String? = null,
    val message: String? = null
)

class DeliverViewModel(
    private val repository: ParkingRepository,
    private val paymentGateway: PaymentGateway,
    private val ticketId: String
) : ViewModel() {

    private val _ui = MutableStateFlow(DeliverUiState())
    val uiState: StateFlow<DeliverUiState> = _ui.asStateFlow()

    init {
        viewModelScope.launch { loadQuote() }
    }

    private suspend fun loadQuote() {
        val ticket = repository.getTicket(ticketId)
        _ui.update {
            it.copy(
                plate = ticket?.plate.orEmpty(),
                ticketCode = ticket?.ticketCode.orEmpty()
            )
        }
        repository.quoteTicket(ticketId)
            .onSuccess { quote -> _ui.update { it.copy(quote = quote) } }
            .onFailure { e -> _ui.update { it.copy(error = e.message) } }
    }

    fun selectMethod(method: PaymentMethod) = _ui.update { it.copy(selectedMethod = method) }

    fun payAndDeliver() {
        viewModelScope.launch {
            val quote = _ui.value.quote
            val amount = quote?.amount ?: 0.0
            val method = _ui.value.selectedMethod
            _ui.update { it.copy(paying = true, error = null) }

            if (amount > 0 && method != PaymentMethod.CASH) {
                val result = paymentGateway.processPayment(
                    PaymentRequest(
                        tableId = ticketId,
                        tableNumber = 0,
                        method = method,
                        amountReais = amount,
                        isPartial = false
                    )
                )
                when (result) {
                    is PaymentGatewayResult.Failure ->
                        return@launch _ui.update {
                            it.copy(paying = false, error = result.message)
                        }
                    is PaymentGatewayResult.Cancelled ->
                        return@launch _ui.update {
                            it.copy(paying = false, error = "Pagamento cancelado")
                        }
                    else -> Unit
                }
            }

            repository.deliver(
                ticketId = ticketId,
                tariffId = quote?.tariffId,
                paymentMethod = if (amount > 0) method else null,
                notes = null
            ).onSuccess {
                _ui.update { it.copy(paying = false, success = true, message = "Veículo entregue") }
            }.onFailure { e ->
                _ui.update { it.copy(paying = false, error = e.message) }
            }
        }
    }

    companion object {
        fun factory(
            repository: ParkingRepository,
            paymentGateway: PaymentGateway,
            ticketId: String
        ) = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T =
                DeliverViewModel(repository, paymentGateway, ticketId) as T
        }
    }
}
