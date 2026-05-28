package com.smartpos.parking.domain.model

enum class ValetTicketStatus(val label: String) {
    RECEIVED("Recebido"),
    PARKING("Manobrando"),
    PARKED("Estacionado"),
    REQUESTED("Solicitado"),
    RETRIEVING("Buscando"),
    READY("Pronto"),
    DELIVERED("Entregue"),
    CANCELED("Cancelado");

    companion object {
        fun fromApi(value: String): ValetTicketStatus =
            entries.find { it.name.equals(value, ignoreCase = true) } ?: RECEIVED
    }
}

enum class VehicleType(val label: String) {
    CAR("Carro"),
    MOTORCYCLE("Moto"),
    SUV("SUV"),
    TRUCK("Caminhão");

    companion object {
        fun fromApi(value: String): VehicleType =
            entries.find { it.name.equals(value, ignoreCase = true) }
                ?: entries.find { it.name.lowercase() == value.lowercase() }
                ?: CAR
    }
}

enum class PaymentMethod(val label: String) {
    CASH("Dinheiro"),
    PIX("PIX"),
    CREDIT("Crédito"),
    DEBIT("Débito"),
    PRE_AUTH("Pré-autorização")
}

enum class ValetQueueTab(val apiQueue: String?, val label: String) {
    INTAKE("intake", "Recebimento"),
    PARKED("parked", "Estacionados"),
    DELIVERY("delivery", "Entrega")
}

data class AuthUser(
    val id: String,
    val name: String,
    val email: String,
    val role: String,
    val tenantId: String,
    val tenantName: String
)

data class ParkingFacility(
    val id: String,
    val name: String,
    val systemType: String
)

data class ValetUser(
    val id: String,
    val name: String,
    val email: String?
)

data class ParkingSpot(
    val id: String,
    val code: String,
    val floor: String?,
    val zone: String?
)

data class ParkingTariff(
    val id: String,
    val name: String,
    val billingType: String,
    val hourlyRate: Double?,
    val dailyRate: Double?
)

data class ValetQueueSummary(
    val intake: Int,
    val parked: Int,
    val delivery: Int,
    val totalActive: Int
)

data class ValetTicket(
    val id: String,
    val facilityId: String,
    val sessionId: String?,
    val ticketCode: String,
    val plate: String,
    val vehicleType: VehicleType,
    val customerName: String?,
    val customerPhone: String?,
    val keyTag: String?,
    val status: ValetTicketStatus,
    val assignedValetId: String?,
    val assignedValetName: String?,
    val parkedSpotId: String?,
    val parkedLocation: String?,
    val notes: String?,
    val receivedAt: String,
    val parkedAt: String?,
    val requestedAt: String?,
    val readyAt: String?,
    val deliveredAt: String?
)

data class ValetQuote(
    val amount: Double,
    val breakdown: String?,
    val tariffId: String?,
    val waived: Boolean
)

data class PagBankTransactionMeta(
    val transactionCode: String? = null,
    val transactionId: String? = null,
    val processedOnTerminal: Boolean = true
)

data class ReceiptDocument(
    val id: String = java.util.UUID.randomUUID().toString(),
    val title: String = "SMARTPOS PARKING",
    val subtitle: String? = "Comprovante valet",
    val lines: List<String> = emptyList(),
    val totalLabel: String? = "TOTAL",
    val totalAmount: Double? = null,
    val issuedAt: Long = System.currentTimeMillis()
)
