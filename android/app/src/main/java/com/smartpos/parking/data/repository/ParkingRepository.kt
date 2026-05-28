package com.smartpos.parking.data.repository

import com.smartpos.parking.data.api.ApiMappers.applyBootstrap
import com.smartpos.parking.data.api.ApiMappers.toApi
import com.smartpos.parking.data.api.ApiMappers.toDomain
import com.smartpos.parking.data.api.ParkingApiClient
import com.smartpos.parking.data.api.ValetRealtimePayload
import com.smartpos.parking.data.api.apiCall
import com.smartpos.parking.data.api.dto.AssignValetRequestDto
import com.smartpos.parking.data.api.dto.CreateValetTicketRequestDto
import com.smartpos.parking.data.api.dto.DeliverValetRequestDto
import com.smartpos.parking.data.api.dto.ParkVehicleRequestDto
import com.smartpos.parking.domain.model.ParkingFacility
import com.smartpos.parking.domain.model.ParkingSpot
import com.smartpos.parking.domain.model.ParkingTariff
import com.smartpos.parking.domain.model.PaymentMethod
import com.smartpos.parking.domain.model.ValetQueueSummary
import com.smartpos.parking.domain.model.ValetQuote
import com.smartpos.parking.domain.model.ValetTicket
import com.smartpos.parking.domain.model.ValetUser
import com.smartpos.parking.domain.model.VehicleType
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

interface ParkingRepository {
    val facilities: StateFlow<List<ParkingFacility>>
    val selectedFacilityId: StateFlow<String?>
    val queue: StateFlow<ValetQueueSummary>
    val tickets: StateFlow<List<ValetTicket>>
    val valets: StateFlow<List<ValetUser>>
    val spots: StateFlow<List<ParkingSpot>>
    val tariffs: StateFlow<List<ParkingTariff>>

    suspend fun loadBootstrap(facilityId: String? = null): Result<Unit>
    suspend fun refreshFromServer(): Result<Unit>
    suspend fun selectFacility(facilityId: String): Result<Unit>
    suspend fun receiveVehicle(
        plate: String,
        vehicleType: VehicleType,
        customerName: String?,
        customerPhone: String?,
        keyTag: String?,
        notes: String?
    ): Result<ValetTicket>
    suspend fun startParking(ticketId: String, valetId: String?): Result<ValetTicket>
    suspend fun completeParking(
        ticketId: String,
        parkedLocation: String?,
        parkedSpotId: String?,
        valetId: String?
    ): Result<ValetTicket>
    suspend fun requestRetrieval(ticketId: String): Result<ValetTicket>
    suspend fun startRetrieval(ticketId: String, valetId: String?): Result<ValetTicket>
    suspend fun markReady(ticketId: String): Result<ValetTicket>
    suspend fun deliver(
        ticketId: String,
        tariffId: String?,
        paymentMethod: PaymentMethod?,
        notes: String?
    ): Result<ValetTicket>
    suspend fun cancelTicket(ticketId: String): Result<ValetTicket>
    suspend fun quoteTicket(ticketId: String, tariffId: String? = null): Result<ValetQuote>
    fun getTicket(ticketId: String): ValetTicket?
    fun applyRealtime(payload: ValetRealtimePayload)
    fun clearLocalState()
}

