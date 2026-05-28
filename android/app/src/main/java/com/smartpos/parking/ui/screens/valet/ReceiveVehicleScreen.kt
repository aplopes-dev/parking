package com.smartpos.parking.ui.screens.valet

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.FilterChip
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
import com.smartpos.parking.domain.model.VehicleType
import com.smartpos.parking.ui.components.GoldGradientButton
import com.smartpos.parking.ui.components.PremiumTopBar
import com.smartpos.parking.ui.components.SnackbarMessage
import com.smartpos.parking.ui.theme.BackgroundDeep
import com.smartpos.parking.ui.theme.GoldPrimary
import com.smartpos.parking.ui.theme.TextPrimary
import com.smartpos.parking.ui.theme.TextSecondary

@Composable
fun ReceiveVehicleScreen(
    viewModel: ReceiveVehicleViewModel,
    onBack: () -> Unit,
    onSuccess: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(state.success) {
        if (state.success) onSuccess()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDeep)
    ) {
        PremiumTopBar(title = "Receber veículo", subtitle = "Novo ticket valet", onBack = onBack)
        SnackbarMessage(state.error, isError = true)

        Column(
            modifier = Modifier
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            OutlinedTextField(
                value = state.plate,
                onValueChange = viewModel::setPlate,
                label = { Text("Placa") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                colors = fieldColors()
            )

            Text("Tipo de veículo", color = TextSecondary)
            RowChips(state.vehicleType, viewModel::setVehicleType)

            OutlinedTextField(
                value = state.customerName,
                onValueChange = viewModel::setCustomerName,
                label = { Text("Nome do cliente") },
                modifier = Modifier.fillMaxWidth(),
                colors = fieldColors()
            )
            OutlinedTextField(
                value = state.customerPhone,
                onValueChange = viewModel::setCustomerPhone,
                label = { Text("Telefone") },
                modifier = Modifier.fillMaxWidth(),
                colors = fieldColors()
            )
            OutlinedTextField(
                value = state.keyTag,
                onValueChange = viewModel::setKeyTag,
                label = { Text("Etiqueta de chave") },
                modifier = Modifier.fillMaxWidth(),
                colors = fieldColors()
            )
            OutlinedTextField(
                value = state.notes,
                onValueChange = viewModel::setNotes,
                label = { Text("Observações") },
                modifier = Modifier.fillMaxWidth(),
                colors = fieldColors()
            )

            Spacer(Modifier.height(8.dp))
            GoldGradientButton(
                text = if (state.loading) "Salvando…" else "Receber veículo",
                onClick = viewModel::submit,
                loading = state.loading,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}

@Composable
private fun RowChips(selected: VehicleType, onSelect: (VehicleType) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        VehicleType.entries.forEach { type ->
            FilterChip(
                selected = selected == type,
                onClick = { onSelect(type) },
                label = { Text(type.label) }
            )
        }
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
