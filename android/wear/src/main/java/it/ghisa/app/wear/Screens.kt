package it.ghisa.app.wear

import android.content.Context
import android.os.VibrationEffect
import android.os.VibratorManager
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.ExperimentalComposeUiApi
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.input.rotary.onRotaryScrollEvent
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavHostController
import androidx.wear.compose.foundation.lazy.ScalingLazyColumn
import androidx.wear.compose.foundation.lazy.rememberScalingLazyListState
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun rememberNow(periodMs: Long = 250): State<Long> =
    produceState(System.currentTimeMillis()) {
        while (true) {
            value = System.currentTimeMillis()
            delay(periodMs)
        }
    }

private fun tick(ctx: Context, ms: Long = 28) {
    runCatching {
        ctx.getSystemService(VibratorManager::class.java).defaultVibrator
            .vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
    }
}

/** Esercizio da mostrare quando si torna alla schermata allenamento (scelto dall'elenco). */
object Jump {
    var exId by androidx.compose.runtime.mutableStateOf<String?>(null)
}

private fun Active?.setsOf(e: Ex): List<SetRec?> =
    (this?.sets?.get(e.id).orEmpty() + List(e.sets) { null }).take(e.sets)

private fun Active?.firstOpen(e: Ex): Int = setsOf(e).indexOfFirst { it == null }

// =============================================================================================
// HOME
// =============================================================================================

@Composable
fun HomeScreen(ui: UiState, nav: NavHostController, ensurePermissions: () -> Unit) {
    val ctx = LocalContext.current
    val snap = ui.snapshot
    val listState = rememberScalingLazyListState()
    ScalingLazyColumn(
        modifier = Modifier.fillMaxSize().background(C.floor),
        state = listState,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
        contentPadding = PaddingValues(top = 30.dp, bottom = 34.dp, start = 12.dp, end = 12.dp),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Bars()
                T("GHISA", 20.sp, weight = FontWeight.ExtraBold, family = Display, spacing = 1.sp)
            }
        }
        if (snap == null) {
            item {
                Column(Modifier.padding(top = 6.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    T("Apri GHISA sul telefono per sincronizzare", 13.sp, C.chalk2)
                    Spacer(Modifier.height(4.dp))
                    Mono("serve la prima volta", size = 8.sp)
                }
            }
            return@ScalingLazyColumn
        }

        val a = snap.active
        item {
            val status = if (snap.phase == "test") "Fase test · ${snap.doneRm}/${snap.totalEx} RM" else "Fase 1"
            Mono(status, color = C.chalk2)
        }
        if (ui.pending > 0) item { Mono("↻ ${ui.pending} da sincronizzare", color = C.yellow, size = 8.sp) }

        // Azione principale
        item {
            val target = a?.scheda ?: snap.next
            val sc = snap.scheda(target)
            val color = C.scheda(target)
            val (label, sub) = when {
                a != null && a.isWorkout -> "Riprendi" to "Workout ${sc?.workout ?: ""} · in corso"
                a != null -> "Riprendi test" to "Scheda ${a.scheda}"
                snap.phase == "test" -> "Test scheda $target" to "${sc?.exercises?.count { it.rm != null } ?: 0}/${sc?.exercises?.size ?: 0} RM"
                else -> "Allenati · $target" to "Workout ${sc?.workout ?: ""} · ${sc?.totalSets ?: 0} serie"
            }
            Tappable(onTap = {
                when {
                    a != null && a.isWorkout -> { ensurePermissions(); Controller.startWorkout(ctx, a.scheda); nav.navigate("workout/${a.scheda}") }
                    a != null -> nav.navigate("tests/${a.scheda}")
                    snap.phase == "test" -> nav.navigate("tests/$target")
                    else -> { ensurePermissions(); Controller.startWorkout(ctx, target); nav.navigate("workout/$target") }
                }
            }) {
                Column(
                    Modifier.fillMaxWidth().clip(RoundedCornerShape(26.dp)).background(color).padding(vertical = 10.dp, horizontal = 12.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    T(label.uppercase(), 19.sp, C.ink(target), FontWeight.ExtraBold, Display, maxLines = 1)
                    Mono(sub, color = C.ink(target).copy(alpha = 0.75f), size = 8.sp)
                }
            }
        }

        // Altre schede
        item {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Mono(if (snap.phase == "test") "Test scheda" else "Altra scheda", size = 8.sp, color = C.chalk3)
                Spacer(Modifier.height(4.dp))
                SchedaRow { id ->
                    if (snap.phase == "test") nav.navigate("tests/$id")
                    else { ensurePermissions(); Controller.startWorkout(ctx, id); nav.navigate("workout/$id") }
                }
            }
        }
        if (snap.phase == "fase1") {
            item {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Mono("Test RM", size = 8.sp, color = C.chalk3)
                    Spacer(Modifier.height(4.dp))
                    SchedaRow { id -> nav.navigate("tests/$id") }
                }
            }
        }
    }
}

