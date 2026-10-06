package com.iconstudios.academiccompanion.ui

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Guards the navigation-route construction that crashed v0.1.1-alpha on the
 * physical device: tapping a project built the target by interpolating the
 * *route template* (`"command-center/{projectId}"`) instead of its
 * argument-free prefix, yielding `"command-center/{projectId}/<id>"`. That
 * matches no NavHost destination, so NavController.navigate() threw
 * IllegalArgumentException on the main thread and the app closed before the
 * Project Details screen rendered.
 *
 * These tests pin the two invariants that must hold for the destination to
 * resolve, without depending on the Android framework.
 */
class RoutesTest {

    @Test
    fun commandCenter_isArgumentTemplate_notANavigationTarget() {
        // The registered destination pattern: one argument placeholder.
        assertEquals("command-center/{projectId}", Routes.COMMAND_CENTER)
        // A template containing '{' is a destination *pattern*, not a concrete
        // route. Interpolating it into a navigate() target is the crash bug.
        assertTrue(
            "COMMAND_CENTER must stay an argument template",
            Routes.COMMAND_CENTER.contains('{'),
        )
    }

    @Test
    fun commandCenterPrefix_isArgumentFree() {
        // The prefix keeps the trailing slash so `prefix + id` is well-formed.
        assertEquals("command-center/", Routes.COMMAND_CENTER_PREFIX)
        assertFalse(Routes.COMMAND_CENTER_PREFIX.contains('{'))
        assertTrue(Routes.COMMAND_CENTER_PREFIX.endsWith("/"))
    }

    @Test
    fun prefix_isExactlyCommandCenterWithoutItsArgument() {
        // Deriving the prefix from the template must reproduce the constant,
        // so the two can never drift apart.
        val derived = Routes.COMMAND_CENTER.substring(0, Routes.COMMAND_CENTER.indexOf('{'))
        assertEquals(Routes.COMMAND_CENTER_PREFIX, derived)
    }

    @Test
    fun builtTarget_resolvesAgainstRegisteredDestination() {
        // Mirrors NavController's route matching: a target resolves to
        // "command-center/{projectId}" only when it has the same segments and
        // supplies a value for the single argument.
        val target = Routes.COMMAND_CENTER_PREFIX + "test-project-001"
        val pattern = Routes.COMMAND_CENTER

        val targetSegments = target.split("/").filter { it.isNotEmpty() }
        val patternSegments = pattern.split("/").filter { it.isNotEmpty() }

        assertEquals(2, targetSegments.size)
        assertEquals(2, patternSegments.size)
        assertEquals(targetSegments[0], patternSegments[0])
        assertFalse(patternSegments[1].startsWith("{").not())
        // The argument segment must carry the id, not the literal placeholder.
        assertEquals("test-project-001", targetSegments[1])
    }

    @Test
    fun oldBuggyTarget_doesNotResolve() {
        // This is the string the bug produced. It must never resolve.
        val buggy = "${Routes.COMMAND_CENTER}/test-project-001"
        val buggySegments = buggy.split("/").filter { it.isNotEmpty() }
        assertEquals(3, buggySegments.size)
        // 3 segments vs a 2-segment destination => no match => crash.
        assertTrue(buggySegments[1] == "{projectId}")
    }
}
