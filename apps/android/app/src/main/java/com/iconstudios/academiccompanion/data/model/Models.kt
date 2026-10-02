package com.iconstudios.academiccompanion.data.model

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Domain models mirroring packages/shared/src/index.ts and the API response
 * shapes returned by ICON Academic Studio.
 *
 * Only fields the companion actually consumes are modelled — responses are
 * intentionally minimal (see Phase 9.1.1 data-minimisation guarantees).
 */

@Serializable
data class HealthResponse(
    val status: String,
    val service: String? = null,
    val timestamp: String? = null,
)

@Serializable
data class ProjectListResponse(
    val success: Boolean,
    val data: List<ProjectDto> = emptyList(),
    val meta: ProjectListMeta? = null,
)

@Serializable
data class ProjectListMeta(
    val page: Int = 1,
    val limit: Int = 20,
    val total: Long = 0,
    val totalPages: Int = 1,
)

@Serializable
data class ProjectDto(
    val id: String,
    val name: String,
    val description: String? = null,
    val type: String,
    val status: String = "DRAFT",
    @SerialName("createdAt") val createdAt: String? = null,
    @SerialName("updatedAt") val updatedAt: String? = null,
    @SerialName("_count") val counts: ProjectCounts? = null,
)

@Serializable
data class ProjectCounts(
    val sources: Int = 0,
    val documents: Int = 0,
    val datasets: Int = 0,
    @SerialName("researchNotes") val researchNotes: Int = 0,
    @SerialName("academicProjects") val academicProjects: Int = 0,
    @SerialName("publications") val publications: Int = 0,
    @SerialName("aiGenerations") val aiGenerations: Int = 0,
)

@Serializable
data class AcademicDashboardDto(
    val success: Boolean,
    val data: AcademicDashboard? = null,
)

@Serializable
data class AcademicDashboard(
    val title: String,
    @SerialName("projectType") val projectType: String? = null,
    val status: String? = null,
    val progress: DashboardProgress? = null,
    @SerialName("wordCount") val wordCount: Long = 0,
    val counts: Map<String, Long> = emptyMap(),
    @SerialName("unresolvedReviewItems") val unresolvedReviewItems: Int = 0,
    @SerialName("lastUpdated") val lastUpdated: String? = null,
)

@Serializable
data class DashboardProgress(
    val completion: Int = 0,
    @SerialName("chaptersWithContent") val chaptersWithContent: Int = 0,
    @SerialName("totalChapters") val totalChapters: Int = 0,
)

@Serializable
data class ActivityResponse(
    val success: Boolean,
    val data: List<ActivityEventDto> = emptyList(),
    val meta: ActivityMeta? = null,
)

@Serializable
data class ActivityMeta(
    val total: Long = 0,
    val page: Int = 1,
    val totalPages: Int = 1,
)

/**
 * Minimised activity event. The API never returns userId, changes,
 * ipAddress or userAgent — those are excluded server-side (Phase 9.1.1),
 * so they are deliberately absent here.
 */
@Serializable
data class ActivityEventDto(
    val id: String,
    val action: String,
    @SerialName("entityType") val entityType: String,
    @SerialName("entityId") val entityId: String? = null,
    val description: String? = null,
    @SerialName("createdAt") val createdAt: String,
)

@Serializable
data class NextActionResponse(
    val success: Boolean,
    val data: NextActionDto? = null,
)

@Serializable
data class NextActionDto(
    val action: String,
    val description: String? = null,
    val reason: String? = null,
    val category: String? = null,
)

@Serializable
data class NoteListResponse(
    val success: Boolean,
    val data: List<NoteDto> = emptyList(),
)

@Serializable
data class NoteDto(
    val id: String,
    @SerialName("projectId") val projectId: String,
    val title: String,
    val content: String = "",
    val tags: String = "[]",
    @SerialName("createdAt") val createdAt: String? = null,
    @SerialName("updatedAt") val updatedAt: String? = null,
)

@Serializable
data class CreateNoteRequest(
    @SerialName("projectId") val projectId: String,
    val title: String,
    val content: String,
    val tags: List<String> = emptyList(),
    @SerialName("clientId") val clientId: String,
)

/** Generic API error envelope. */
@Serializable
data class ApiErrorResponse(
    val success: Boolean = false,
    val error: ApiError? = null,
)

@Serializable
data class ApiError(
    val code: String? = null,
    val message: String? = null,
)