@Composable
private fun SchedaRow(onPick: (String) -> Unit) {
    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        listOf("A", "B", "C", "D").forEach { id ->
            Tappable(onTap = { onPick(id) }) {
                Box(Modifier.size(36.dp).clip(CircleShape).background(C.scheda(id)), contentAlignment = Alignment.Center) {
                    Num(id, 20.sp, C.ink(id))
                }
            }
        }
    }
}

// =============================================================================================
// WORKOUT
// =============================================================================================

@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun WorkoutScreen(sid: String, ui: UiState, nav: NavHostController) {
    val ctx = LocalContext.current
    val snap = ui.snapshot ?: return
    val sc = snap.scheda(sid) ?: return
    val a = snap.active?.takeIf { it.isWorkout && it.scheda == sid }
    val accent = C.scheda(sid)
    val ink = C.ink(sid)
    val scope = rememberCoroutineScope()
    val now by rememberNow(500)

    var idx by rememberSaveable {
        mutableIntStateOf(sc.exercises.indexOfFirst { e -> a.firstOpen(e) >= 0 }.coerceAtLeast(0))
    }
    idx = idx.coerceIn(0, sc.exercises.lastIndex)
    val ex = sc.exercises[idx]
    val sets = a.setsOf(ex)
    val nextOpen = sets.indexOfFirst { it == null }
    val exDone = nextOpen < 0
    val allDone = a != null && snap.setsDone(a, sc) >= sc.totalSets

    LaunchedEffect(Jump.exId) {
        val target = Jump.exId ?: return@LaunchedEffect
        sc.exercises.indexOfFirst { it.id == target }.takeIf { it >= 0 }?.let { idx = it }
        Jump.exId = null
    }

    // Tutte le serie fatte: si apre il riepilogo.
    LaunchedEffect(allDone) {
        if (allDone) {
            delay(700)
            nav.navigate("finish")
        }
    }

    val focus = remember { FocusRequester() }
    var rotary by remember { mutableDoubleStateOf(0.0) }
    KeepFocus(focus)

    fun advance() {
        val n = sc.exercises.indexOfFirst { it.n > ex.n && a.firstOpen(it) >= 0 }
        if (n >= 0) idx = n else if (idx < sc.exercises.lastIndex) idx++
    }

    fun doSet(i: Int) {
        if (ex.kg == null) return
        if (Controller.setDone(ctx, ex, i)) {
            tick(ctx, 35)
            val wasLast = sets.count { it == null } == 1
            if (wasLast) scope.launch { delay(550); advance() }
        }
    }

    Box(
        Modifier.fillMaxSize().background(C.floor)
            .onRotaryScrollEvent { e ->
                rotary += e.verticalScrollPixels
                if (rotary > 70) { rotary = 0.0; if (idx < sc.exercises.lastIndex) idx++; tick(ctx, 12) }
                else if (rotary < -70) { rotary = 0.0; if (idx > 0) idx--; tick(ctx, 12) }
                true
            }
            .focusRequester(focus).focusable(),
    ) {
        Column(
            Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            // Stato: elenco · cuore · cronometro / recupero
            Tappable(onTap = { nav.navigate("list/$sid") }) {
                val rest = ui.rest
                val left = rest?.let { (it.endAt - now) / 1000 } ?: 0
                val parts = buildList {
                    add("≡")
                    if (ui.hr.bpm > 0) add("♥ ${ui.hr.bpm}")
                    if (rest != null && left > 0) add("REC ${fmtClock(left)}")
                    else if (a != null) add(fmtElapsed(now - a.startedAt))
                }
                Mono(parts.joinToString("  "), color = if (rest != null && left > 0) accent else C.chalk2, size = 9.sp,
                    modifier = Modifier.padding(top = 14.dp, bottom = 2.dp))
            }

            // Nome esercizio con frecce
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Tappable(onTap = { if (idx > 0) idx-- }, modifier = Modifier.size(24.dp)) { T("‹", 22.sp, if (idx > 0) C.chalk else C.s3) }
                T(
                    ex.name, 13.sp, C.chalk, FontWeight.SemiBold, maxLines = 2, lineHeight = 14.sp,
                    modifier = Modifier.weight(1f).padding(horizontal = 2.dp),
                )
                Tappable(onTap = { if (idx < sc.exercises.lastIndex) idx++ }, modifier = Modifier.size(24.dp)) {
                    T("›", 22.sp, if (idx < sc.exercises.lastIndex) C.chalk else C.s3)
                }
            }

            // Carico e schema
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                if (ex.kg != null) {
                    Row(verticalAlignment = Alignment.Bottom) {
                        Num(fmtKg(ex.kg), 44.sp)
                        T(" kg", 15.sp, C.chalk2, FontWeight.Bold, Display, modifier = Modifier.padding(bottom = 5.dp))
                    }
                } else {
                    T("Imposta il carico sul telefono", 12.sp, C.yellow, maxLines = 2)
                }
                Mono("${ex.sets}×${ex.reps}  ·  ${ex.n}/${sc.exercises.size}", size = 9.sp)
            }

            // Serie
            Row(horizontalArrangement = Arrangement.spacedBy(if (ex.sets > 4) 4.dp else 7.dp), verticalAlignment = Alignment.CenterVertically) {
                sets.forEachIndexed { i, rec ->
                    SetDot(
                        index = i, rec = rec, isNext = i == nextOpen, accent = accent, ink = ink,
                        size = if (ex.sets > 4) 30.dp else 36.dp,
                        onTap = { if (rec == null) doSet(i) },
                        onLong = { if (rec != null) { Controller.undoSet(ex, i); tick(ctx, 60) } },
                    )
                }
            }

            // Azione principale
            Pill(
                label = if (exDone) (if (idx < sc.exercises.lastIndex) "Avanti ›" else "Riepilogo") else "Fatta · serie ${nextOpen + 1}",
                fill = if (exDone) C.s3 else accent,
                ink = if (exDone) C.chalk else ink,
                height = 40.dp, size = 16.sp,
                modifier = Modifier.padding(horizontal = 26.dp),
                onTap = {
                    if (exDone) { if (idx < sc.exercises.lastIndex) advance() else nav.navigate("finish") }
                    else doSet(nextOpen)
                },
            )
            Spacer(Modifier.height(16.dp))
        }
    }
}

