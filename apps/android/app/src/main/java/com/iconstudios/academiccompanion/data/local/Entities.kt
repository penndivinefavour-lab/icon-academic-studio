package com.iconstudios.academiccompanion.data.local

import androidx.room.ColumnInfo
import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * Room entities backing the offline cache. Only data the API already returns
 * (in minimised form) is ever stored here.
 */

@Entity(tableName = "projects")
data class ProjectEntity(
    @PrimaryKey val id: String,
    val name: String,
    val description: String?,
    val type: String,
    val status: String,
    @ColumnInfo(name = "source_count") val sourceCount: Int = 0,
    @ColumnInfo(name = "document_count") val documentCount: Int = 0,
    @ColumnInfo(name = "dataset_count") val datasetCount: Int = 0,
    @ColumnInfo(name = "note_count") val noteCount: Int = 0,
    @ColumnInfo(name = "created_at") val createdAt: Long = 0,
    @ColumnInfo(name = "updated_at") val updatedAt: Long = 0,
    @ColumnInfo(name = "cached_at") val cachedAt: Long = System.currentTimeMillis(),
)

@Entity(
    tableName = "activity_events",
    indices = [Index("project_id"), Index(value = ["project_id", "created_at_ms"])],
)
data class ActivityEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "project_id") val projectId: String,
    val action: String,
    @ColumnInfo(name = "entity_type") val entityType: String,
    @ColumnInfo(name = "entity_id") val entityId: String?,
    val description: String?,
    @ColumnInfo(name = "created_at_ms") val createdAtMs: Long,
)

@Entity(tableName = "next_actions")
data class NextActionEntity(
    @PrimaryKey @ColumnInfo(name = "project_id") val projectId: String,
    val action: String,
    val description: String?,
    val reason: String?,
    val category: String?,
    /** Epoch millis when this snapshot was fetched. Used to label staleness. */
    @ColumnInfo(name = "cached_at") val cachedAt: Long,
)

/**
 * Sync state for a locally captured item:
 * PENDING_SYNC → (WorkManager) → SYNCED, or SYNC_FAILED after repeated errors.
 */
@Entity(tableName = "captures")
data class CaptureEntity(
    @PrimaryKey val clientId: String,
    @ColumnInfo(name = "project_id") val projectId: String,
    val title: String,
    val content: String,
    @ColumnInfo(name = "created_at") val createdAt: Long,
    @ColumnInfo(name = "sync_state") val syncState: String,
    @ColumnInfo(name = "server_id") val serverId: String? = null,
    @ColumnInfo(name = "last_attempt_at") val lastAttemptAt: Long = 0,
    @ColumnInfo(name = "attempt_count") val attemptCount: Int = 0,
) {
    companion object {
        const val STATE_PENDING = "PENDING_SYNC"
        const val STATE_SYNCED = "SYNCED"
        const val STATE_FAILED = "SYNC_FAILED"
    }
}

object SyncState {
    const val PENDING = "PENDING_SYNC"
    const val SYNCED = "SYNCED"
    const val FAILED = "SYNC_FAILED"
}
