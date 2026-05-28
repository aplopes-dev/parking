package com.smartpos.parking.ui.screens.valet

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.FilterChip
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.smartpos.parking.domain.model.PaymentMethod
import com.smartpos.parking.ui.components.GoldGradientButton
import com.smartpos.parking.ui.components.PremiumTopBar
import com.smartpos.parking.ui.components.SnackbarMessage
import com.smartpos.parking.ui.components.formatMoney
import com.smartpos.parking.ui.theme.BackgroundDeep
import com.smartpos.parking.ui.theme.GoldPrimary
import com.smartpos.parking.ui.theme.TextPrimary
import com.smartpos.parking.ui.theme.TextSecondary

@Composable
fun DeliverScreen(
    viewModel: DeliverViewModel,
    onBack: () -> Unit,
    onFinished: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(state.success) {
        if (state.success) onFinished()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(BackgroundDeep)
    ) {
        PremiumTopBar(
            title = "Entrega · ${state.plate}",
            subtitle = state.ticketCode,
            onBack = onBack
        )

        SnackbarMessage(state.message)
        SnackbarMessage(state.error, isError = true)

        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            val quote = state.quote
            Text(
                if (quote?.waived == true) "Isento" else formatMoney(quote?.amount ?: 0.0),
                style = MaterialTheme.typography.displaySmall,
                color = GoldPrimary
            )
            quote?.breakdown?.let { Text(it, color = TextSecondary) }

            if (quote?.waived != true && (quote?.amount ?: 0.0) > 0) {
                Text("Forma de pagamento", color = TextPrimary)
                PaymentMethod.entries.forEach { method ->
                    FilterChip(
                        selected = state.selectedMethod == method,
                        onClick = { viewModel.selectMethod(method) },
                        label = { Text(method.label) }
                    )
                }
            }

            Spacer(Modifier.height(16.dp))
            GoldGradientButton(
                text = if (state.paying) "Processando…" else "Confirmar entrega",
                onClick = viewModel::payAndDeliver,
                loading = state.paying,
                modifier = Modifier.fillMaxWidth()
            )
        }
    }
}
