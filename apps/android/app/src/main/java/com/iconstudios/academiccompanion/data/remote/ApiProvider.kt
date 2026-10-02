package com.iconstudios.academiccompanion.data.remote

/**
 * Manual dependency injection holder for the currently configured [StudioApi].
 *
 * Repositories receive a [ApiProvider] instead of a concrete client so the
 * app can rebuild the Retrofit stack after the user edits the base URL in
 * Settings, without recreating the repositories.
 */
fun interface ApiProvider {
    suspend fun api(): StudioApi
}
