package com.iconstudios.academiccompanion

import android.app.Application
import com.iconstudios.academiccompanion.data.local.CompanionDatabase
import com.iconstudios.academiccompanion.data.local.ConnectionPrefs
import com.iconstudios.academiccompanion.data.remote.ApiClient
import com.iconstudios.academiccompanion.data.remote.ApiProvider
import com.iconstudios.academiccompanion.data.remote.StudioApi
import com.iconstudios.academiccompanion.data.repository.CaptureRepository
import com.iconstudios.academiccompanion.data.repository.ConnectionRepository
import com.iconstudios.academiccompanion.data.repository.StudioRepository
import kotlinx.coroutines.flow.first

/**
 * Manual dependency container. Deliberately small — Hilt's build cost is
 * disproportionate to a six-screen companion.
 *
 * The API client is rebuilt whenever the user changes the base URL.
 */
class AppContainer(private val app: Application) {

    val database: CompanionDatabase by lazy { CompanionDatabase.get(app) }
    val connectionPrefs: ConnectionPrefs by lazy { ConnectionPrefs(app) }

    private var cachedBaseUrl: String? = null
    private var cachedApi: StudioApi? = null

    /**
     * Returns a [StudioApi] for the currently configured base URL.
     * Callers that need an explicit URL (e.g. the sync worker validating a
     * snapshot) should use [apiFor].
     */
    @Synchronized
    suspend fun api(): StudioApi {
        val current = connectionPrefs.baseUrl.first()
        cachedApi?.takeIf { cachedBaseUrl == current }?.let { return it }
        return ApiClient.create(current).also {
            cachedApi = it
            cachedBaseUrl = current
        }
    }

    /** Snapshot API used by the sync worker against a previously read URL. */
    suspend fun apiSnapshot(): StudioApi = api()

    private val apiProvider: ApiProvider = ApiProvider { api() }

    fun apiFor(baseUrl: String): StudioApi = ApiClient.create(baseUrl)

    val captureRepository: CaptureRepository by lazy {
        CaptureRepository(database.captureDao(), apiProvider)
    }

    val studioRepository: StudioRepository by lazy {
        StudioRepository(apiProvider, database.projectDao(), database.activityDao(), database.nextActionDao())
    }

    val connectionRepository: ConnectionRepository by lazy {
        ConnectionRepository(apiProvider)
    }
}
