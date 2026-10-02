package com.iconstudios.academiccompanion.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface ProjectDao {

    @Query("SELECT * FROM projects ORDER BY updated_at DESC")
    fun observeProjects(): Flow<List<ProjectEntity>>

    @Query("SELECT * FROM projects WHERE id = :id")
    suspend fun getProject(id: String): ProjectEntity?

    @Query("SELECT * FROM projects WHERE name LIKE '%' || :query || '%' ORDER BY updated_at DESC")
    fun searchProjects(query: String): Flow<List<ProjectEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(projects: List<ProjectEntity>)

    @Query("DELETE FROM projects")
    suspend fun clear()

    @Query("SELECT COUNT(*) FROM projects")
    suspend fun count(): Int
}

@Dao
interface ActivityDao {

    @Query("SELECT * FROM activity_events WHERE project_id = :projectId ORDER BY created_at_ms DESC")
    fun observeActivity(projectId: String): Flow<List<ActivityEntity>>

    @Query("SELECT * FROM activity_events WHERE project_id = :projectId ORDER BY created_at_ms DESC LIMIT :limit OFFSET :offset")
    suspend fun getPage(projectId: String, limit: Int, offset: Int): List<ActivityEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(events: List<ActivityEntity>)

    @Query("DELETE FROM activity_events WHERE project_id = :projectId")
    suspend fun clearForProject(projectId: String)

    @Query("SELECT COUNT(*) FROM activity_events WHERE project_id = :projectId")
    suspend fun countForProject(projectId: String): Int
}

@Dao
interface NextActionDao {

    @Query("SELECT * FROM next_actions WHERE project_id = :projectId")
    fun observeNextAction(projectId: String): Flow<NextActionEntity?>

    @Query("SELECT * FROM next_actions WHERE project_id = :projectId")
    suspend fun getNextAction(projectId: String): NextActionEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(action: NextActionEntity)

    @Query("DELETE FROM next_actions WHERE project_id = :projectId")
    suspend fun clearForProject(projectId: String)
}

@Dao
interface CaptureDao {

    @Query("SELECT * FROM captures ORDER BY created_at DESC")
    fun observeAll(): Flow<List<CaptureEntity>>

    @Query("SELECT * FROM captures WHERE project_id = :projectId ORDER BY created_at DESC")
    fun observeForProject(projectId: String): Flow<List<CaptureEntity>>

    @Query("SELECT * FROM captures WHERE sync_state = :state ORDER BY created_at ASC")
    suspend fun getByState(state: String): List<CaptureEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(capture: CaptureEntity)

    @Query("UPDATE captures SET sync_state = :state, server_id = :serverId, last_attempt_at = :attemptAt WHERE client_id = :clientId")
    suspend fun markSynced(clientId: String, serverId: String, state: String = SyncState.SYNCED, attemptAt: Long = System.currentTimeMillis())

    @Query("UPDATE captures SET sync_state = :state, last_attempt_at = :attemptAt, attempt_count = attempt_count + 1 WHERE client_id = :clientId")
    suspend fun markFailed(clientId: String, state: String = SyncState.FAILED, attemptAt: Long = System.currentTimeMillis())

    @Query("UPDATE captures SET sync_state = :state WHERE client_id = :clientId")
    suspend fun setState(clientId: String, state: String)

    @Query("SELECT COUNT(*) FROM captures WHERE sync_state = :state")
    fun observeStateCount(state: String): Flow<Int>

    @Query("DELETE FROM captures WHERE client_id = :clientId")
    suspend fun delete(clientId: String)
}
