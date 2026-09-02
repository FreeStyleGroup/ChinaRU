package com.chinaru.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColorScheme = lightColorScheme(
    primary = PrimaryRed,
    onPrimary = SurfaceWhite,
    secondary = DarkRed,
    background = BackgroundGray,
    surface = SurfaceWhite,
    onSurface = TextMain
)

@Composable
fun ChinaRuTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        content = content
    )
}