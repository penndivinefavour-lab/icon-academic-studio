package com.iconstudios.academiccompanion.sync

import android.content.Context
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager

/**
 * Thin facade over WorkManager so ViewModels don't depend on the WorkManager
 * API directly. Enqueues the outbox drain on demand (after a capture or an
 * app start), with a connectivity constraint.
 *
 * Note: NetworkType.UNMETERED is intentionally NOT used — a trusted LAN/Wi-Fi
 * link is the expected path and is usually metered-free, but the user decides.
 */
object SyncEnqueuer {

    fun enqueueCaptureSync(context: Context) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val request = OneTimeWorkRequestBuilder<CaptureSyncWorker>()
            .setConstraints(constraints)
            .build()

        WorkManager.getInstance(context).enqueueUniqueWork(
            CaptureSyncWorker.WORK_NAME,
            // KEEP: don't cancel an in-flight drain; it will pick up the new item.
            ExistingWorkPolicy.KEEP,
            request,
        )
    }
}
