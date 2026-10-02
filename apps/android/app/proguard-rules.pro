# Compose
-dontwarn androidx.compose.**

# Retrofit / OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn retrofit2.**
-keep class retrofit2.** { *; }
-keepclasseswithmembers class * { @retrofit2.http.* <methods>; }

# Kotlinx Serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** { *; }
-keep,includedescriptorclasses class com.iconstudios.academiccompanion.**$$serializer { *; }
-keepclassmembers class com.iconstudios.academiccompanion.** { *** Companion; }
-keepclasseswithmembers class com.iconstudios.academiccompanion.** { kotlinx.serialization.KSerializer serializer(...); }

# Room
-keep class * extends androidx.room.RoomDatabase { *; }
-dontwarn androidx.room.**

# WorkManager
-dontwarn androidx.work.**
