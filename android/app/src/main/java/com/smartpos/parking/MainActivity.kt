package com.smartpos.parking

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.smartpos.parking.ui.navigation.SmartPosNavHost
import com.smartpos.parking.ui.theme.BackgroundDeep
import com.smartpos.parking.ui.theme.SmartPosParkingTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val app = application as SmartPosApp
        setContent {
            SmartPosParkingTheme {
                Surface(
                    modifier = Modifier
                        .fillMaxSize()
                        .windowInsetsPadding(WindowInsets.safeDrawing),
                    color = BackgroundDeep
                ) {
                    // Não acessar paymentGateway/plugPag aqui — evita ANR no emulador
                    SmartPosNavHost(app = app)
                }
            }
        }
    }
}
