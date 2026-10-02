package com.iconstudios.academiccompanion.data.remote

import com.iconstudios.academiccompanion.data.model.AcademicDashboardDto
import com.iconstudios.academiccompanion.data.model.ActivityResponse
import com.iconstudios.academiccompanion.data.model.CreateNoteRequest
import com.iconstudios.academiccompanion.data.model.HealthResponse
import com.iconstudios.academiccompanion.data.model.NextActionResponse
import com.iconstudios.academiccompanion.data.model.NoteDto
import com.iconstudios.academiccompanion.data.model.NoteListResponse
import com.iconstudios.academiccompanion.data.model.ProjectListResponse
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Retrofit contract for the ICON Academic Studio API.
 *
 * Phase 10 consumes only these endpoints. AI generation, Data Lab, GCE
 * ingestion, publishing and document-editing endpoints are deliberately NOT
 * used by the companion.
 */
interface StudioApi {

    @GET("/api/health")
    suspend fun health(): HealthResponse

    @GET("/api/v1/projects")
    suspend fun listProjects(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("type") type: String? = null,
        @Query("status") status: String? = null,
    ): ProjectListResponse

    @GET("/api/v1/projects/{id}")
    suspend fun getProject(@Path("id") id: String): ProjectListResponse

    @GET("/api/v1/academic-projects/{id}/dashboard")
    suspend fun getAcademicDashboard(@Path("id") id: String): AcademicDashboardDto

    @GET("/api/v1/activities/project/{projectId}")
    suspend fun getActivity(
        @Path("projectId") projectId: String,
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0,
    ): ActivityResponse

    @GET("/api/v1/activities/project/{projectId}/next-action")
    suspend fun getNextAction(@Path("projectId") projectId: String): NextActionResponse

    @GET("/api/v1/research/notes")
    suspend fun listNotes(@Query("projectId") projectId: String): NoteListResponse

    /**
     * Idempotent note creation for mobile capture. [CreateNoteRequest.clientId]
     * makes retries safe: the server returns the original record on replay.
     */
    @POST("/api/v1/research/notes")
    suspend fun createNote(@Body request: CreateNoteRequest): NoteListResponse
}

/**
 * Result wrapper so repositories can surface failure without exceptions
 * crossing into the UI layer.
 */
sealed interface NetworkResult<out T> {
    data class Success<T>(val data: T) : NetworkResult<T>
    data class Failure(val message: String, val code: Int? = null) : NetworkResult<Nothing>
}

/** A single captured item awaiting synchronisation. */
data class PendingCapture(
    val clientId: String,
    val projectId: String,
    val title: String,
    val content: String,
)
