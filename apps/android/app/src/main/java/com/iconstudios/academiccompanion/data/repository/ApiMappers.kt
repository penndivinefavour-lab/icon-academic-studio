package com.iconstudios.academiccompanion.data.repository

/**
 * Shared mapping helpers so ViewModels never touch raw API strings.
 */
object ApiMappers {

    private val ISO_PATTERN = Regex("""(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})""")

    /** Parses the API ISO timestamp into epoch millis, or 0 when unparseable. */
    fun parseEpochMillis(iso: String?): Long {
        if (iso.isNullOrBlank()) return 0L
        return try {
            val m = ISO_PATTERN.find(iso) ?: return 0L
            val (y, mo, d, h, mi, s) = m.destructured
            // Deterministic UTC conversion without java.time dependency concerns.
            java.util.GregorianCalendar(java.util.TimeZone.getTimeZone("UTC"))
                .apply {
                    set(y.toInt(), mo.toInt() - 1, d.toInt(), h.toInt(), mi.toInt(), s.toInt())
                    set(java.util.Calendar.MILLISECOND, 0)
                }
                .timeInMillis
        } catch (_: Throwable) {
            0L
        }
    }

    /** Turns `SOME_ACTION` into "Some action" for badges. */
    fun prettifyAction(action: String): String =
        action.split('_').joinToString(" ") { it.lowercase() }.replaceFirstChar { it.uppercase() }

    /** Maps an action name to a workflow stage for the pipeline view. */
    fun actionToStage(action: String): String = when {
        action.contains("PROJECT") -> "DISCOVER"
        action.contains("SOURCE") || action.contains("EVIDENCE") || action.contains("CITATION") -> "RESEARCH"
        action.contains("METHODOLOGY") || action.contains("OBJECTIVE") -> "PLAN"
        action.contains("DATASET") || action.contains("ANALYSIS") -> "COLLECT"
        action.contains("FINDING") || action.contains("CHART") -> "ANALYZE"
        action.contains("CHAPTER") || action.contains("CONTENT") || action.contains("ABSTRACT") -> "WRITE"
        action.contains("REVIEW") || action.contains("VERIFY") || action.contains("REJECT") -> "REVIEW"
        action.contains("PUBLICATION") || action.contains("PUBLISH") -> "PUBLISH"
        action.contains("EXPORT") || action.contains("DOCUMENT_SYNC") -> "EXPORT"
        else -> "DISCOVER"
    }
}
