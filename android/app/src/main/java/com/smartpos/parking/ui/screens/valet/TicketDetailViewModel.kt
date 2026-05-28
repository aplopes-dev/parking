package com.smartpos.parking.ui.screens.valet

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.smartpos.parking.data.repository.ParkingRepository
import com.smartpos.parking.domain.model.ValetTicket
import com.smartpos.parking.domain.model.ValetTicketStatus
import com.smartpos.parking.domain.model.ValetUser
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class TicketDetailUiState(
    val ticket: ValetTicket? = null,
    val valets: List<ValetUser> = emptyList(),
    val spots: List<com.smartpos.parking.domain.model.ParkingSpot> = emptyList(),
    val selectedValetId: String = "",
    val parkedLocation: String = "",
    val selectedSpotId: String = "",
    val loading: Boolean = false,
    val message: String? = null,
    val error: String? = null
)

class TicketDetailViewModel(
    private val repository: ParkingRepository,
    private val ticketId: String
) : ViewModel() {

    private val _ui = MutableStateFlow(TicketDetailUiState())

    val uiState: StateFlow<TicketDetailUiState> = combine(
        repository.tickets,
        repository.valets,
        repository.spots,
        _ui
    ) { tickets, valets, spots, local ->
        val ticket = tickets.find { it.id == ticketId } ?: repository.getTicket(ticketId)
        local.copy(
            ticket = ticket,
            valets = valets,
            spots = spots,
            selectedValetId = local.selectedValetId.ifEmpty { ticket?.assignedValetId.orEmpty() },
            parkedLocation = local.parkedLocation.ifEmpty { ticket?.parkedLocation.orEmpty() }
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), TicketDetailUiState())

    fun setValetId(id: String) = _ui.update { it.copy(selectedValetId = id) }
    fun setParkedLocation(value: String) = _ui.update { it.copy(parkedLocation = value) }
    fun setSpotId(id: String) = _ui.update { it.copy(selectedSpotId = id) }

    fun startParking() = runAction {
        repository.startParking(ticketId, _ui.value.selectedValetId.takeIf { it.isNotBlank() })
    }

    fun completeParking() = runAction {
        repository.completeParking(
            ticketId,
            _ui.value.parkedLocation.takeIf { it.isNotBlank() },
            _ui.value.selectedSpotId.takeIf { it.isNotBlank() },
            _ui.value.selectedValetId.takeIf { it.isNotBlank() }
        )
    }

    fun requestRetrieval() = runAction { repository.requestRetrieval(ticketId) }

    fun startRetrieval() = runAction {
        repository.startRetrieval(ticketId, _ui.value.selectedValetId.takeIf { it.isNotBlank() })
    }

    fun markReady() = runAction { repository.markReady(ticketId) }

    fun cancelTicket() = runAction { repository.cancelTicket(ticketId) }

    fun clearMessage() = _ui.update { it.copy(message = null, error = null) }

    private fun runAction(block: suspend () -> Result<ValetTicket>) {
        viewModelScope.launch {
            _ui.update { it.copy(loading = true, error = null) }
            block()
                .onSuccess { ticket ->
                    _ui.update {
                        it.copy(loading = false, message = "Status: ${ticket.status.label}")
                    }
                }
                .onFailure { e ->
                    _ui.update { it.copy(loading = false, error = e.message) }
                }
        }
    }

    companion object {
        fun factory(repository: ParkingRepository, ticketId: String) =
            object : ViewModelProvider.Factory {
                @Suppress("UNCHECKED_CAST")
                override fun <T : ViewModel> create(modelClass: Class<T>): T =
                    TicketDetailViewModel(repository, ticketId) as T
            }
    }
}
