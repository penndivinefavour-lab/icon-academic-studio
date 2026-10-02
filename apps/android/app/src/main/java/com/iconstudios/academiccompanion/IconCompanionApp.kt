package com.iconstudios.academiccompanion

import android.app.Application
import com.iconstudios.academiccompanion.sync.SyncEnqueuer

/**
 * Application entry point. Holds the manual [AppContainer] so ViewModels can
 * reach repositories without a DI framework.
 */
class IconCompanionApp : Application() {

    val container: AppContainer by lazy { AppContainer(this) }

    override fun onCreate() {
        super.onCreate()
        // Give any captures queued while the app was closed a chance to sync.
        SyncEnqueuer.enqueueCaptureSync(this)
    }
}
