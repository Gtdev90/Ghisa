package it.ghisa.app.wear

import android.content.Context

/** Azioni dell'utente sull'orologio: aggiornano lo stato locale e spediscono i comandi al telefono. */
object Controller {

    private fun restFor(e: Ex, s: Settings) = if (e.oneRM) s.restMain else s.restAcc

    fun startWorkout(ctx: Context, scheda: String) {
        val ui = Repo.ui.value
        val a = ui.snapshot?.active
        if (a != null && a.isWorkout && a.scheda == scheda) {
            Repo.beginLocalSession(a.startedAt)
        } else {
            val now = System.currentTimeMillis()
            Repo.send(Cmds.start(scheda, now))
            Repo.beginLocalSession(now)
        }
        SessionService.start(ctx)
    }

    /** Segna la serie `i` di `e` come fatta con il carico del giorno. Ritorna false se manca il carico. */
    fun setDone(ctx: Context, e: Ex, i: Int): Boolean {
        val snap = Repo.ui.value.snapshot ?: return false
        val kg = e.kg ?: return false
        val now = System.currentTimeMillis()
        val a = snap.active?.takeIf { it.isWorkout && it.scheda == e.scheda }
        val startedAt = a?.startedAt ?: now
        val sc = snap.scheda(e.scheda) ?: return false

        // Quante serie mancheranno dopo questa?
        val doneAfter = (a?.let { snap.setsDone(it, sc) } ?: 0) + 1
        val exDoneAfter = (a?.let { snap.setsDoneOf(it, e) } ?: 0) + 1
        val allDone = doneAfter >= sc.totalSets
        val rest = if (allDone) 0 else restFor(e, snap.settings)
        val label = if (exDoneAfter < e.sets) {
            "Prossima: ${e.name} · serie ${exDoneAfter + 1} di ${e.sets}"
        } else {
            val nxt = sc.exercises.firstOrNull { it.n > e.n && (a?.let { ac -> snap.setsDoneOf(ac, it) } ?: 0) < it.sets }
                ?: sc.exercises.firstOrNull { it.id != e.id && (a?.let { ac -> snap.setsDoneOf(ac, it) } ?: 0) < it.sets }
            if (nxt != null) "Prossimo: ${nxt.name} · ${nxt.sets}×${nxt.reps}" else "Ultima serie fatta"
        }

        Repo.send(Cmds.set(e.scheda, e.id, i, e.reps, kg, rest, label, startedAt))
        Repo.beginLocalSession(startedAt)
        SessionService.start(ctx)
        if (rest > 0) Repo.startRest(rest, label) else Repo.clearRest()
        return true
    }

    fun undoSet(e: Ex, i: Int) {
        Repo.send(Cmds.unset(e.id, i))
    }

    fun finishWorkout(ctx: Context) {
        val snap = Repo.ui.value.snapshot ?: return
        val a = snap.active ?: return
        val hr = Repo.currentHr()
        Repo.send(Cmds.finish(a.scheda, System.currentTimeMillis(), hr))
        Repo.clearRest()
        Repo.endLocalSession()
        SessionService.stop(ctx)
    }

    fun discardWorkout(ctx: Context) {
        Repo.send(Cmds.discard())
        Repo.clearRest()
        Repo.endLocalSession()
        SessionService.stop(ctx)
    }

    /** Tentativo di test RM. */
    fun attempt(ctx: Context, e: Ex, kg: Double, ok: Boolean) {
        val snap = Repo.ui.value.snapshot ?: return
        val now = System.currentTimeMillis()
        val a = snap.active?.takeIf { !it.isWorkout && it.scheda == e.scheda }
        val startedAt = a?.startedAt ?: now
        val rest = snap.settings.restTest
        val next = if (ok) kg + e.step else kg
        val label = if (ok) "${e.name} · prossimo tentativo a ${fmtKg(next)} kg" else "${e.name} · riprova o chiudi qui"
        Repo.send(Cmds.attempt(e.scheda, e.id, kg, ok, rest, label, startedAt))
        Repo.startRest(rest, label)
    }

    fun closeTest() {
        Repo.send(Cmds.closeTest())
        Repo.clearRest()
    }
}

fun fmtKg(v: Double): String {
    val s = if (v % 1.0 == 0.0) v.toLong().toString() else String.format(java.util.Locale.ITALY, "%.2f", v).trimEnd('0').trimEnd(',')
    return s.replace('.', ',')
}

fun fmtClock(sec: Long): String {
    val s = maxOf(0L, sec)
    return "%d:%02d".format(s / 60, s % 60)
}

fun fmtElapsed(ms: Long): String {
    val s = maxOf(0L, ms / 1000)
    val h = s / 3600
    val m = (s % 3600) / 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, s % 60) else "%02d:%02d".format(m, s % 60)
}
