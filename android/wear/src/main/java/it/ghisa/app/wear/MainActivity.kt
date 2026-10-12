package it.ghisa.app.wear

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.navigation.NavType
import androidx.navigation.navArgument
import androidx.wear.compose.navigation.SwipeDismissableNavHost
import androidx.wear.compose.navigation.composable
import androidx.wear.compose.navigation.rememberSwipeDismissableNavController

class MainActivity : ComponentActivity() {

    private val permissions = registerForActivityResult(ActivityResultContracts.RequestMultiplePermissions()) {
        // Con i permessi appena concessi, se c'è un allenamento attivo, riparte il servizio per leggere il cuore.
        if (Repo.sessionStart != 0L) SessionService.start(this)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Repo.init(this)
        setContent { GhisaApp(::ensurePermissions) }
    }

    override fun onResume() {
        super.onResume()
        // Se un allenamento è già in corso, il servizio deve essere attivo (dopo un riavvio dell'app).
        if (Repo.sessionStart != 0L) SessionService.start(this)
    }

    private fun ensurePermissions() {
        val wanted = buildList {
            add(Manifest.permission.BODY_SENSORS)
            add(Manifest.permission.ACTIVITY_RECOGNITION)
            if (Build.VERSION.SDK_INT >= 33) add(Manifest.permission.POST_NOTIFICATIONS)
        }.filter { checkSelfPermission(it) != PackageManager.PERMISSION_GRANTED }
        if (wanted.isNotEmpty()) permissions.launch(wanted.toTypedArray())
    }
}

@Composable
fun GhisaApp(ensurePermissions: () -> Unit) {
    val ui by Repo.ui.collectAsState()
    val nav = rememberSwipeDismissableNavController()
    val entry by nav.currentBackStackEntryFlow.collectAsState(initial = null)
    val route by rememberUpdatedState(entry?.destination?.route)

    // Quando parte un recupero (dall'orologio o dal telefono) si apre il quadrante di recupero.
    LaunchedEffect(ui.rest?.endAt) {
        if (ui.rest != null && route != "rest") nav.navigate("rest")
    }

    // Riaprendo l'app con un allenamento in corso si torna direttamente alla schermata di allenamento.
    LaunchedEffect(Unit) {
        val a = Repo.ui.value.snapshot?.active
        if (a != null && a.isWorkout && Repo.sessionStart != 0L && ui.rest == null) nav.navigate("workout/${a.scheda}")
    }

    SwipeDismissableNavHost(navController = nav, startDestination = "home") {
        composable("home") { HomeScreen(ui, nav, ensurePermissions) }
        composable("workout/{id}", arguments = listOf(navArgument("id") { type = NavType.StringType })) {
            WorkoutScreen(it.arguments?.getString("id").orEmpty(), ui, nav)
        }
        composable("list/{id}", arguments = listOf(navArgument("id") { type = NavType.StringType })) {
            ListScreen(it.arguments?.getString("id").orEmpty(), ui, nav)
        }
        composable("tests/{id}", arguments = listOf(navArgument("id") { type = NavType.StringType })) {
            TestListScreen(it.arguments?.getString("id").orEmpty(), ui, nav)
        }
        composable("attempt/{id}", arguments = listOf(navArgument("id") { type = NavType.StringType })) {
            AttemptScreen(it.arguments?.getString("id").orEmpty(), ui, nav)
        }
        composable("finish") { FinishScreen(ui, nav) }
        composable("rest") { RestScreen(ui, nav) }
    }
}
