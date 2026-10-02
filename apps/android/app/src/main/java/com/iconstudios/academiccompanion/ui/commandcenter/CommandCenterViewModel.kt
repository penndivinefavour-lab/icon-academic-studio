package com.iconstudios.academiccompanion.ui.commandcenter

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.iconstudios.academiccompanion.data.local.ProjectEntity
import com.iconstudios.academiccompanion.data.model.AcademicDashboard
import com.iconstudios.academiccompanion.data.repository.ApiMappers
import com.iconstudios.academiccompanion.data.repository.StudioRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

/**
 * Mobile Project Command Center.
 *
 * Reuses the same workflow stages as the web Command Center:
 *   DISCOVER → RESEARCH → PLAN → COLLECT → ANALYZE → WRITE → REVIEW → PUBLISH → EXPORT
 * The next action always comes from the API (deterministic engine) and is
 * never recomputed locally. When offline, the last cached value is shown
 * with an explicit "cached" label.
 */
data class CommandCenterUiState(
    val loading: Boolean = true,
    val project: ProjectEntity? = null,
    val dashboard: AcademicDashboard? = null,
    val nextAction: com.iconstudios.academiccompanion.data.local.NextActionEntity? = null,
    val isStale: Boolean = false,
    val offline: Boolean = false,
    val error: String? = null,
) {
    val completion: Int get() = dashboard?.progress?.completion ?: 0
    val pipelineStages: List<WorkflowStage> get() = computePipeline()

    private fun computePipeline(): List<WorkflowStage> {
        val stages = WorkflowStage.ALL
        val reached = when (dashboard?.status?.uppercase()) {
            "COMPLETED" -> stages.size
            "REVIEW" -> 8
            "IN_PROGRESS" -> 6
            "DRAFT" -> 3
            else -> 2
        }
        return stages.mapIndexed { index, stage ->
            WorkflowStage(stage, index < reached, index == reached - 1 || index == reached)
        }
    }
}

data class WorkflowStage(val name: String, val completed: Boolean, val current: Boolean) {
    companion object {
        // Identical order to docs/ACADEMIC_WORKFLOWS.md — do not invent a
        // separate mobile workflow.
        val ALL = listOf(
            "DISCOVER", "RESEARCH", "PLAN", "COLLECT", "ANALYZE", "WRITE", "REVIEW", "PUBLISH", "EXPORT",
        )
    }
}

class CommandCenterViewModel(
    private val studioRepository: StudioRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(CommandCenterUiState())
    val state: StateFlow<CommandCenterUiState> = _state.asStateFlow()

    fun load(projectId: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(loading = true, error = null)

            // Cache-first: show whatever we have immediately.
            val cached = studioRepository.getCachedProject(projectId)
            _state.value = _state.value.copy(project = cached)

            // Observe cached next action so the UI can label staleness.
            studioRepository.observeNextAction(projectId).collect { cachedAction ->
                _state.value = _state.value.copy(
                    nextAction = cachedAction,
                    isStale = cachedAction != null,
                )
            }
        }

        viewModelScope.launch {
            // Best-effort network refresh. Failure → offline mode, not an error screen.
            studioRepository.refreshProject(projectId)
            _state.value = _state.value.copy(project = studioRepository.getCachedProject(projectId))
        }

        viewModelScope.launch {
            val dashResult = studioRepository.fetchDashboard(projectId)
            dashResult.onSuccess { dash ->
                _state.value = _state.value.copy(dashboard = dash, offline = false, loading = false)
            }.onFailure {
                _state.value = _state.value.copy(offline = true, loading = false)
            }
        }

        viewModelScope.launch {
            val naResult = studioRepository.refreshNextAction(projectId)
            naResult.onSuccess {
                _state.value = _state.value.copy(isStale = false, offline = false)
            }.onFailure {
                _state.value = _state.value.copy(offline = true)
            }
        }
    }
}
