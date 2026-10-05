package com.iconstudios.academiccompanion.ui.activity

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.iconstudios.academiccompanion.data.local.ActivityEntity
import com.iconstudios.academiccompanion.data.repository.StudioRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class ActivityUiState(
    val loading: Boolean = true,
    val events: List<ActivityEntity> = emptyList(),
    val offline: Boolean = false,
    val error: String? = null,
    val canLoadMore: Boolean = false,
    val loadingMore: Boolean = false,
) {
    val isEmpty: Boolean get() = events.isEmpty() && !loading
}

class ActivityViewModel(
    private val studioRepository: StudioRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(ActivityUiState())
    val state: StateFlow<ActivityUiState> = _state.asStateFlow()

    private var projectId: String? = null
    private var offset = 0
    private val pageSize = 20

    fun load(projectId: String?) {
        this.projectId = projectId
        this.offset = 0
        viewModelScope.launch {
            // Cached pages render immediately.
            _state.value = _state.value.copy(loading = true)
            val cached = projectId?.let { studioRepository.getCachedActivityPage(it, pageSize, 0) } ?: emptyList()
            _state.value = _state.value.copy(events = cached, loading = false)
        }
        if (projectId != null) {
            refresh()
        } else {
            // Top-level Activity tab: no project is selected, so resolve the most
            // recently updated cached project and show its activity feed.
            viewModelScope.launch {
                val id = studioRepository.observeProjects().first().maxByOrNull { it.updatedAt }?.id
                this@ActivityViewModel.projectId = id
                if (id != null) refresh()
            }
        }
    }

    fun refresh() {
        val id = projectId ?: return
        viewModelScope.launch {
            val result = studioRepository.refreshActivity(id, pageSize, 0)
            result.onSuccess {
                val cached = studioRepository.getCachedActivityPage(id, pageSize, 0)
                _state.value = _state.value.copy(
                    events = cached,
                    offline = false,
                    error = null,
                    canLoadMore = cached.size >= pageSize,
                )
            }.onFailure {
                _state.value = _state.value.copy(offline = true, error = null)
            }
        }
    }

    fun loadMore() {
        val id = projectId ?: return
        if (_state.value.loadingMore) return
        viewModelScope.launch {
            _state.value = _state.value.copy(loadingMore = true)
            val nextOffset = offset + pageSize

            val cached = studioRepository.getCachedActivityPage(id, pageSize, nextOffset)
            if (cached.isNotEmpty()) {
                offset = nextOffset
                _state.value = _state.value.copy(
                    events = _state.value.events + cached,
                    loadingMore = false,
                    canLoadMore = cached.size >= pageSize,
                )
                return@launch
            }

            // Not cached locally: try the network for this page.
            val result = studioRepository.refreshActivity(id, pageSize, nextOffset)
            result.onSuccess {
                val page = studioRepository.getCachedActivityPage(id, pageSize, nextOffset)
                offset = nextOffset
                _state.value = _state.value.copy(
                    events = _state.value.events + page,
                    loadingMore = false,
                    canLoadMore = page.size >= pageSize,
                )
            }.onFailure {
                _state.value = _state.value.copy(loadingMore = false, canLoadMore = false)
            }
        }
    }
}
