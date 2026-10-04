package com.iconstudios.academiccompanion.ui.capture

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.TextButton
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.iconstudios.academiccompanion.data.local.CaptureEntity
import com.iconstudios.academiccompanion.data.local.SyncState
import com.iconstudios.academiccompanion.ui.theme.IconGold
import com.iconstudios.academiccompanion.ui.theme.IconNavy

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CaptureScreen(viewModel: CaptureViewModel) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    val snackbarHostState = remember { SnackbarHostState() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Capture", fontWeight = FontWeight.SemiBold, color = IconNavy) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
        floatingActionButton = {
            FloatingActionButton(
                onClick = viewModel::save,
                containerColor = IconGold,
                contentColor = IconNavy,
            ) {
                Icon(Icons.Default.Refresh, contentDescription = "Save capture")
            }
        },
        snackbarHost = { SnackbarHost(snackbarHostState) },
    ) { inner ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(inner),
        ) {
            ProjectSelector(viewModel)
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = state.title,
                onValueChange = viewModel::onTitleChange,
                label = { Text("Title *") },
                singleLine = true,
                placeholder = { Text("e.g., Observation at site visit") },
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            )
            Spacer(modifier = Modifier.height(4.dp))
            OutlinedTextField(
                value = state.content,
                onValueChange = viewModel::onContentChange,
                label = { Text("Notes (optional)") },
                placeholder = { Text("Details, quotes, ideas…") },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(120.dp)
                    .padding(horizontal = 16.dp),
            )
            if (state.saving) {
                Text(
                    text = "Saving locally…",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(start = 16.dp, top = 4.dp),
                )
            }
            if (state.saved) {
                Text(
                    text = "Saved — will sync when connected to the Studio API.",
                    style = MaterialTheme.typography.bodySmall,
                    color = IconNavy,
                    modifier = Modifier.padding(start = 16.dp, top = 4.dp),
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "Recent captures (${state.captures.size})",
                style = MaterialTheme.typography.titleSmall,
                color = IconNavy,
                modifier = Modifier.padding(horizontal = 16.dp),
            )
            LazyColumn(modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)) {
                items(state.captures.take(20), key = { it.clientId }) { capture ->
                    CaptureCard(capture = capture, onRetry = { viewModel.retry(capture) }, onDelete = { viewModel.delete(capture) })
                }
            }
        }
    }
}

@Composable
private fun ProjectSelector(viewModel: CaptureViewModel) {
    val state by viewModel.state.collectAsStateWithLifecycle()
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("Project:", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (state.projects.isEmpty()) {
            Text("None found", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
        } else {
            var expanded by remember { mutableStateOf(false) }
            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                state.projects.forEach { p ->
                    DropdownMenuItem(text = { Text(p.name) }, onClick = { viewModel.onProjectSelected(p.id); expanded = false })
                }
            }
            TextButton(onClick = { expanded = true }) {
                Text(if (state.selectedProjectId.isNotEmpty()) "Selected project" else "Select project…")
            }
        }
    }
}

@Composable
private fun CaptureCard(capture: CaptureEntity, onRetry: () -> Unit, onDelete: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(10.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(capture.title, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
            if (capture.content.isNotBlank()) {
                Text(capture.content, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                SyncBadge(capture.syncState)
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    IconButton(onClick = onRetry) {
                        Icon(Icons.Filled.Refresh, contentDescription = "Retry sync")
                    }
                    IconButton(onClick = onDelete) {
                        Icon(Icons.Filled.Delete, contentDescription = "Delete capture")
                    }
                }
            }
        }
    }
}

@Composable
private fun SyncBadge(syncState: String) {
    val (text, color) = when (syncState) {
        SyncState.SYNCED -> "Synced" to IconNavy
        SyncState.PENDING -> "Pending sync" to IconGold
        else -> "Sync failed" to MaterialTheme.colorScheme.error
    }
    AssistChip(
        onClick = {},
        modifier = Modifier.padding(horizontal = 8.dp),
        label = { Text(text, color = color) },
    )
}
