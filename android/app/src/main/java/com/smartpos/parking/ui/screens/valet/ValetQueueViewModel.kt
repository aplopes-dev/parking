package com.smartpos.parking.ui.screens.valet

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.smartpos.parking.data.auth.AuthRepository
import com.smartpos.parking.data.api.ValetRealtimeClient
import com.smartpos.parking.data.repository.ParkingRepository
import com.smartpos.parking.domain.model.ParkingFacility
import com.smartpos.parking.domain.model.ValetQueueSummary
import com.smartpos.parking.domain.model.ValetQueueTab
import com.smartpos.parking.domain.model.ValetTicket
import com.smartpos.parking.domain.model.ValetTicketStatus
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ValetQueueUiState(
    val facilities: List<ParkingFacility> = emptyList(),
    val selectedFacilityId: String? = null,
    val queue: ValetQueueSummary = ValetQueueSummary(0, 0, 0, 0),
    val tickets: List<ValetTicket> = emptyList(),
    val selectedTab: ValetQueueTab = ValetQueueTab.INTAKE,
    val loading: Boolean = false,
    val message: String? = null,
    val error: String? = null
)

class ValetQueueViewModel(
    private val repository: ParkingRepository,
    private val authRepository: AuthRepository,
    private val valetRealtime: ValetRealtimeClient?
) : ViewModel() {

    private val _ui = MutableStateFlow(ValetQueueUiState())

    init {
        valetRealtime?.connect()
        viewModelScope.launch { repository.refreshFromServer() }
    }

    override fun onCleared() {
        valetRealtime?.disconnect()
        super.onCleared()
    }

    val uiState: StateFlow<ValetQueueUiState> = combine(
        repository.facilities,
        repository.selectedFacilityId,
        repository.queue,
        repository.tickets,
        _ui
    ) { facilities, facilityId, queue, tickets, local ->
        local.copy(
            facilities = facilities,
            selectedFacilityId = facilityId,
            queue = queue,
            tickets = tickets
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), ValetQueueUiState())

    fun selectTab(tab: ValetQueueTab) {
        _ui.update { it.copy(selectedTab = tab) }
    }

    fun selectFacility(facilityId: String) {
        viewModelScope.launch {
            _ui.update { it.copy(loading = true, error = null) }
            repository.selectFacility(facilityId)
                .onSuccess { _ui.update { it.copy(loading = false) } }
                .onFailure { e -> _ui.update { it.copy(loading = false, error = e.message) } }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            _ui.update { it.copy(loading = true, error = null) }
            repository.refreshFromServer()
                .onSuccess { _ui.update { it.copy(loading = false, message = "Fila atualizada") } }
                .onFailure { e -> _ui.update { it.copy(loading = false, error = e.message) } }
        }
    }

    fun filteredTickets(): List<ValetTicket> {
        val tab = _ui.value.selectedTab
        return uiState.value.tickets.filter { ticket ->
            when (tab) {
                ValetQueueTab.INTAKE -> ticket.status in listOf(
                    ValetTicketStatus.RECEIVED,
                    ValetTicketStatus.PARKING
                )
                ValetQueueTab.PARKED -> ticket.status == ValetTicketStatus.PARKED
                ValetQueueTab.DELIVERY -> ticket.status in listOf(
                    ValetTicketStatus.REQUESTED,
                    ValetTicketStatus.RETRIEVING,
                    ValetTicketStatus.READY
                )
            }
        }
    }

    fun clearMessage() {
        _ui.update { it.copy(message = null, error = null) }
    }

    fun logout() {
        authRepository.logout()
    }

    companion object {
        fun factory(
            repository: ParkingRepository,
            authRepository: AuthRepository,
            valetRealtime: ValetRealtimeClient?
        ) = object : ViewModelProvider.Factory {
            @Suppress("UNCHECKED_CAST")
            override fun <T : ViewModel> create(modelClass: Class<T>): T =
                ValetQueueViewModel(repository, authRepository, valetRealtime) as T
        }
    }
}