// =============================================================================================
// ELENCO ESERCIZI
// =============================================================================================

@Composable
fun ListScreen(sid: String, ui: UiState, nav: NavHostController) {
    val snap = ui.snapshot ?: return
    val sc = snap.scheda(sid) ?: return
    val a = snap.active?.takeIf { it.isWorkout && it.scheda == sid }
    val accent = C.scheda(sid)
    ScalingLazyColumn(
        modifier = Modifier.fillMaxSize().background(C.floor),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(5.dp),
        contentPadding = PaddingValues(top = 32.dp, bottom = 36.dp, start = 12.dp, end = 12.dp),
    ) {
        item { Mono("Workout ${sc.workout} · Scheda $sid", color = accent) }
        sc.exercises.forEach { e ->
            item {
                val done = a?.let { snap.setsDoneOf(it, e) } ?: 0
                Tappable(onTap = { Jump.exId = e.id; nav.popBackStack() }) {
                    Row(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(C.s1).padding(horizontal = 10.dp, vertical = 7.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(Modifier.weight(1f)) {
                            T(e.name, 12.sp, if (done >= e.sets) C.chalk3 else C.chalk, FontWeight.SemiBold, maxLines = 2, align = androidx.compose.ui.text.style.TextAlign.Start)
                            Mono("${e.sets}×${e.reps}" + (e.kg?.let { " · ${fmtKg(it)} kg" } ?: ""), size = 8.sp, color = C.chalk3)
                        }
                        Spacer(Modifier.width(6.dp))
                        Num("$done/${e.sets}", 15.sp, if (done >= e.sets) accent else C.chalk2)
                    }
                }
            }
        }
        item { Spacer(Modifier.height(4.dp)) }
        item { Pill("Termina", fill = accent, ink = C.ink(sid), onTap = { nav.navigate("finish") }) }
    }
}

// =============================================================================================
// RIEPILOGO / CHIUSURA
// =============================================================================================

@Composable
fun FinishScreen(ui: UiState, nav: NavHostController) {
    val ctx = LocalContext.current
    val snap = ui.snapshot ?: return
    val a = snap.active
    val now by rememberNow(1000)
    if (a == null || !a.isWorkout) {
        LaunchedEffect(Unit) { nav.popBackStack("home", false) }
        return
    }
    val sc = snap.scheda(a.scheda) ?: return
    val accent = C.scheda(a.scheda)
    val done = snap.setsDone(a, sc)
    val volume = sc.exercises.sumOf { e -> a.sets[e.id].orEmpty().filterNotNull().sumOf { it.reps * it.kg } }
    val reps = sc.exercises.sumOf { e -> a.sets[e.id].orEmpty().filterNotNull().sumOf { it.reps } }

    ScalingLazyColumn(
        modifier = Modifier.fillMaxSize().background(C.floor),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(6.dp),
        contentPadding = PaddingValues(top = 34.dp, bottom = 36.dp, start = 12.dp, end = 12.dp),
    ) {
        item { Mono("Workout ${sc.workout} · Scheda ${a.scheda}", color = accent) }
        item { Num(fmtElapsed(now - a.startedAt), 38.sp) }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                Stat("${done}/${sc.totalSets}", "serie")
                Stat("$reps", "reps")
                Stat(fmtKg(volume.toLong().toDouble()), "kg tot")
            }
        }
        if (ui.hr.samples > 0) {
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    Stat("${ui.hr.avg}", "bpm medi")
                    Stat("${ui.hr.max}", "bpm max")
                    if (ui.hr.kcal > 0) Stat("${ui.hr.kcal}", "kcal")
                }
            }
        }
        item { Spacer(Modifier.height(4.dp)) }
        item {
            Pill("Termina e salva", fill = accent, ink = C.ink(a.scheda), onTap = {
                tick(ctx, 90)
                Controller.finishWorkout(ctx)
                nav.popBackStack("home", false)
            })
        }
        item { Pill("Continua", fill = C.s3, ink = C.chalk, onTap = { nav.popBackStack() }) }
        item {
            Tappable(onTap = { Controller.discardWorkout(ctx); nav.popBackStack("home", false) }) {
                Mono("Annulla allenamento", size = 8.sp, color = C.chalk3, modifier = Modifier.padding(8.dp))
            }
        }
    }
}

