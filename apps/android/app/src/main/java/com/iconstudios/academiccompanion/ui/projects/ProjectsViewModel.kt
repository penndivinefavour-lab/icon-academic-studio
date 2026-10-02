package com.iconstudios.academiccompanion.ui.projects

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.iconstudios.academiccompanion.data.local.ProjectEntity
import com.iconstudios.academiccompanion.data.repository.StudioRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class ProjectsUiState(
    val loading: Boolean = true,
    val projects: List<ProjectEntity> = emptyList(),
    val query: String = "",
    val error: String? = null,
)

class ProjectsViewModel(
    private val studioRepository: StudioRepository,
) : ViewModel() {

    private val _query = MutableStateFlow("")
    private val _loading = MutableStateFlow(true)
    private val _error = MutableStateFlow<String?>(null)

    val state: StateFlow<ProjectsUiState> = combine(
        studioRepository.searchProjects(_query.value),
        _query,
        _loading,
        _error,
    ) { projects, query, loading, error ->
        ProjectsUiState(loading, projects, query, error)
    }.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), ProjectsUiState())

    init {
        refresh()
    }

    fun onQueryChange(query: String) {
        _query.value = query
    }

    fun refresh() {
        viewModelScope.launch {
            _loading.value = true
            studioRepository.refreshProjects()
                .onSuccess { _error.value = null }
                .onFailure { _error.value = "Could not reach the Studio API. Showing cached data." }
            _loading.value = false
        }
    }
}
