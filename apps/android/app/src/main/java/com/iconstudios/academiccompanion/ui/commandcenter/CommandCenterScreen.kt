package com.iconstudios.academiccompanion.ui.commandcenter

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.iconstudios.academiccompanion.data.local.NextActionEntity
import com.iconstudios.academiccompanion.ui.EmptyState
import com.iconstudios.academiccompanion.ui.LoadingBlock
import com.iconstudios.academiccompanion.ui.SectionHeader
import com.iconstudios.academiccompanion.ui.commandcenter.CommandCenterViewModel
import com.iconstudios.academiccompanion.ui.theme.IconGold
import com.iconstudios.academiccompanion.ui.theme.IconNavy
import com.iconstudios.academiccompanion.ui.theme.IconSuccess
import kotlin.math.roundToInt

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CommandCenterScreen(
    projectId: String,
    viewModel: CommandCenterViewModel,
    onShowActivity: (String) -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(text = state.project?.name ?: "Project", fontWeight = FontWeight.SemiBold, color = IconNavy) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
    ) { inner ->
        if (state.loading && state.project == null) {
            LoadingBlock(modifier = Modifier.padding(inner))
            return@Scaffold
        }
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(inner),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            item { ProgressCard(state) }
            item { NextActionCard(state.nextAction, state.isStale, state.offline) }
            item { SectionHeader("Workflow pipeline") }
            item { PipelineCard(state.pipelineStages) }
            item { SectionHeader("Materials") }
            item { MaterialsCard(state) }
            item {
                Spacer(modifier = Modifier.height(8.dp))
                androidx.compose.material3.TextButton(
                    onClick = { onShowActivity(projectId) },
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                ) { Text("View project activity", color = MaterialTheme.colorScheme.primary) }
                Spacer(modifier = Modifier.height(24.dp))
            }
        }
    }
}

@Composable
private fun ProgressCard(state: CommandCenterUiState) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(16.dp),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "${state.completion}% complete",
                style = MaterialTheme.typography.headlineSmall,
                color = IconNavy,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(8.dp))
            LinearProgressIndicator(
                progress = { state.completion / 100f },
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.primary,
                trackColor = MaterialTheme.colorScheme.surfaceVariant,
            )
            Spacer(modifier = Modifier.height(8.dp))
            val progress = state.dashboard?.progress
            if (progress != null) {
                Text(
                    text = "${progress.chaptersWithContent} of ${progress.totalChapters} chapters with content",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            state.dashboard?.wordCount?.let { words ->
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = "$words words",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

@Composable
private fun NextActionCard(nextAction: NextActionEntity?, isStale: Boolean, offline: Boolean) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer),
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = "NEXT ACTION",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onPrimaryContainer,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(4.dp))
            when {
                nextAction == null -> Text(
                    text = if (offline) "No next action available while offline." else "No next action available.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onPrimaryContainer,
                )
                else -> {
                    Text(
                        text = nextAction.action,
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer,
                        fontWeight = FontWeight.SemiBold,
                    )
                    nextAction.description?.let { desc ->
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(text = desc, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onPrimaryContainer)
                    }
                    nextAction.reason?.let { reason ->
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(text = reason, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onPrimaryContainer)
                    }
                    if (isStale) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Cached — last synced ${relativeTime(nextAction.cachedAt)}",
                            style = MaterialTheme.typography.labelSmall,
                            color = IconGold,
                            fontWeight = FontWeight.Medium,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun PipelineCard(stages: List<WorkflowStage>) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            stages.forEach { stage ->
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    val color = when {
                        stage.current -> IconGold
                        stage.completed -> IconSuccess
                        else -> MaterialTheme.colorScheme.surfaceVariant
                    }
                    Box(
                        modifier = Modifier
                            .size(12.dp)
                            .clip(CircleShape)
                            .background(color),
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        text = stage.name.take(3),
                        style = MaterialTheme.typography.labelSmall,
                        color = if (stage.completed || stage.current) IconNavy else MaterialTheme.colorScheme.onSurfaceVariant,
                        fontWeight = if (stage.current) FontWeight.Bold else FontWeight.Normal,
                    )
                }
            }
        }
    }
}

@Composable
private fun MaterialsCard(state: CommandCenterUiState) {
    val counts = state.dashboard?.counts.orEmpty()
    val project = state.project
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        shape = RoundedCornerShape(12.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(16.dp),
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            MaterialCount("Sources", project?.sourceCount ?: counts["sources"]?.toInt() ?: 0)
            MaterialCount("Docs", project?.documentCount ?: counts["documents"]?.toInt() ?: 0)
            MaterialCount("Datasets", project?.datasetCount ?: counts["datasets"]?.toInt() ?: 0)
            MaterialCount("Notes", project?.noteCount ?: counts["notes"]?.toInt() ?: 0)
        }
    }
}

@Composable
private fun MaterialCount(label: String, count: Int) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(text = count.toString(), style = MaterialTheme.typography.titleLarge, color = IconNavy, fontWeight = FontWeight.SemiBold)
        Text(text = label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

fun relativeTime(epochMillis: Long): String {
    val delta = System.currentTimeMillis() - epochMillis
    val minutes = delta / 60_000
    return when {
        minutes < 1 -> "just now"
        minutes < 60 -> "${minutes}m"
        else -> {
            val hours = minutes / 60
            if (hours < 24) "${hours}h"
            else {
                val days = hours / 24
                if (days < 7) "${days}d"
                else java.text.SimpleDateFormat("MMM d", java.util.Locale.getDefault()).format(java.util.Date(epochMillis))
            }
        }
    }
}
