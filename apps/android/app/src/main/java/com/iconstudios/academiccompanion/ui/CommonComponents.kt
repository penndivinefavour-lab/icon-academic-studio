package com.iconstudios.academiccompanion.ui

import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.iconstudios.academiccompanion.ui.HomeUiState
import com.iconstudios.academiccompanion.ui.HomeViewModel
import com.iconstudios.academiccompanion.ui.projects.ProjectsViewModel
import com.iconstudios.academiccompanion.ui.theme.IconGold
import com.iconstudios.academiccompanion.ui.theme.IconNavy
import com.iconstudios.academiccompanion.data.local.ActivityEntity
import com.iconstudios.academiccompanion.data.local.ProjectEntity
import com.iconstudios.academiccompanion.data.repository.ConnectionState
import com.iconstudios.academiccompanion.ui.activity.relativeTime
import com.iconstudios.academiccompanion.ui.theme.IconPurple
import com.iconstudios.academiccompanion.ui.theme.IconSuccess
import com.iconstudios.academiccompanion.ui.commandcenter.CommandCenterUiState
import com.iconstudios.academiccompanion.ui.commandcenter.CommandCenterViewModel
import com.iconstudios.academiccompanion.ui.commandcenter.WorkflowStage

@Composable
fun ConnectionBanner(
    connection: ConnectionState,
    checkedAt: Long,
    isCleartext: Boolean,
    modifier: Modifier = Modifier,
) {
    val (text, color) = when (connection) {
        is ConnectionState.Connected -> if (isCleartext) {
            "Connected (plain HTTP — trusted network only)" to IconGold
        } else {
            "Connected to Studio API" to IconNavy
        }
        ConnectionState.Checking -> "Checking connection…" to IconGold
        is ConnectionState.Disconnected -> "Offline — cached data available" to MaterialTheme.colorScheme.error
        ConnectionState.Idle -> "" to IconNavy
    }
    if (text.isEmpty()) return
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(10.dp)
                .clip(CircleShape)
                .background(color),
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = text,
            style = MaterialTheme.typography.bodySmall,
            color = color,
            fontWeight = FontWeight.Medium,
        )
    }
}

@Composable
fun ProjectCard(
    project: ProjectEntity,
    onClick: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        onClick = { onClick(project.id) },
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = project.name,
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 2,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "${prettifyType(project.type)} · ${project.status}",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    MetricChip("Sources", project.sourceCount)
                    MetricChip("Docs", project.documentCount)
                    MetricChip("Notes", project.noteCount)
                }
            }
            Icon(
                imageVector = Icons.Filled.ChevronRight,
                contentDescription = "Open project",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
private fun MetricChip(label: String, count: Int) {
    Column {
        Text(
            text = count.toString(),
            style = MaterialTheme.typography.titleMedium,
            color = IconNavy,
            fontWeight = FontWeight.SemiBold,
        )
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
    }
}

@Composable
fun LoadingBlock(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .padding(32.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = "Loading…",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
fun EmptyState(title: String, message: String, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .padding(32.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}

@Composable
fun ErrorState(message: String, onRetry: (() -> Unit)?, modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .padding(32.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "Something went wrong",
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.error,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = message,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            onRetry?.let {
                Spacer(modifier = Modifier.height(16.dp))
                TextButton(onClick = it) {
                    Text(text = "Try again")
                }
            }
        }
    }
}

@Composable
fun SectionHeader(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.titleMedium,
        color = IconNavy,
        fontWeight = FontWeight.SemiBold,
        modifier = Modifier.padding(start = 16.dp, top = 16.dp, bottom = 4.dp),
    )
}

/** Turns `HND_PROJECT` into `HND project`. */
fun prettifyType(type: String): String =
    type.split('_').joinToString(" ") { it.lowercase() }.replaceFirstChar { it.uppercase() }