class ApiParkingRepository(
    private val apiClient: ParkingApiClient
) : ParkingRepository {

    private val _facilities = MutableStateFlow<List<ParkingFacility>>(emptyList())
    override val facilities: StateFlow<List<ParkingFacility>> = _facilities.asStateFlow()

    private val _selectedFacilityId = MutableStateFlow<String?>(null)
    override val selectedFacilityId: StateFlow<String?> = _selectedFacilityId.asStateFlow()

    private val _queue = MutableStateFlow(ValetQueueSummary(0, 0, 0, 0))
    override val queue: StateFlow<ValetQueueSummary> = _queue.asStateFlow()

    private val _tickets = MutableStateFlow<List<ValetTicket>>(emptyList())
    override val tickets: StateFlow<List<ValetTicket>> = _tickets.asStateFlow()

    private val _valets = MutableStateFlow<List<ValetUser>>(emptyList())
    override val valets: StateFlow<List<ValetUser>> = _valets.asStateFlow()

    private val _spots = MutableStateFlow<List<ParkingSpot>>(emptyList())
    override val spots: StateFlow<List<ParkingSpot>> = _spots.asStateFlow()

    private val _tariffs = MutableStateFlow<List<ParkingTariff>>(emptyList())
    override val tariffs: StateFlow<List<ParkingTariff>> = _tariffs.asStateFlow()

    override fun clearLocalState() {
        _facilities.value = emptyList()
        _selectedFacilityId.value = null
        _queue.value = ValetQueueSummary(0, 0, 0, 0)
        _tickets.value = emptyList()
        _valets.value = emptyList()
        _spots.value = emptyList()
        _tariffs.value = emptyList()
    }

    override fun applyRealtime(payload: ValetRealtimePayload) {
        payload.facilityId?.let { fid ->
            if (_selectedFacilityId.value == null || _selectedFacilityId.value == fid) {
                _selectedFacilityId.value = fid
            }
        }
        _queue.value = payload.queue.toDomain()
        _tickets.value = payload.tickets.map { it.toDomain() }
    }

    override suspend fun loadBootstrap(facilityId: String?): Result<Unit> = apiCall {
        apiClient.mobileParkingApi.bootstrap(facilityId)
    }.map { dto ->
        applyBootstrap(
            dto,
            onFacilities = { list, selected ->
                _facilities.value = list
                _selectedFacilityId.value = selected
            },
            onQueue = { _queue.value = it },
            onTickets = { _tickets.value = it },
            onValets = { _valets.value = it },
            onSpots = { _spots.value = it },
            onTariffs = { _tariffs.value = it }
        )
    }

    override suspend fun refreshFromServer(): Result<Unit> =
        loadBootstrap(_selectedFacilityId.value)

    override suspend fun selectFacility(facilityId: String): Result<Unit> =
        loadBootstrap(facilityId)

    override suspend fun receiveVehicle(
        plate: String,
        vehicleType: VehicleType,
        customerName: String?,
        customerPhone: String?,
        keyTag: String?,
        notes: String?
    ): Result<ValetTicket> {
        val facilityId = _selectedFacilityId.value
            ?: return Result.failure(IllegalStateException("Nenhuma unidade selecionada"))
        return apiCall {
            apiClient.mobileParkingApi.receiveVehicle(
                CreateValetTicketRequestDto(
                    facilityId = facilityId,
                    plate = plate.uppercase(),
                    vehicleType = vehicleType.toApi(),
                    customerName = customerName?.trim()?.takeIf { it.isNotEmpty() },
                    customerPhone = customerPhone?.trim()?.takeIf { it.isNotEmpty() },
                    keyTag = keyTag?.trim()?.takeIf { it.isNotEmpty() },
                    notes = notes?.trim()?.takeIf { it.isNotEmpty() }
                )
            )
        }.map { applyTicket(it.toDomain()) }
    }

    override suspend fun startParking(ticketId: String, valetId: String?) = apiCall {
        apiClient.mobileParkingApi.startParking(
            ticketId,
            AssignValetRequestDto(valetId)
        )
    }.map { applyTicket(it.toDomain()) }

    override suspend fun completeParking(
        ticketId: String,
        parkedLocation: String?,
        parkedSpotId: String?,
        valetId: String?
    ) = apiCall {
        apiClient.mobileParkingApi.completeParking(
            ticketId,
            ParkVehicleRequestDto(
                parkedLocation = parkedLocation?.trim()?.takeIf { it.isNotEmpty() },
                parkedSpotId = parkedSpotId?.takeIf { it.isNotEmpty() },
                assignedValetId = valetId?.takeIf { it.isNotEmpty() }
            )
        )
    }.map { applyTicket(it.toDomain()) }

    override suspend fun requestRetrieval(ticketId: String) = apiCall {
        apiClient.mobileParkingApi.requestRetrieval(ticketId)
    }.map { applyTicket(it.toDomain()) }

    override suspend fun startRetrieval(ticketId: String, valetId: String?) = apiCall {
        apiClient.mobileParkingApi.startRetrieval(ticketId, AssignValetRequestDto(valetId))
    }.map { applyTicket(it.toDomain()) }

    override suspend fun markReady(ticketId: String) = apiCall {
        apiClient.mobileParkingApi.markReady(ticketId)
    }.map { applyTicket(it.toDomain()) }

    override suspend fun deliver(
        ticketId: String,
        tariffId: String?,
        paymentMethod: PaymentMethod?,
        notes: String?
    ) = apiCall {
        apiClient.mobileParkingApi.deliver(
            ticketId,
            DeliverValetRequestDto(
                tariffId = tariffId,
                paymentMethod = paymentMethod?.toApi(),
                notes = notes?.trim()?.takeIf { it.isNotEmpty() }
            )
        )
    }.map { applyTicket(it.toDomain()) }

    override suspend fun cancelTicket(ticketId: String) = apiCall {
        apiClient.mobileParkingApi.cancel(ticketId)
    }.map { applyTicket(it.toDomain()) }

    override suspend fun quoteTicket(ticketId: String, tariffId: String?) = apiCall {
        apiClient.mobileParkingApi.quoteTicket(ticketId, tariffId)
    }.map { dto ->
        ValetQuote(
            amount = dto.quote.amount,
            breakdown = dto.quote.breakdown,
            tariffId = dto.quote.tariffId,
            waived = dto.quote.waived == true || dto.quote.amount <= 0.0
        )
    }

    override fun getTicket(ticketId: String): ValetTicket? =
        _tickets.value.find { it.id == ticketId }

    private fun applyTicket(ticket: ValetTicket): ValetTicket {
        _tickets.update { list ->
            val exists = list.any { it.id == ticket.id }
            if (exists) list.map { if (it.id == ticket.id) ticket else it }
            else list + ticket
        }
        return ticket
    }
}
