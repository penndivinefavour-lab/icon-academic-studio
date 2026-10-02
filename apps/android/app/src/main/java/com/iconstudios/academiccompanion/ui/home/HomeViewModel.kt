package com.iconstudios.academiccompanion.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.iconstudios.academiccompanion.data.local.ProjectEntity
import com.iconstudios.academiccompanion.data.repository.ConnectionState
import com.iconstudios.academiccompanion.data.repository.ConnectionRepository
import com.iconstudios.academiccompanion.data.repository.StudioRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * Shared UI state for the connection banner and Home dashboard.
 */
data class HomeUiState(
    val loading: Boolean = true,
    val projects: List<ProjectEntity> = emptyList(),
    val connection: ConnectionState = ConnectionState.Idle,
    val connectionCheckedAt: Long = 0,
    val isCleartext: Boolean = false,
    val error: String? = null,
) {
    val projectCount: Int get() = projects.size
    val activeProjects: List<ProjectEntity>
        get() = projects.filter { it.status != "COMPLETED" && it.status != "ARCHIVED" }
    val recentProjects: List<ProjectEntity> get() = projects.take(5)
}

class HomeViewModel(
    private val studioRepository: StudioRepository,
    private val connectionRepository: ConnectionRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(HomeUiState())
    val state: StateFlow<HomeUiState> = _state.asStateFlow()

    init {
        observeProjects()
        checkConnection()
    }

    private fun observeProjects() {
        viewModelScope.launch {
            studioRepository.observeProjects().collect { projects ->
                _state.value = _state.value.copy(loading = false, projects = projects)
            }
        }
    }

    fun checkConnection() {
        viewModelScope.launch {
            connectionRepository.check().collect { connection ->
                _state.value = _state.value.copy(
                    connection = connection,
                    connectionCheckedAt = System.currentTimeMillis(),
                )
                if (connection is ConnectionState.Connected) {
                    refresh()
                }
            }
        }
    }

    fun refresh() {
        viewModelScope.launch {
            val result = studioRepository.refreshProjects()
            result.onFailure { error ->
                _state.value = _state.value.copy(error = "Could not reach the Studio API. Showing cached data.")
            }.onSuccess {
                _state.value = _state.value.copy(error = null)
            }
        }
    }

    fun onCleartextWarningChanged(cleartext: Boolean) {
        _state.value = _state.value.copy(isCleartext = cleartext)
    }
}
