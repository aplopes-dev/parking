package com.smartpos.parking.data.api

import com.smartpos.parking.data.api.dto.ParkingBootstrapDto
import com.smartpos.parking.data.api.dto.ParkingFacilityDto
import com.smartpos.parking.data.api.dto.ParkingSpotDto
import com.smartpos.parking.data.api.dto.ParkingTariffDto
import com.smartpos.parking.data.api.dto.UserDto
import com.smartpos.parking.data.api.dto.ValetQueueDto
import com.smartpos.parking.data.api.dto.ValetTicketDto
import com.smartpos.parking.data.api.dto.ValetUserDto
import com.smartpos.parking.domain.model.AuthUser
import com.smartpos.parking.domain.model.ParkingFacility
import com.smartpos.parking.domain.model.ParkingSpot
import com.smartpos.parking.domain.model.ParkingTariff
import com.smartpos.parking.domain.model.PaymentMethod
import com.smartpos.parking.domain.model.ValetQueueSummary
import com.smartpos.parking.domain.model.ValetTicket
import com.smartpos.parking.domain.model.ValetTicketStatus
import com.smartpos.parking.domain.model.ValetUser
import com.smartpos.parking.domain.model.VehicleType

object ApiMappers {

    fun UserDto.toAuthUser() = AuthUser(
        id = id,
        name = name,
        email = email,
        role = role,
        tenantId = tenantId,
        tenantName = tenant.name
    )

    fun ParkingFacilityDto.toDomain() = ParkingFacility(
        id = id,
        name = name,
        systemType = systemType
    )

    fun ValetQueueDto.toDomain() = ValetQueueSummary(
        intake = intake,
        parked = parked,
        delivery = delivery,
        totalActive = totalActive
    )

    fun ValetUserDto.toDomain() = ValetUser(
        id = id,
        name = name,
        email = email
    )

    fun ParkingSpotDto.toDomain() = ParkingSpot(
        id = id,
        code = code,
        floor = floor,
        zone = zone
    )

    fun ParkingTariffDto.toDomain() = ParkingTariff(
        id = id,
        name = name,
        billingType = billingType,
        hourlyRate = hourlyRate,
        dailyRate = dailyRate
    )

    fun ValetTicketDto.toDomain() = ValetTicket(
        id = id,
        facilityId = facilityId,
        sessionId = sessionId,
        ticketCode = ticketCode,
        plate = plate,
        vehicleType = VehicleType.fromApi(vehicleType),
        customerName = customerName,
        customerPhone = customerPhone,
        keyTag = keyTag,
        status = ValetTicketStatus.fromApi(status),
        assignedValetId = assignedValetId,
        assignedValetName = assignedValet?.name,
        parkedSpotId = parkedSpotId,
        parkedLocation = parkedLocation ?: parkedSpot?.code,
        notes = notes,
        receivedAt = receivedAt,
        parkedAt = parkedAt,
        requestedAt = requestedAt,
        readyAt = readyAt,
        deliveredAt = deliveredAt
    )

    fun PaymentMethod.toApi(): String = when (this) {
        PaymentMethod.CASH -> "cash"
        PaymentMethod.PIX -> "pix"
        PaymentMethod.CREDIT -> "credit"
        PaymentMethod.DEBIT -> "debit"
        PaymentMethod.PRE_AUTH -> "credit"
    }

    fun VehicleType.toApi(): String = when (this) {
        VehicleType.CAR -> "car"
        VehicleType.MOTORCYCLE -> "motorcycle"
        VehicleType.SUV -> "suv"
        VehicleType.TRUCK -> "truck"
    }

    fun applyBootstrap(
        dto: ParkingBootstrapDto,
        onFacilities: (List<ParkingFacility>, String?) -> Unit,
        onQueue: (ValetQueueSummary) -> Unit,
        onTickets: (List<ValetTicket>) -> Unit,
        onValets: (List<ValetUser>) -> Unit,
        onSpots: (List<ParkingSpot>) -> Unit,
        onTariffs: (List<ParkingTariff>) -> Unit
    ) {
        onFacilities(dto.facilities.map { it.toDomain() }, dto.selectedFacilityId)
        onQueue(dto.queue.toDomain())
        onTickets(dto.tickets.map { it.toDomain() })
        onValets(dto.valets.map { it.toDomain() })
        onSpots(dto.spots.map { it.toDomain() })
        onTariffs(dto.tariffs.map { it.toDomain() })
    }
}
