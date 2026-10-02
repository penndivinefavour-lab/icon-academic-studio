package com.iconstudios.academiccompanion.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [
        ProjectEntity::class,
        ActivityEntity::class,
        NextActionEntity::class,
        CaptureEntity::class,
    ],
    version = 1,
    exportSchema = false,
)
abstract class CompanionDatabase : RoomDatabase() {
    abstract fun projectDao(): ProjectDao
    abstract fun activityDao(): ActivityDao
    abstract fun nextActionDao(): NextActionDao
    abstract fun captureDao(): CaptureDao

    companion object {
        @Volatile private var INSTANCE: CompanionDatabase? = null

        fun get(context: Context): CompanionDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    CompanionDatabase::class.java,
                    "icon-companion.db",
                ).fallbackToDestructiveMigration().build().also { INSTANCE = it }
            }
        }
    }
}
