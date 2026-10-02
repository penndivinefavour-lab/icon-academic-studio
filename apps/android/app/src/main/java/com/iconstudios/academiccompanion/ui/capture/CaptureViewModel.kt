package com.iconstudios.academiccompanion.ui.capture

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.iconstudios.academiccompanion.data.local.CaptureEntity
import com.iconstudios.academiccompanion.data.local.ProjectEntity
import com.iconstudios.academiccompanion.data.repository.CaptureRepository
import com.iconstudios.academiccompanion.data.repository.StudioRepository
import com.iconstudios.academiccompanion.sync.SyncEnqueuer
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class CaptureUiState(
    val title: String = "",
    val content: String = "",
    val selectedProjectId: String = "",
    val projects: List<ProjectEntity> = emptyList(),
    val captures: List<CaptureEntity> = emptyList(),
    val saving: Boolean = false,
    val saved: Boolean = false,
    val error: String? = null,
) {
    val canSave: Boolean get() = title.isNotBlank()
}

class CaptureViewModel(
    private val captureRepository: CaptureRepository,
    private val studioRepository: StudioRepository,
    private val appContext: Context,
) : ViewModel() {

    private val _title = MutableStateFlow("")
    private val _content = MutableStateFlow("")
    private val _selectedProject = MutableStateFlow("")
    private val _saving = MutableStateFlow(false)
    private val _saved = MutableStateFlow(false)
    private val _error = MutableStateFlow<String?>(null)

    val state: StateFlow<CaptureUiState> = combine(
        _title,
        _content,
        _selectedProject,
        _saving,
        _saved,
        _error,
        captureRepository.observeAll(),
        studioRepository.observeProjects(),
    ) { values ->
        @Suppress("UNCHECKED_CAST")
        val captures = values[6] as List<CaptureEntity>
        @Suppress("UNCHECKED_CAST")
        val projects = values[7] as List<ProjectEntity>
        CaptureUiState(
            title = values[0] as String,
            content = values[1] as String,
            selectedProjectId = values[2] as String,
            saving = values[3] as Boolean,
            saved = values[4] as Boolean,
            error = values[5] as String?,
            captures = captures,
            projects = projects,
        )
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), CaptureUiState())

    fun onTitleChange(value: String) { _title.value = value; _saved.value = false }
    fun onContentChange(value: String) { _content.value = value; _saved.value = false }
    fun onProjectSelected(projectId: String) { _selectedProject.value = projectId }

    fun save() {
        val title = _title.value.trim()
        if (title.isBlank()) {
            _error.value = "A title is required"
            return
        }
        viewModelScope.launch {
            _saving.value = true
            _error.value = null
            // Room write happens first — the capture survives even if the
            // sync worker never runs.
            captureRepository.capture(title, _content.value, _selectedProject.value)
            _saving.value = false
            _saved.value = true
            _title.value = ""
            _content.value = ""
            // Hand off to WorkManager: drains when the Studio API is reachable.
            SyncEnqueuer.enqueueCaptureSync(appContext)
        }
    }

    fun retry(capture: CaptureEntity) {
        viewModelScope.launch {
            captureRepository.retry(capture.clientId)
            SyncEnqueuer.enqueueCaptureSync(appContext)
        }
    }

    fun delete(capture: CaptureEntity) {
        viewModelScope.launch { captureRepository.delete(capture.clientId) }
    }

    fun clearError() { _error.value = null }
}
