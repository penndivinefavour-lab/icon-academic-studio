package com.iconstudios.academiccompanion.data.repository

import com.iconstudios.academiccompanion.data.local.ActivityDao
import com.iconstudios.academiccompanion.data.local.ActivityEntity
import com.iconstudios.academiccompanion.data.local.NextActionDao
import com.iconstudios.academiccompanion.data.local.NextActionEntity
import com.iconstudios.academiccompanion.data.local.ProjectDao
import com.iconstudios.academiccompanion.data.local.ProjectEntity
import com.iconstudios.academiccompanion.data.model.AcademicDashboard
import com.iconstudios.academiccompanion.data.model.ProjectDto
import com.iconstudios.academiccompanion.data.remote.ApiProvider

/**
 * Single source of truth for project/activity/next-action data.
 *
 * Cache-first: Room is always the rendering source; the network refresh is
 * best-effort and never blocks the UI. This is what keeps the companion
 * usable when the workstation is unreachable.
 */
class StudioRepository(
    private val apiProvider: ApiProvider,
    private val projectDao: ProjectDao,
    private val activityDao: ActivityDao,
    private val nextActionDao: NextActionDao,
) {

    // --------------------------------------------------------------- projects
    suspend fun refreshProjects(): Result<Unit> = runCatching {
        val response = apiProvider.api().listProjects()
        if (response.success) {
            projectDao.upsertAll(response.data.map { it.toEntity() })
        }
    }

    suspend fun refreshProject(id: String): Result<Unit> = runCatching {
        val response = apiProvider.api().getProject(id)
        if (response.success) {
            response.data.firstOrNull()?.let { projectDao.upsertAll(listOf(it.toEntity())) }
        }
    }

    fun observeProjects() = projectDao.observeProjects()

    fun searchProjects(query: String) =
        if (query.isBlank()) projectDao.observeProjects() else projectDao.searchProjects(query)

    suspend fun getCachedProject(id: String) = projectDao.getProject(id)

    // --------------------------------------------------------------- activity
    suspend fun refreshActivity(projectId: String, limit: Int = 20, offset: Int = 0): Result<Unit> = runCatching {
        val response = apiProvider.api().getActivity(projectId, limit, offset)
        if (response.success) {
            val events = response.data.map { it.toEntity(projectId) }
            if (offset == 0) activityDao.clearForProject(projectId)
            activityDao.upsertAll(events)
        }
    }

    fun observeActivity(projectId: String) = activityDao.observeActivity(projectId)

    suspend fun getCachedActivityPage(projectId: String, limit: Int, offset: Int) =
        activityDao.getPage(projectId, limit, offset)

    // ------------------------------------------------------------- next action
    /**
     * Fetches the deterministic next action and caches it with a timestamp so
     * the UI can label stale results honestly when offline.
     */
    suspend fun refreshNextAction(projectId: String): Result<Unit> = runCatching {
        val response = apiProvider.api().getNextAction(projectId)
        val data = response.data
        if (response.success && data != null) {
            nextActionDao.upsert(
                NextActionEntity(
                    projectId = projectId,
                    action = data.action,
                    description = data.description,
                    reason = data.reason,
                    category = data.category,
                    cachedAt = System.currentTimeMillis(),
                ),
            )
        }
    }

    fun observeNextAction(projectId: String) = nextActionDao.observeNextAction(projectId)

    // --------------------------------------------------------------- dashboard
    suspend fun fetchDashboard(projectId: String): Result<AcademicDashboard> = runCatching {
        apiProvider.api().getAcademicDashboard(projectId).data
            ?: throw IllegalStateException("No dashboard")
    }

    // ----------------------------------------------------------------- mapping
    private fun ProjectDto.toEntity(): ProjectEntity = ProjectEntity(
        id = id,
        name = name,
        description = description,
        type = type,
        status = status,
        sourceCount = counts?.sources ?: 0,
        documentCount = counts?.documents ?: 0,
        datasetCount = counts?.datasets ?: 0,
        noteCount = counts?.researchNotes ?: 0,
        createdAt = ApiMappers.parseEpochMillis(createdAt),
        updatedAt = ApiMappers.parseEpochMillis(updatedAt),
        cachedAt = System.currentTimeMillis(),
    )

    private fun com.iconstudios.academiccompanion.data.model.ActivityEventDto.toEntity(projectId: String) =
        ActivityEntity(
            id = id,
            projectId = projectId,
            action = action,
            entityType = entityType,
            entityId = entityId,
            description = description,
            createdAtMs = ApiMappers.parseEpochMillis(createdAt),
        )
}
