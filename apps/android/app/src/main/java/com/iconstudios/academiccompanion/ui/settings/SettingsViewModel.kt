package com.iconstudios.academiccompanion.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.iconstudios.academiccompanion.data.local.ConnectionPrefs
import com.iconstudios.academiccompanion.data.remote.ApiClient
import com.iconstudios.academiccompanion.data.repository.ConnectionRepository
import com.iconstudios.academiccompanion.data.repository.ConnectionState
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

data class SettingsUiState(
    val baseUrl: String = "",
    val isValid: Boolean = true,
    val isCleartext: Boolean = false,
    val connection: ConnectionState = ConnectionState.Idle,
    val testing: Boolean = false,
    val saved: Boolean = false,
    val error: String? = null,
)

class SettingsViewModel(
    private val connectionPrefs: ConnectionPrefs,
    private val connectionRepository: ConnectionRepository,
) : ViewModel() {

    private val _state = MutableStateFlow(SettingsUiState())
    val state: StateFlow<SettingsUiState> = _state.asStateFlow()

    init {
        viewModelScope.launch {
            connectionPrefs.baseUrl.collect { url ->
                _state.value = _state.value.copy(
                    baseUrl = url,
                    isValid = ApiClient.isValidUrl(url),
                    isCleartext = ApiClient.isCleartext(url),
                )
            }
        }
    }

    fun onBaseUrlChange(value: String) {
        _state.value = _state.value.copy(
            baseUrl = value,
            isValid = ApiClient.isValidUrl(value),
            isCleartext = ApiClient.isCleartext(value),
            saved = false,
        )
    }

    fun save() {
        val url = _state.value.baseUrl.trim()
        if (!ApiClient.isValidUrl(url)) {
            _state.value = _state.value.copy(error = "Enter a valid http:// or https:// URL")
            return
        }
        viewModelScope.launch {
            connectionPrefs.setBaseUrl(url)
            _state.value = _state.value.copy(saved = true, error = null)
        }
    }

    fun testConnection() {
        viewModelScope.launch {
            // Persist first so the repository uses the new URL for the probe.
            connectionPrefs.setBaseUrl(_state.value.baseUrl.trim())
            _state.value = _state.value.copy(testing = true)
            connectionRepository.check().collect { connection ->
                _state.value = _state.value.copy(connection = connection, testing = false)
                when (connection) {
                    is ConnectionState.Connected -> connectionPrefs.setLastStatus(ConnectionPrefs.STATUS_CONNECTED)
                    is ConnectionState.Disconnected -> connectionPrefs.setLastStatus(ConnectionPrefs.STATUS_DISCONNECTED)
                    ConnectionState.Checking -> connectionPrefs.setLastStatus(ConnectionPrefs.STATUS_CHECKING)
                    ConnectionState.Idle -> Unit
                }
            }
        }
    }
}
