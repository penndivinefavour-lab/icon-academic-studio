package com.iconstudios.academiccompanion.data.remote

import com.jakewharton.retrofit2.converter.kotlinx.serialization.asConverterFactory
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import java.util.concurrent.TimeUnit

/**
 * Builds the Retrofit [StudioApi] against a user-configured base URL.
 *
 * SECURITY: no credentials, API keys or provider secrets are ever attached.
 * The Studio API has no authentication (Phase 9.1.1); the app relies entirely
 * on the user connecting to their own trusted local workstation.
 */
object ApiClient {

    val json: Json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        explicitNulls = false
    }

    /**
     * @param baseUrl user-supplied Studio API root, e.g. `http://192.168.1.20:4000`.
     *                Must be non-empty and end with `/` for Retrofit.
     */
    fun create(baseUrl: String): StudioApi {
        val normalized = normalizeBaseUrl(baseUrl)
        val client = OkHttpClient.Builder()
            .connectTimeout(8, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .writeTimeout(20, TimeUnit.SECONDS)
            // Logging is intentionally omitted: we never log academic
            // content, tokens or credentials. Debug builds can add a
            // BODY-level interceptor temporarily, but never ship it.
            .build()

        return retrofit2.Retrofit.Builder()
            .baseUrl(normalized)
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
            .create(StudioApi::class.java)
    }

    /** Returns true when [url] uses plain HTTP (unsafe off a trusted network). */
    fun isCleartext(url: String): Boolean = url.trim().startsWith("http://", ignoreCase = true)

    fun isValidUrl(url: String): Boolean {
        val v = url.trim()
        if (v.isEmpty()) return false
        return v.startsWith("http://", ignoreCase = true) || v.startsWith("https://", ignoreCase = true)
    }

    private fun normalizeBaseUrl(baseUrl: String): String {
        var v = baseUrl.trim()
        if (v.isEmpty()) return "http://localhost:4000/"
        if (!v.endsWith("/")) v += "/"
        return v
    }
}
