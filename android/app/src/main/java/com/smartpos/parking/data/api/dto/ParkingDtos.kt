package com.smartpos.parking.data.api.dto

import com.google.gson.annotations.SerializedName

data class LoginRequestDto(
    val tenantSlug: String,
    val email: String,
    val password: String
)

data class LoginResponseDto(
    @SerializedName("access_token") val accessToken: String,
    val user: UserDto
)

data class UserDto(
    val id: String,
    val email: String,
    val name: String,
    val role: String,
    val tenantId: String,
    val tenant: TenantDto
)

data class TenantDto(
    val id: String,
    val name: String,
    val slug: String
)

data class ParkingBootstrapDto(
    val facilities: List<ParkingFacilityDto>,
    val selectedFacilityId: String?,
    val queue: ValetQueueDto,
    val tickets: List<ValetTicketDto>,
    val valets: List<ValetUserDto>,
    val spots: List<ParkingSpotDto>,
    val tariffs: List<ParkingTariffDto>
)

data class ParkingFacilityDto(
    val id: String,
    val name: String,
    val systemType: String,
    val segment: String?,
    val active: Boolean = true
)

data class ValetQueueDto(
    val facilityId: String?,
    val intake: Int,
    val parked: Int,
    val delivery: Int,
    val totalActive: Int
)

data class ValetUserDto(
    val id: String,
    val name: String,
    val email: String?,
    val role: String?
)

data class ParkingSpotDto(
    val id: String,
    val code: String,
    val floor: String?,
    val zone: String?
)

data class ParkingTariffDto(
    val id: String,
    val name: String,
    val billingType: String,
    val hourlyRate: Double?,
    val dailyRate: Double?,
    val active: Boolean = true
)

data class ValetTicketDto(
    val id: String,
    val facilityId: String,
    val sessionId: String?,
    val ticketCode: String,
    val plate: String,
    val vehicleType: String,
    val customerName: String?,
    val customerPhone: String?,
    val keyTag: String?,
    val status: String,
    val assignedValetId: String?,
    val parkedSpotId: String?,
    val parkedLocation: String?,
    val notes: String?,
    val receivedAt: String,
    val parkedAt: String?,
    val requestedAt: String?,
    val readyAt: String?,
    val deliveredAt: String?,
    val assignedValet: ValetUserDto?,
    val parkedSpot: ParkingSpotDto?,
    val facility: ParkingFacilityDto?
)

data class CreateValetTicketRequestDto(
    val facilityId: String,
    val plate: String,
    val vehicleType: String? = "car",
    val customerName: String? = null,
    val customerPhone: String? = null,
    val keyTag: String? = null,
    val notes: String? = null
)

data class AssignValetRequestDto(
    val assignedValetId: String? = null
)

data class ParkVehicleRequestDto(
    val parkedSpotId: String? = null,
    val parkedLocation: String? = null,
    val assignedValetId: String? = null
)

data class DeliverValetRequestDto(
    val tariffId: String? = null,
    val paymentMethod: String? = null,
    val accountId: String? = null,
    val notes: String? = null
)

data class ValetQuoteDto(
    val session: ValetSessionQuoteDto?,
    val quote: QuoteAmountDto
)

data class ValetSessionQuoteDto(
    val id: String,
    val plate: String,
    val ticketCode: String?
)

data class QuoteAmountDto(
    val amount: Double,
    val breakdown: String?,
    val tariffId: String?,
    val waived: Boolean? = null
)

data class ApiErrorDto(
    val message: String?,
    val statusCode: Int?
)
