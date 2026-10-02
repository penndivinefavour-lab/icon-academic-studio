package com.iconstudios.academiccompanion.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

// Web font stack: Poppins → Inter → system-ui. Android falls back to the
// device sans family, which keeps the hierarchy without bundling fonts.
private val Typography = Typography(
    headlineMedium = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 24.sp, lineHeight = 30.sp),
    headlineSmall = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 19.sp, lineHeight = 25.sp),
    titleLarge = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 17.sp, lineHeight = 23.sp),
    titleMedium = TextStyle(fontWeight = FontWeight.Medium, fontSize = 15.sp, lineHeight = 21.sp),
    bodyLarge = TextStyle(fontWeight = FontWeight.Normal, fontSize = 15.sp, lineHeight = 22.sp),
    bodyMedium = TextStyle(fontWeight = FontWeight.Normal, fontSize = 13.sp, lineHeight = 19.sp),
    bodySmall = TextStyle(fontWeight = FontWeight.Normal, fontSize = 12.sp, lineHeight = 17.sp),
    labelLarge = TextStyle(fontWeight = FontWeight.Medium, fontSize = 13.sp, lineHeight = 18.sp),
    labelSmall = TextStyle(fontWeight = FontWeight.Medium, fontSize = 11.sp, lineHeight = 15.sp),
)

private val LightColors = lightColorScheme(
    primary = Primary600,
    onPrimary = IconWhite,
    primaryContainer = Primary100,
    onPrimaryContainer = Primary900,
    secondary = IconNavy,
    onSecondary = IconWhite,
    secondaryContainer = Surface100,
    onSecondaryContainer = IconNavy,
    background = Surface50,
    onBackground = IconCharcoal,
    surface = IconWhite,
    onSurface = IconCharcoal,
    surfaceVariant = Surface100,
    onSurfaceVariant = Surface700,
    outline = Surface300,
    error = IconError,
    onError = IconWhite,
)

private val DarkColors = darkColorScheme(
    primary = Primary400,
    onPrimary = IconWhite,
    primaryContainer = Primary800,
    onPrimaryContainer = Primary50,
    secondary = IconGold,
    onSecondary = IconCharcoal,
    background = IconCharcoal,
    onBackground = IconWhite,
    surface = Surface900,
    onSurface = IconWhite,
    surfaceVariant = Surface800,
    onSurfaceVariant = Surface200,
    outline = Surface700,
    error = IconError,
    onError = IconWhite,
)

@Composable
fun IconAcademicTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = Typography,
        content = content,
    )
}
