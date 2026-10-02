package com.iconstudios.academiccompanion.data.repository

import com.iconstudios.academiccompanion.data.remote.ApiProvider
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.catch
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.withTimeoutOrNull
import kotlin.time.Duration.Companion.seconds

/**
 * Health-check for the user-configured Studio API. Used by the connection
 * banner and the Settings screen's test button.
 *
 * Fails safely: any error becomes [ConnectionState.Disconnected] with a
 * user-safe message — never a stack trace.
 */
class ConnectionRepository(private val apiProvider: ApiProvider) {

    fun check(): Flow<ConnectionState> = flow {
        emit(ConnectionState.Checking)
        val state = try {
            // Short timeout: this is a LAN probe, not a long request.
            val health = withTimeoutOrNull(6.seconds) { apiProvider.api().health() }
            if (health?.status == "ok") ConnectionState.Connected
            else ConnectionState.Disconnected("Studio API unreachable")
        } catch (e: Throwable) {
            ConnectionState.Disconnected(safeMessage(e))
        }
        emit(state)
    }.catch { emit(ConnectionState.Disconnected("Connection failed")) }

    private fun safeMessage(e: Throwable): String {
        val raw = e.message.orEmpty()
        // Never surface hostnames with credentials or stack details.
        return when {
            raw.contains("Unable to resolve host", ignoreCase = true) -> "Host not found"
            raw.contains("failed to connect", ignoreCase = true) -> "Could not connect to the Studio API"
            raw.contains("timeout", ignoreCase = true) -> "Connection timed out"
            raw.contains("cleartext", ignoreCase = true) -> "Plain HTTP blocked for this host"
            else -> "Studio API unreachable"
        }
    }
}

sealed interface ConnectionState {
    data object Idle : ConnectionState
    data object Checking : ConnectionState
    data object Connected : ConnectionState
    data class Disconnected(val message: String) : ConnectionState
}
