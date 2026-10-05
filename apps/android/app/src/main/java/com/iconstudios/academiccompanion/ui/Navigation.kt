package com.iconstudios.academiccompanion.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.List
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.BottomAppBar
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Divider
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.iconstudios.academiccompanion.AppContainer
import com.iconstudios.academiccompanion.ui.activity.ActivityScreen
import com.iconstudios.academiccompanion.ui.activity.ActivityViewModel
import com.iconstudios.academiccompanion.ui.capture.CaptureScreen
import com.iconstudios.academiccompanion.ui.capture.CaptureViewModel
import com.iconstudios.academiccompanion.ui.commandcenter.CommandCenterScreen
import com.iconstudios.academiccompanion.ui.commandcenter.CommandCenterViewModel
import com.iconstudios.academiccompanion.ui.HomeScreen
import com.iconstudios.academiccompanion.ui.HomeViewModel
import com.iconstudios.academiccompanion.ui.ProjectsScreen
import com.iconstudios.academiccompanion.ui.projects.ProjectsViewModel
import com.iconstudios.academiccompanion.ui.settings.SettingsScreen
import com.iconstudios.academiccompanion.ui.settings.SettingsViewModel
import com.iconstudios.academiccompanion.ui.theme.IconNavy

/** All routes known to the app. Must stay in sync with BottomNavItem. */
object Routes {
    const val HOME = "home"
    const val PROJECTS = "projects"
    const val CAPTURE = "capture"
    const val ACTIVITY = "activity/{projectId}"
    const val COMMAND_CENTER = "command-center/{projectId}"
    const val SETTINGS = "settings"
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NavigationShell(container: AppContainer) {
    val navController = rememberNavController()
    val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route

    Scaffold(
        topBar = { Header(currentRoute ?: Routes.HOME) },
        bottomBar = { BottomNavBar(navController, currentRoute ?: Routes.HOME) },
    ) { inner ->
        NavHost(
            navController = navController,
            startDestination = Routes.HOME,
            modifier = Modifier.fillMaxSize().padding(inner),
        ) {
            composable(Routes.HOME) { HomeScreen(viewModel = viewModel { HomeViewModel(container.studioRepository, container.connectionRepository) }, onProjectClick = { id -> navController.navigate("${Routes.COMMAND_CENTER}/$id") }) }
            composable(Routes.PROJECTS) { ProjectsScreen(viewModel = viewModel { ProjectsViewModel(container.studioRepository) }, onProjectClick = { id -> navController.navigate("${Routes.COMMAND_CENTER}/$id") }) }
            composable(Routes.CAPTURE) { CaptureScreen(viewModel = viewModel { CaptureViewModel(container.captureRepository, container.studioRepository, container.appContext) }) }
            composable(
                route = Routes.ACTIVITY,
                arguments = listOf(navArgument("projectId") { type = NavType.StringType; nullable = true; defaultValue = null }),
            ) { backStackEntry ->
                val projectId = backStackEntry.arguments?.getString("projectId")
                ActivityScreen(projectId = projectId, viewModel = viewModel { ActivityViewModel(container.studioRepository) })
            }
            composable("command-center/{projectId}") { backStackEntry ->
                val projectId = backStackEntry.arguments?.getString("projectId") ?: ""
                CommandCenterScreen(projectId = projectId, viewModel = viewModel { CommandCenterViewModel(container.studioRepository) }, onShowActivity = {})
            }
            composable(Routes.SETTINGS) { SettingsScreen(viewModel = viewModel { SettingsViewModel(container.connectionPrefs, container.connectionRepository) }) }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun Header(route: String) {
    TopAppBar(
        title = {
            Text(
                text = when {
                    route.startsWith("command-center") -> "Project"
                    route == Routes.PROJECTS -> "Projects"
                    route == Routes.ACTIVITY -> "Activity"
                    route == Routes.CAPTURE -> "Capture"
                    route == Routes.SETTINGS -> "Settings"
                    else -> "ICON Academic"
                },
                fontWeight = FontWeight.Bold,
                color = IconNavy,
            )
        },
        colors = TopAppBarDefaults.topAppBarColors(containerColor = MaterialTheme.colorScheme.surface),
    )
}

private data class NavBarRoute(val label: String, val icon: ImageVector, val screenRoute: String)
private val SCREENS = listOf(
    NavBarRoute("Home", Icons.Default.Home, Routes.HOME),
    NavBarRoute("Projects", Icons.Default.List, Routes.PROJECTS),
    NavBarRoute("Capture", Icons.Default.Add, Routes.CAPTURE),
    NavBarRoute("Activity", Icons.Default.History, Routes.ACTIVITY),
    NavBarRoute("Settings", Icons.Default.Settings, Routes.SETTINGS),
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BottomNavBar(navController: NavHostController, currentRoute: String) {
    BottomAppBar(containerColor = MaterialTheme.colorScheme.surface) {
        Row(horizontalArrangement = Arrangement.SpaceEvenly, modifier = Modifier.fillMaxWidth()) {
            SCREENS.forEach { s ->
                val selected = currentRoute == s.screenRoute || (s.screenRoute == Routes.HOME && currentRoute.isNullOrBlank())
                NavigationBarItem(
                    selected = selected,
                    icon = { Icon(s.icon, contentDescription = s.label) },
                    label = { Text(s.label, maxLines = 1) },
                    onClick = {
                        navController.navigate(s.screenRoute) {
                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                            launchSingleTop = true
                        }
                    },
                )
            }
        }
    }
}
