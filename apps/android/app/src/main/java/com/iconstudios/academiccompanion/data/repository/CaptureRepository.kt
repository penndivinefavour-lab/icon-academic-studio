package com.iconstudios.academiccompanion.data.repository

import com.iconstudios.academiccompanion.data.local.CaptureDao
import com.iconstudios.academiccompanion.data.local.CaptureEntity
import com.iconstudios.academiccompanion.data.local.SyncState
import com.iconstudios.academiccompanion.data.model.CreateNoteRequest
import com.iconstudios.academiccompanion.data.remote.ApiProvider
import java.util.UUID

/**
 * Offline-first capture. Every capture is written to Room *before* any
 * network attempt, so nothing is ever silently lost. The WorkManager worker
 * drains [SyncState.PENDING] items later.
 */
class CaptureRepository(
    private val captureDao: CaptureDao,
    private val apiProvider: ApiProvider,
) {

    fun observeAll() = captureDao.observeAll()

    fun observeForProject(projectId: String) = captureDao.observeForProject(projectId)

    fun observePendingCount() = captureDao.observeStateCount(SyncState.PENDING)

    /**
     * Captures immediately. Returns the local [CaptureEntity]; sync happens later.
     * @param projectId may be blank for unscoped captures.
     */
    suspend fun capture(title: String, content: String, projectId: String): CaptureEntity {
        val entity = CaptureEntity(
            clientId = UUID.randomUUID().toString(),
            projectId = projectId.ifBlank { UNPROJECTED },
            title = title.trim(),
            content = content.trim(),
            createdAt = System.currentTimeMillis(),
            syncState = SyncState.PENDING,
        )
        captureDao.upsert(entity)
        return entity
    }

    suspend fun retry(clientId: String) = captureDao.setState(clientId, SyncState.PENDING)

    suspend fun delete(clientId: String) = captureDao.delete(clientId)

    suspend fun pending(): List<CaptureEntity> = captureDao.getByState(SyncState.PENDING)

    /**
     * Pushes a single capture. Safe to retry: [CreateNoteRequest.clientId] is
     * the idempotency key, so a replay returns the original record.
     * @return true when the item is (or already was) synchronised.
     */
    suspend fun pushCapture(capture: CaptureEntity): Boolean {
        return try {
            pushCaptureWith(apiProvider.api(), capture)
        } catch (_: Throwable) {
            captureDao.markFailed(capture.clientId)
            false
        }
    }

    /** Pushes using an explicit client (used by the sync worker). */
    suspend fun pushCaptureWith(api: com.iconstudios.academiccompanion.data.remote.StudioApi, capture: CaptureEntity): Boolean {
        return try {
            val request = CreateNoteRequest(
                projectId = capture.projectId,
                title = capture.title,
                content = capture.content,
                clientId = capture.clientId,
            )
            val response = api.createNote(request)
            val serverId = response.data.firstOrNull()?.id
            if (serverId != null) {
                captureDao.markSynced(capture.clientId, serverId)
                true
            } else {
                captureDao.markFailed(capture.clientId)
                false
            }
        } catch (_: Throwable) {
            captureDao.markFailed(capture.clientId)
            false
        }
    }

    companion object {
        /** Bucket for captures the user made without choosing a project. */
        const val UNPROJECTED = "__unprojected__"
    }
}
