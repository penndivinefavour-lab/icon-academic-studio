package com.iconstudios.academiccompanion.ui.activity

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.iconstudios.academiccompanion.data.local.ActivityEntity
import com.iconstudios.academiccompanion.data.repository.ApiMappers
import com.iconstudios.academiccompanion.ui.activity.ActivityViewModel
import com.iconstudios.academiccompanion.ui.theme.IconPurple
import com.iconstudios.academiccompanion.ui.EmptyState
import com.iconstudios.academiccompanion.ui.LoadingBlock

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ActivityScreen(projectId: String, viewModel: ActivityViewModel) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LaunchedEffect(projectId) { viewModel.load(projectId) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Activity", fontWeight = FontWeight.SemiBold, color = com.iconstudios.academiccompanion.ui.theme.IconNavy) },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
            )
        },
    ) { inner ->
        if (state.loading && state.events.isEmpty()) {
            LoadingBlock(modifier = Modifier.padding(inner))
            return@Scaffold
        }
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(inner),
            verticalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            if (state.events.isEmpty() && !state.loading) {
                item { EmptyState(title = "No activity yet", message = "Project actions will appear here as you work.") }
            } else {
                items(state.events, key = { it.id }) { event ->
                    ActivityItem(event)
                }
                if (state.canLoadMore) {
                    item {
                        Box(modifier = Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(modifier = Modifier.size(24.dp), color = IconPurple)
                        }
                    }
                    item {
                        androidx.compose.material3.TextButton(onClick = viewModel::loadMore) {
                            Text("Load more")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ActivityItem(event: ActivityEntity) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(10.dp),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        androidx.compose.foundation.layout.Row(
            modifier = Modifier.fillMaxWidth().padding(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .clip(androidx.compose.foundation.shape.CircleShape)
                    .background(Color(0xFF6B21A8)),
            )
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = ApiMappers.prettifyAction(event.action),
                    style = MaterialTheme.typography.bodySmall,
                    color = IconPurple,
                    fontWeight = FontWeight.Medium,
                )
                Text(
                    text = event.description ?: event.action,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = relativeTime(event.createdAtMs),
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
    }
}

fun relativeTime(epochMillis: Long): String {
    val delta = System.currentTimeMillis() - epochMillis
    val minutes = delta / 60_000
    return when {
        minutes < 1 -> "just now"
        minutes < 60 -> "${minutes}m ago"
        val hours = minutes / 60
        hours < 24 -> "${hours}h ago"
        val days = hours / 24
        days < 7 -> "${days}d ago"
        else -> java.text.SimpleDateFormat("MMM d", java.util.Locale.getDefault()).format(java.util.Date(epochMillis))
    }
}
