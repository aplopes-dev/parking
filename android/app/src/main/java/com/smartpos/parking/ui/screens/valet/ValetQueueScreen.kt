package com.smartpos.parking.ui.screens.valet

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.smartpos.parking.domain.model.ValetQueueTab
import com.smartpos.parking.domain.model.ValetTicket
import com.smartpos.parking.ui.components.PremiumCard
import com.smartpos.parking.ui.components.SectionHeader
import com.smartpos.parking.ui.components.SnackbarMessage
import com.smartpos.parking.ui.components.StatusBadge
import com.smartpos.parking.ui.theme.AccentEmerald
import com.smartpos.parking.ui.theme.AccentAmber
import com.smartpos.parking.ui.theme.BackgroundDeep
import com.smartpos.parking.ui.theme.BackgroundElevated
import com.smartpos.parking.ui.theme.GoldPrimary
import com.smartpos.parking.ui.theme.StatusOpen
import com.smartpos.parking.ui.theme.TextPrimary
import com.smartpos.parking.ui.theme.TextSecondary

@Composable
fun ValetQueueScreen(
    viewModel: ValetQueueViewModel,
    onTicketClick: (String) -> Unit,
    onReceiveVehicle: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()
    val filtered = viewModel.filteredTickets()

    LaunchedEffect(state.message, state.error) {
        if (state.message != null || state.error != null) {
            kotlinx.coroutines.delay(3500)
            viewModel.clearMessage()
        }
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Brush.verticalGradient(listOf(BackgroundElevated, BackgroundDeep)))
                .padding(24.dp)
        ) {
            Column {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Default.DirectionsCar, null, tint = GoldPrimary, modifier = Modifier.size(32.dp))
                    Column(Modifier.padding(start = 12.dp).weight(1f)) {
                        Text("SmartPos Valet", style = MaterialTheme.typography.displayMedium, color = GoldPrimary)
                        Text("Operação em tempo real", style = MaterialTheme.typography.bodyMedium, color = TextSecondary)
                    }
                    IconButton(onClick = viewModel::refresh, enabled = !state.loading) {
                        Icon(Icons.Default.Refresh, "Atualizar", tint = GoldPrimary)
                    }
                    TextButton(onClick = viewModel::logout) {
                        Icon(Icons.Default.Logout, "Sair", tint = TextSecondary)
                    }
                }
                Spacer(Modifier.height(16.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    StatChip("${state.queue.intake} recebimento", AccentAmber)
                    StatChip("${state.queue.parked} estacionados", StatusOpen)
                    StatChip("${state.queue.delivery} entrega", AccentEmerald)
                }
                if (state.facilities.isNotEmpty()) {
                    Spacer(Modifier.height(12.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        state.facilities.forEach { facility ->
                            FilterChip(
                                selected = state.selectedFacilityId == facility.id,
                                onClick = { viewModel.selectFacility(facility.id) },
                                label = { Text(facility.name) },
                                colors = FilterChipDefaults.filterChipColors(
                                    selectedContainerColor = GoldPrimary.copy(alpha = 0.2f),
                                    selectedLabelColor = GoldPrimary
                                )
                            )
                        }
                    }
                }
            }
        }

        SnackbarMessage(state.message)
        SnackbarMessage(state.error, isError = true)

        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            ValetQueueTab.entries.forEach { tab ->
                FilterChip(
                    selected = state.selectedTab == tab,
                    onClick = { viewModel.selectTab(tab) },
                    label = { Text(tab.label) },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = GoldPrimary.copy(alpha = 0.2f),
                        selectedLabelColor = GoldPrimary
                    )
                )
            }
        }

        SectionHeader(state.selectedTab.label, "${filtered.size} veículos")

        LazyColumn(
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.weight(1f)
        ) {
            items(filtered, key = { it.id }) { ticket ->
                TicketCard(ticket = ticket, onClick = { onTicketClick(ticket.id) })
            }
        }

        TextButton(
            onClick = onReceiveVehicle,
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp)
        ) {
            Icon(Icons.Default.Add, null, tint = GoldPrimary)
            Text(" Receber veículo", color = GoldPrimary, style = MaterialTheme.typography.titleMedium)
        }
    }
}

@Composable
private fun StatChip(text: String, color: androidx.compose.ui.graphics.Color) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(color.copy(alpha = 0.12f))
            .padding(horizontal = 12.dp, vertical = 6.dp)
    ) {
        Text(text, color = color, style = MaterialTheme.typography.labelMedium)
    }
}

@Composable
private fun TicketCard(ticket: ValetTicket, onClick: () -> Unit) {
    PremiumCard(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    ticket.plate,
                    style = MaterialTheme.typography.headlineMedium,
                    color = GoldPrimary,
                    fontWeight = FontWeight.Bold
                )
                StatusBadge(ticket.status.label, StatusOpen)
            }
            Text(ticket.ticketCode, color = TextSecondary, style = MaterialTheme.typography.bodyMedium)
            ticket.customerName?.let {
                Text(it, color = TextPrimary, style = MaterialTheme.typography.bodyLarge)
            }
            ticket.parkedLocation?.let {
                Text("Local: $it", color = TextSecondary, style = MaterialTheme.typography.bodySmall)
            }
            ticket.assignedValetName?.let {
                Text("Manobrista: $it", color = TextSecondary, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}