@Composable
private fun Stat(value: String, label: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Num(value, 20.sp)
        Mono(label, size = 7.sp, color = C.chalk3)
    }
}

// =============================================================================================
// RECUPERO
// =============================================================================================

@Composable
fun RestScreen(ui: UiState, nav: NavHostController) {
    val rest = ui.rest
    val now by rememberNow(100)
    if (rest == null) {
        LaunchedEffect(Unit) { nav.popBackStack() }
        Box(Modifier.fillMaxSize().background(C.floor))
        return
    }
    val a = ui.snapshot?.active
    val accent = C.scheda(a?.scheda)
    val leftMs = rest.endAt - now
    val go = leftMs <= 0
    val progress = if (rest.dur > 0) (leftMs / (rest.dur * 1000f)).coerceIn(0f, 1f) else 0f

    Box(Modifier.fillMaxSize().background(C.floor), contentAlignment = Alignment.Center) {
        RestRing(progress = if (go) 1f else progress, color = accent, modifier = Modifier.fillMaxSize())
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(horizontal = 46.dp).padding(bottom = 22.dp)) {
            Mono("Recupero", color = accent, size = 8.sp)
            Num(if (go) "VIA" else fmtClock((leftMs + 999) / 1000), 50.sp, if (go) accent else C.chalk)
            T(rest.label, 10.sp, C.chalk2, maxLines = 2, lineHeight = 11.sp)
            if (ui.hr.bpm > 0) Mono("♥ ${ui.hr.bpm}", size = 9.sp, modifier = Modifier.padding(top = 3.dp))
        }
        Row(
            Modifier.align(Alignment.BottomCenter).padding(bottom = 38.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically,
        ) {
            MiniBtn("−15") { Repo.adjustRest(-15) }
            MiniBtn("Salta", wide = true, fill = C.chalk, ink = C.floor) { Repo.clearRest() }
            MiniBtn("+15") { Repo.adjustRest(15) }
        }
    }
}

