package com.iconstudios.academiccompanion.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "connection_prefs")

/**
 * Stores the user-configured Studio API base URL and the last-known
 * reachability state. No secrets are stored — only a host:port string.
 */
class ConnectionPrefs(private val context: Context) {

    private object Keys {
        val BASE_URL = stringPreferencesKey("base_url")
        val LAST_STATUS = stringPreferencesKey("last_status")
        val LAST_CHECKED = longPreferencesKey("last_checked")
    }

    val baseUrl: Flow<String> = context.dataStore.data.map { it[Keys.BASE_URL] ?: DEFAULT_URL }

    val lastStatus: Flow<String> = context.dataStore.data.map { it[Keys.LAST_STATUS] ?: STATUS_UNKNOWN }

    suspend fun setBaseUrl(url: String) {
        context.dataStore.edit { it[Keys.BASE_URL] = url.trim() }
    }

    suspend fun setLastStatus(status: String, checkedAt: Long = System.currentTimeMillis()) {
        context.dataStore.edit {
            it[Keys.LAST_STATUS] = status
            it[Keys.LAST_CHECKED] = checkedAt
        }
    }

    companion object {
        const val DEFAULT_URL = "http://localhost:4001"
        const val STATUS_CONNECTED = "CONNECTED"
        const val STATUS_DISCONNECTED = "DISCONNECTED"
        const val STATUS_CHECKING = "CHECKING"
        const val STATUS_UNKNOWN = "UNKNOWN"
    }
}
