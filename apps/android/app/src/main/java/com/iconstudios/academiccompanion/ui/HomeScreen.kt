package com.iconstudios.academiccompanion.ui

import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.iconstudios.academiccompanion.ui.HomeUiState
import com.iconstudios.academiccompanion.ui.HomeViewModel
import com.iconstudios.academiccompanion.ui.theme.IconGold
import com.iconstudios.academiccompanion.ui.theme.IconNavy

@Composable
fun HomeScreen(
    viewModel: HomeViewModel,
    onProjectClick: (String) -> Unit,
) {
    val state by viewModel.state.collectAsStateWithLifecycle()

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        item {
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "ICON Academic Studio",
                style = MaterialTheme.typography.headlineMedium,
                color = IconNavy,
                fontWeight = FontWeight.Bold,
                modifier = Modifier.padding(horizontal = 16.dp),
            )
            Text(
                text = "Research. Learn. Create. Publish.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 16.dp),
            )
            Spacer(modifier = Modifier.height(4.dp))
        }

        item {
            ConnectionBanner(
                connection = state.connection,
                checkedAt = state.connectionCheckedAt,
                isCleartext = state.isCleartext,
            )
        }

        item {
            StatRow(
                projectCount = state.projectCount,
                activeCount = state.activeProjects.size,
            )
            Spacer(modifier = Modifier.height(4.dp))
        }

        if (state.loading && state.projects.isEmpty()) {
            item { LoadingBlock() }
        } else if (state.projects.isEmpty()) {
            item {
                EmptyState(
                    title = "No projects",
                    message = "Open ICON Academic Studio on your workstation to create one. Cached data will appear here.",
                )
            }
        } else {
            item { SectionHeader("Recent projects") }
            items(state.recentProjects, key = { it.id }) { project ->
                ProjectCard(project = project, onClick = onProjectClick)
            }
            if (state.recentProjects.size < state.projectCount) {
                item {
                    Text(
                        text = "Showing ${state.recentProjects.size} of ${state.projectCount} projects",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(16.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun StatRow(projectCount: Int, activeCount: Int) {
    androidx.compose.foundation.layout.Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        horizontalArrangement = androidx.compose.foundation.layout.Arrangement.spacedBy(12.dp),
    ) {
        StatCard(
            modifier = Modifier.weight(1f),
            value = projectCount.toString(),
            label = "Projects",
        )
        StatCard(
            modifier = Modifier.weight(1f),
            value = activeCount.toString(),
            label = "Active",
        )
    }
}

@Composable
private fun StatCard(
    value: String,
    label: String,
    modifier: Modifier = Modifier,
) {
    androidx.compose.material3.Card(
        modifier = modifier,
        shape = androidx.compose.foundation.shape.RoundedCornerShape(12.dp),
        elevation = androidx.compose.material3.CardDefaults.cardElevation(defaultElevation = 2.dp),
    ) {
        androidx.compose.foundation.layout.Column(
            modifier = Modifier.padding(16.dp),
        ) {
            Text(
                text = value,
                style = MaterialTheme.typography.headlineMedium,
                color = IconNavy,
                fontWeight = FontWeight.Bold,
            )
            Text(
                text = label,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
    }
}