@Composable
private fun MiniBtn(label: String, wide: Boolean = false, fill: Color = C.s3, ink: Color = C.chalk, onTap: () -> Unit) {
    Tappable(onTap = onTap) {
        Box(
            Modifier.height(32.dp).width(if (wide) 64.dp else 44.dp).clip(RoundedCornerShape(50)).background(fill),
            contentAlignment = Alignment.Center,
        ) { T(label.uppercase(), 13.sp, ink, FontWeight.ExtraBold, Display, maxLines = 1) }
    }
}

// =============================================================================================
// TEST RM
// =============================================================================================

@Composable
fun TestListScreen(sid: String, ui: UiState, nav: NavHostController) {
    val ctx = LocalContext.current
    val snap = ui.snapshot ?: return
    val sc = snap.scheda(sid) ?: return
    val accent = C.scheda(sid)
    val a = snap.active?.takeIf { !it.isWorkout && it.scheda == sid }
    ScalingLazyColumn(
        modifier = Modifier.fillMaxSize().background(C.floor),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(5.dp),
        contentPadding = PaddingValues(top = 32.dp, bottom = 36.dp, start = 12.dp, end = 12.dp),
    ) {
        item { Mono("Test scheda $sid · ${sc.exercises.count { it.rm != null }}/${sc.exercises.size} RM", color = accent) }
        sc.exercises.forEach { e ->
            item {
                Tappable(onTap = { nav.navigate("attempt/${e.id}") }) {
                    Row(
                        Modifier.fillMaxWidth().clip(RoundedCornerShape(14.dp)).background(C.s1).padding(horizontal = 10.dp, vertical = 7.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column(Modifier.weight(1f)) {
                            T(e.name, 12.sp, C.chalk, FontWeight.SemiBold, maxLines = 2, align = androidx.compose.ui.text.style.TextAlign.Start)
                            Mono(if (e.oneRM) "1RM · max" else "${e.testReps} RM", size = 8.sp, color = accent)
                        }
                        Spacer(Modifier.width(6.dp))
                        if (e.rm != null) Num(fmtKg(e.rm), 17.sp) else Mono("da fare", size = 8.sp, color = accent)
                    }
                }
            }
        }
        if (a != null) {
            item { Spacer(Modifier.height(4.dp)) }
            item {
                Pill("Chiudi test", fill = accent, ink = C.ink(sid), onTap = {
                    tick(ctx, 80)
                    Controller.closeTest()
                    nav.popBackStack("home", false)
                })
            }
        }
    }
}

@OptIn(ExperimentalComposeUiApi::class)
@Composable
fun AttemptScreen(exId: String, ui: UiState, nav: NavHostController) {
    val ctx = LocalContext.current
    val snap = ui.snapshot ?: return
    val e = snap.ex(exId) ?: return
    val accent = C.scheda(e.scheda)
    var kg by rememberSaveable { mutableDoubleStateOf(e.rm ?: e.kg ?: 40.0) }
    var last by rememberSaveable { mutableIntStateOf(0) } // 0 nessuno, 1 riuscito, -1 mancato
    val focus = remember { FocusRequester() }
    var rotary by remember { mutableDoubleStateOf(0.0) }
    KeepFocus(focus)

    fun bump(d: Int) {
        kg = (kg + d * e.step).coerceIn(0.0, 600.0)
        tick(ctx, 10)
    }

    Box(
        Modifier.fillMaxSize().background(C.floor)
            .onRotaryScrollEvent { ev ->
                rotary += ev.verticalScrollPixels
                if (rotary > 36) { rotary = 0.0; bump(1) } else if (rotary < -36) { rotary = 0.0; bump(-1) }
                true
            }
            .focusRequester(focus).focusable(),
    ) {
        Column(
            Modifier.fillMaxSize().padding(horizontal = 18.dp, vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.SpaceBetween,
        ) {
            Column(Modifier.padding(top = 14.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Mono(if (e.oneRM) "1RM · tentativo massimale" else "Trova il tuo ${e.testReps} RM", color = accent, size = 8.sp)
                T(e.name, 12.sp, C.chalk, FontWeight.SemiBold, maxLines = 2, lineHeight = 13.sp)
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Tappable(onTap = { bump(-1) }) {
                    Box(Modifier.size(34.dp).clip(CircleShape).background(C.s3), contentAlignment = Alignment.Center) { Num("−", 24.sp) }
                }
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Row(verticalAlignment = Alignment.Bottom) {
                        Num(fmtKg(kg), 44.sp)
                        T(" kg", 14.sp, C.chalk2, FontWeight.Bold, Display, modifier = Modifier.padding(bottom = 5.dp))
                    }
                    Mono(
                        e.rm?.let { "RM attuale ${fmtKg(it)}" } ?: "nessun RM",
                        size = 8.sp, color = when (last) { 1 -> accent; -1 -> C.chalk3; else -> C.chalk2 },
                    )
                }
                Tappable(onTap = { bump(1) }) {
                    Box(Modifier.size(34.dp).clip(CircleShape).background(C.s3), contentAlignment = Alignment.Center) { Num("+", 24.sp) }
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(bottom = 10.dp)) {
                Pill("✗", fill = C.s3, ink = C.chalk, modifier = Modifier.width(54.dp), height = 38.dp, size = 18.sp, onTap = {
                    tick(ctx, 40)
                    Controller.attempt(ctx, e, kg, ok = false)
                    last = -1
                })
                Pill("✓ chiuse", fill = accent, ink = C.ink(e.scheda), modifier = Modifier.width(88.dp), height = 38.dp, size = 15.sp, onTap = {
                    tick(ctx, 70)
                    Controller.attempt(ctx, e, kg, ok = true)
                    kg += e.step
                    last = 1
                })
            }
        }
    }
}
