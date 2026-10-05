package com.iconstudios.academiccompanion.ui.settings

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.iconstudios.academiccompanion.AppContainer
import com.iconstudios.academiccompanion.data.repository.ConnectionState
import com.iconstudios.academiccompanion.ui.theme.IconGold
import com.iconstudios.academiccompanion.ui.theme.IconNavy

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(viewModel: SettingsViewModel) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings", fontWeight = FontWeight.SemiBold, color = IconNavy) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { inner ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(inner)
                .padding(16.dp),
        ) {
            Text("Studio API connection", style = MaterialTheme.typography.titleSmall, color = IconNavy, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = state.baseUrl,
                onValueChange = viewModel::onBaseUrlChange,
                label = { Text("Base URL") },
                supportingText = {
                    if (state.isCleartext) {
                        Text(
                            "Connecting over plain HTTP is only safe on a trusted local network.",
                            color = MaterialTheme.colorScheme.error,
                        )
                    } else {
                        Text("e.g. http://192.168.1.20:4001 or https://your-server.com")
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                isError = !state.isValid,
            )
            if (!state.isValid && state.baseUrl.isNotEmpty()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "Enter a valid http:// or https:// URL",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = viewModel::save,
                enabled = state.isValid,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Save")
            }
            if (state.saved) {
                Spacer(modifier = Modifier.height(4.dp))
                Text("Saved successfully.", style = MaterialTheme.typography.bodySmall, color = IconNavy)
            }
            Spacer(modifier = Modifier.height(24.dp))
            Divider()
            Spacer(modifier = Modifier.height(12.dp))
            Text("Test connection", style = MaterialTheme.typography.titleSmall, color = IconNavy, fontWeight = FontWeight.Bold)
            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = viewModel::testConnection,
                enabled = state.isValid,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (state.testing) "Checking…" else "Test")
            }
            if (state.testing) {
                Spacer(modifier = Modifier.height(8.dp))
                LinearProgressIndicator(
                    modifier = Modifier.fillMaxWidth(),
                    trackColor = MaterialTheme.colorScheme.surfaceVariant,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            when (val conn = state.connection) {
                is ConnectionState.Connected ->
                    Text("✓ Connected", color = IconNavy, style = MaterialTheme.typography.bodyMedium)
                is ConnectionState.Disconnected ->
                    Text("✗ ${conn.message}", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodyMedium)
                ConnectionState.Checking ->
                    Text("Checking…", color = MaterialTheme.colorScheme.onSurfaceVariant, style = MaterialTheme.typography.bodyMedium)
                ConnectionState.Idle -> Unit
            }
            if (state.isCleartext && state.connection == ConnectionState.Connected) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "⚠ Connected over plain HTTP. This is only safe on a trusted local network.",
                    color = IconGold,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
            Spacer(modifier = Modifier.height(32.dp))
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
                elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("About", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(8.dp))
                    val context = LocalContext.current
                    val version = try {
                        context.packageManager.getPackageInfo(context.packageName, 0).versionName ?: "0.0"
                    } catch (_: Exception) { "0.0" }
                    Text("ICON Academic Companion v$version")
                    Text("Local-first companion for ICON Academic Studio.")
                    Text("No authentication required. Project IDs are used for scoping.")
                }
            }
        }
    }
}
