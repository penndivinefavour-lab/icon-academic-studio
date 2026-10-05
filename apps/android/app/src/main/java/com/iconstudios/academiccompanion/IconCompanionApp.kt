package com.iconstudios.academiccompanion

import android.app.Application
import androidx.work.Configuration
import com.iconstudios.academiccompanion.sync.SyncEnqueuer

/**
 * Application entry point. Holds the manual [AppContainer] so ViewModels can
 * reach repositories without a DI framework.
 *
 * AndroidManifest removes the default `androidx.work.WorkManagerInitializer`
 * so WorkManager is initialized on demand by the first
 * `WorkManager.getInstance(context)` call. That path requires the Application
 * to supply the configuration via [Configuration.Provider]; without it the
 * very first access throws `IllegalStateException` and kills the process
 * before any Activity is created.
 */
class IconCompanionApp : Application(), Configuration.Provider {

    val container: AppContainer by lazy { AppContainer(this) }

    override val workManagerConfiguration: Configuration
        get() = Configuration.Builder()
            .setMinimumLoggingLevel(android.util.Log.INFO)
            .build()

    override fun onCreate() {
        super.onCreate()
        // Give any captures queued while the app was closed a chance to sync.
        SyncEnqueuer.enqueueCaptureSync(this)
    }
}
