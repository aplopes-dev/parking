package com.smartpos.parking.ui.screens.login

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import com.smartpos.parking.ui.components.GoldGradientButton
import com.smartpos.parking.ui.components.SnackbarMessage
import com.smartpos.parking.ui.theme.BackgroundDeep
import com.smartpos.parking.ui.theme.BackgroundElevated
import com.smartpos.parking.ui.theme.BorderSubtle
import com.smartpos.parking.ui.theme.GoldPrimary
import com.smartpos.parking.ui.theme.TextMuted
import com.smartpos.parking.ui.theme.TextPrimary
import com.smartpos.parking.ui.theme.TextSecondary

@Composable
fun LoginScreen(
    viewModel: LoginViewModel,
    onLoggedIn: () -> Unit
) {
    val state by viewModel.uiState.collectAsState()

    LaunchedEffect(state.loginSuccess) {
        if (state.loginSuccess) onLoggedIn()
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    listOf(BackgroundElevated, BackgroundDeep)
                )
            )
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            "SmartPos Parking",
            style = MaterialTheme.typography.headlineMedium,
            color = GoldPrimary
        )
        Text(
            "Valet · Estacionamento",
            style = MaterialTheme.typography.bodyMedium,
            color = TextSecondary
        )
        Spacer(Modifier.height(32.dp))

        LoginField(
            label = "Organização (slug)",
            value = state.tenantSlug,
            onValueChange = viewModel::setTenantSlug
        )
        Spacer(Modifier.height(12.dp))
        LoginField(
            label = "E-mail",
            value = state.email,
            onValueChange = viewModel::setEmail
        )
        Spacer(Modifier.height(12.dp))
        LoginField(
            label = "Senha",
            value = state.password,
            onValueChange = viewModel::setPassword,
            isPassword = true
        )
        Spacer(Modifier.height(24.dp))

        GoldGradientButton(
            text = if (state.loading) "Entrando…" else "Entrar",
            onClick = viewModel::login,
            enabled = !state.loading,
            modifier = Modifier.fillMaxWidth()
        )

        Text(
            "API: estacionamento.aplopes.com",
            style = MaterialTheme.typography.labelSmall,
            color = TextMuted,
            modifier = Modifier.padding(top = 16.dp)
        )

        state.error?.let { msg ->
            Spacer(Modifier.height(16.dp))
            SnackbarMessage(msg, isError = true)
        }
    }
}

@Composable
private fun LoginField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    isPassword: Boolean = false
) {
    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        label = { Text(label, color = TextSecondary) },
        modifier = Modifier.fillMaxWidth(),
        singleLine = true,
        visualTransformation = if (isPassword) {
            PasswordVisualTransformation()
        } else {
            androidx.compose.ui.text.input.VisualTransformation.None
        },
        colors = OutlinedTextFieldDefaults.colors(
            focusedTextColor = TextPrimary,
            unfocusedTextColor = TextPrimary,
            focusedBorderColor = GoldPrimary,
            unfocusedBorderColor = BorderSubtle,
            cursorColor = GoldPrimary
        )
    )
}
