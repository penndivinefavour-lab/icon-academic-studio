package com.iconstudios.academiccompanion.sync

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.iconstudios.academiccompanion.IconCompanionApp

/**
 * Drains the pending capture outbox. Runs only when the device has network
 * connectivity. Because POST is idempotent by `clientId`, retries are safe
 * and cannot create duplicates.
 */
class CaptureSyncWorker(
    appContext: Context,
    params: WorkerParameters,
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result {
        val container = (applicationContext as IconCompanionApp).container
        val api = container.apiSnapshot()

        val pending = container.captureRepository.pending()
        if (pending.isEmpty()) return Result.success()

        var allSucceeded = true
        for (capture in pending) {
            if (!container.captureRepository.pushCaptureWith(api, capture)) {
                allSucceeded = false
            }
        }

        return if (allSucceeded) Result.success() else Result.retry()
    }

    companion object {
        const val WORK_NAME = "capture-sync"
    }
}
