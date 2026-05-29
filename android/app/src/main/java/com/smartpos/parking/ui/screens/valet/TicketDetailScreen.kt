package com.smartpos.parking.ui.screens.valet

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.smartpos.parking.domain.model.ValetTicketStatus
import com.smartpos.parking.ui.components.GoldGradientButton
import com.smartpos.parking.ui.components.PremiumTopBar
import com.smartpos.parking.ui.components.SnackbarMessage
import com.smartpos.parking.ui.components.StatusBadge
import com.smartpos.parking.ui.theme.BackgroundDeep
import com.smartpos.parking.ui.theme.GoldPrimary
import com.smartpos.parking.ui.theme.StatusOpen
import com.smartpos.parking.ui.theme.TextPrimary
import com.smartpos.parking.ui.theme.TextSecondary

@Composable
fun TicketDetailScreen(
    viewModel: TicketDetailViewModel,
    onBack: () -> Unit,
    onDeliver: (String) -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    val ticket = state.ticket

    LaunchedEffect(state.message, state.error) {
        if (state.message != null || state.error != null) {
            kotlinx.coroutines.delay(3000)
            viewModel.clearMessage()
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDeep)
    ) {
        PremiumTopBar(
            title = ticket?.plate ?: "Ticket",
            subtitle = ticket?.ticketCode,
            onBack = onBack
        )

        SnackbarMessage(state.message)
        SnackbarMessage(state.error, isError = true)

        if (ticket == null) {
            Text("Ticket não encontrado", modifier = Modifier.padding(24.dp), color = TextSecondary)
            return
        }

        Column(
            modifier = Modifier
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatusBadge(ticket.status.label, StatusOpen)
                ticket.keyTag?.let { Text("Chave $it", color = TextSecondary) }
            }
            ticket.customerName?.let { Text(it, style = MaterialTheme.typography.titleLarge, color = TextPrimary) }
            ticket.customerPhone?.let { Text(it, color = TextSecondary) }
            ticket.parkedLocation?.let { Text("Local: $it", color = TextPrimary) }
            ticket.assignedValetName?.let { Text("Manobrista: $it", color = TextSecondary) }

            if (ticket.status in listOf(
                    ValetTicketStatus.RECEIVED,
                    ValetTicketStatus.PARKING,
                    ValetTicketStatus.REQUESTED,
                    ValetTicketStatus.RETRIEVING
                )
            ) {
                ValetSelector(state.valets, state.selectedValetId, viewModel::setValetId)
            }

            when (ticket.status) {
                ValetTicketStatus.RECEIVED -> {
                    GoldGradientButton("Iniciar manobra", viewModel::startParking, loading = state.loading)
                    AvailableSpotPicker(
                        spots = state.spots,
                        loading = state.loading,
                        onParkInSpot = { viewModel.parkInSpot(it.id, it.code) }
                    )
                    OutlinedTextField(
                        value = state.parkedLocation,
                        onValueChange = viewModel::setParkedLocation,
                        label = { Text("Local estacionado (manual)") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = fieldColors()
                    )
                    GoldGradientButton("Marcar estacionado", viewModel::completeParking, loading = state.loading)
                }
                ValetTicketStatus.PARKING -> {
                    AvailableSpotPicker(
                        spots = state.spots,
                        loading = state.loading,
                        onParkInSpot = { viewModel.parkInSpot(it.id, it.code) }
                    )
                    OutlinedTextField(
                        value = state.parkedLocation,
                        onValueChange = viewModel::setParkedLocation,
                        label = { Text("Local estacionado (manual)") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = fieldColors()
                    )
                    GoldGradientButton("Marcar estacionado", viewModel::completeParking, loading = state.loading)
                }
                ValetTicketStatus.PARKED -> {
                    GoldGradientButton("Cliente solicitou veículo", viewModel::requestRetrieval, loading = state.loading)
                }
                ValetTicketStatus.REQUESTED -> {
                    GoldGradientButton("Iniciar busca", viewModel::startRetrieval, loading = state.loading)
                }
                ValetTicketStatus.RETRIEVING -> {
                    GoldGradientButton("Veículo na portaria", viewModel::markReady, loading = state.loading)
                }
                ValetTicketStatus.READY -> {
                    GoldGradientButton(
                        text = "Cobrar e entregar",
                        onClick = { onDeliver(ticket.id) },
                        enabled = !state.loading
                    )
                }
                else -> Unit
            }

            if (ticket.status !in listOf(ValetTicketStatus.DELIVERED, ValetTicketStatus.CANCELED)) {
                Spacer(Modifier.height(8.dp))
                GoldGradientButton("Cancelar ticket", viewModel::cancelTicket, loading = state.loading)
            }
        }
    }
}

@Composable
private fun AvailableSpotPicker(
    spots: List<com.smartpos.parking.domain.model.ParkingSpot>,
    loading: Boolean,
    onParkInSpot: (com.smartpos.parking.domain.model.ParkingSpot) -> Unit
) {
    val available = spots.filter { it.isAvailable }
    if (available.isEmpty()) return

    Text("Vagas disponíveis — toque para estacionar", color = TextSecondary)
    available.forEach { spot ->
        GoldGradientButton(
            text = spot.code,
            onClick = { onParkInSpot(spot) },
            loading = loading,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun ValetSelector(
    valets: List<com.smartpos.parking.domain.model.ValetUser>,
    selectedId: String,
    onSelect: (String) -> Unit
) {
    Text("Manobrista", color = TextSecondary)
    valets.forEach { valet ->
        GoldGradientButton(
            text = valet.name,
            onClick = { onSelect(valet.id) },
            enabled = selectedId != valet.id,
            modifier = Modifier.fillMaxWidth()
        )
    }
}

@Composable
private fun fieldColors() = OutlinedTextFieldDefaults.colors(
    focusedBorderColor = GoldPrimary,
    focusedLabelColor = GoldPrimary,
    cursorColor = GoldPrimary,
    focusedTextColor = TextPrimary,
    unfocusedTextColor = TextPrimary
)
