package com.smartpos.parking.ui.theme

import android.app.Activity
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val SmartPosColorScheme = darkColorScheme(
    primary = GoldPrimary,
    onPrimary = BackgroundDeep,
    primaryContainer = GoldMuted,
    onPrimaryContainer = GoldLight,
    secondary = AccentEmerald,
    onSecondary = BackgroundDeep,
    tertiary = AccentAmber,
    background = BackgroundDeep,
    onBackground = TextPrimary,
    surface = BackgroundElevated,
    onSurface = TextPrimary,
    surfaceVariant = SurfaceCard,
    onSurfaceVariant = TextSecondary,
    outline = BorderSubtle,
    error = AccentCoral
)

@Composable
fun SmartPosParkingTheme(content: @Composable () -> Unit) {
    val colorScheme = SmartPosColorScheme
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            window.statusBarColor = BackgroundDeep.toArgb()
            window.navigationBarColor = BackgroundDeep.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = false
        }
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = SmartPosTypography,
        content = content
    )
}
