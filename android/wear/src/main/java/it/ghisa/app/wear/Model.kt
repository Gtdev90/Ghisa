package it.ghisa.app.wear

import org.json.JSONArray
import org.json.JSONObject

// ---------------------------------------------------------------------------------------------
// Modello dello stato che il telefono invia all'orologio (JSON in Data Layer, path "/state")
// e comandi che l'orologio rimanda al telefono (path "/cmd/<id>").
// Il formato è lo stesso prodotto da app/js/watch.js: se cambi uno, cambia anche l'altro.
// ---------------------------------------------------------------------------------------------

data class Settings(
    val restMain: Int = 180,
    val restAcc: Int = 90,
    val restTest: Int = 180,
    val vibrate: Boolean = true,
    val bar: Double = 20.0,
)

data class Ex(
    val id: String,
    val scheda: String,
    val name: String,
    val group: String,
    val sets: Int,
    val reps: Int,
    val testReps: Int,
    val oneRM: Boolean,
    val kind: String,
    val kg: Double?,
    val rm: Double?,
    val step: Double,
    val n: Int,
)

data class Scheda(val id: String, val workout: Int, val exercises: List<Ex>) {
    val totalSets: Int get() = exercises.sumOf { it.sets }
}

data class SetRec(val reps: Int, val kg: Double)

data class Active(
    val type: String, // "workout" | "test"
    val scheda: String,
    val startedAt: Long,
    val sets: Map<String, List<SetRec?>>,
    val tested: Map<String, Int>,
) {
    val isWorkout get() = type == "workout"
}

data class TimerState(val endAt: Long, val dur: Int, val label: String)

data class Snapshot(
    val rev: Long,
    val phase: String, // "test" | "fase1"
    val cycle: Int,
    val settings: Settings,
    val next: String,
    val acked: Set<String>,
    val active: Active?,
    val timer: TimerState?,
    val schede: List<Scheda>,
) {
    fun scheda(id: String) = schede.firstOrNull { it.id == id }
    fun ex(id: String) = schede.firstNotNullOfOrNull { s -> s.exercises.firstOrNull { it.id == id } }
    val doneRm get() = schede.sumOf { s -> s.exercises.count { it.rm != null } }
    val totalEx get() = schede.sumOf { it.exercises.size }

    fun setsDone(a: Active, s: Scheda) = s.exercises.sumOf { e -> a.sets[e.id].orEmpty().count { it != null } }
    fun setsDoneOf(a: Active, e: Ex) = a.sets[e.id].orEmpty().count { it != null }

    companion object {
        fun parse(json: String): Snapshot {
            val o = JSONObject(json)
            val st = o.optJSONObject("settings") ?: JSONObject()
            val settings = Settings(
                restMain = st.optInt("restMain", 180),
                restAcc = st.optInt("restAcc", 90),
                restTest = st.optInt("restTest", 180),
                vibrate = st.optBoolean("vibrate", true),
                bar = st.optDouble("bar", 20.0),
            )
            val acked = o.optJSONArray("acked").toStrings().toSet()
            val schede = o.optJSONArray("schede").toObjects().map { s ->
                Scheda(
                    id = s.getString("id"),
                    workout = s.optInt("workout"),
                    exercises = s.optJSONArray("exercises").toObjects().map { e ->
                        Ex(
                            id = e.getString("id"),
                            scheda = e.optString("scheda", s.getString("id")),
                            name = e.getString("name"),
                            group = e.optString("group"),
                            sets = e.optInt("sets", 3),
                            reps = e.optInt("reps", 10),
                            testReps = e.optInt("testReps", 10),
                            oneRM = e.optBoolean("oneRM"),
                            kind = e.optString("kind", "machine"),
                            kg = e.optNullableDouble("kg"),
                            rm = e.optNullableDouble("rm"),
                            step = e.optDouble("step", 2.5),
                            n = e.optInt("n"),
                        )
                    },
                )
            }
            val active = o.optJSONObject("active")?.let { a ->
                val sets = mutableMapOf<String, List<SetRec?>>()
                a.optJSONObject("sets")?.let { so ->
                    so.keys().forEach { k ->
                        val arr = so.getJSONArray(k)
                        sets[k] = (0 until arr.length()).map { i ->
                            arr.optJSONObject(i)?.let { SetRec(it.optInt("reps"), it.optDouble("kg")) }
                        }
                    }
                }
                val tested = mutableMapOf<String, Int>()
                a.optJSONObject("tested")?.let { to -> to.keys().forEach { k -> tested[k] = to.optInt(k) } }
                Active(a.optString("type", "workout"), a.getString("scheda"), a.optLong("startedAt"), sets, tested)
            }
            val timer = o.optJSONObject("timer")?.let {
                TimerState(it.optLong("endAt"), it.optInt("dur"), it.optString("label"))
            }
            return Snapshot(
                rev = o.optLong("rev"),
                phase = o.optString("phase", "test"),
                cycle = o.optInt("cycle", 1),
                settings = settings,
                next = o.optString("next", "A"),
                acked = acked,
                active = active,
                timer = timer,
                schede = schede,
            )
        }
    }
}

private fun JSONObject.optNullableDouble(k: String): Double? = if (isNull(k) || !has(k)) null else optDouble(k)

private fun JSONArray?.toStrings(): List<String> =
    if (this == null) emptyList() else (0 until length()).map { getString(it) }

private fun JSONArray?.toObjects(): List<JSONObject> =
    if (this == null) emptyList() else (0 until length()).map { getJSONObject(it) }

// ---------------------------------------------------------------------------------------------
// Comandi orologio -> telefono
// ---------------------------------------------------------------------------------------------

/** Un comando in attesa che il telefono lo registri. `json` è ciò che viaggia nella Data Layer. */
class Cmd(val json: JSONObject) {
    val id: String get() = json.getString("id")
    val type: String get() = json.getString("type")
    val t: Long get() = json.optLong("t")
}

object Cmds {
    private fun base(type: String, t: Long = System.currentTimeMillis()) = JSONObject()
        .put("id", java.util.UUID.randomUUID().toString().take(12))
        .put("type", type)
        .put("t", t)

    fun start(scheda: String, startedAt: Long) =
        Cmd(base("start", startedAt).put("scheda", scheda).put("startedAt", startedAt))

    fun set(scheda: String, ex: String, i: Int, reps: Int, kg: Double, rest: Int, label: String, startedAt: Long) =
        Cmd(
            base("set").put("scheda", scheda).put("ex", ex).put("i", i).put("reps", reps).put("kg", kg)
                .put("rest", rest).put("label", label).put("startedAt", startedAt),
        )

    fun unset(ex: String, i: Int) = Cmd(base("unset").put("ex", ex).put("i", i))

    fun finish(scheda: String, endedAt: Long, hr: Hr?) = Cmd(
        base("finish", endedAt).put("scheda", scheda).put("endedAt", endedAt).also { o ->
            if (hr != null && hr.samples > 0) {
                o.put("hr", JSONObject().put("avg", hr.avg).put("max", hr.max).put("min", hr.min).put("kcal", hr.kcal))
            }
        },
    )

    fun discard() = Cmd(base("discard"))

    fun attempt(scheda: String, ex: String, kg: Double, ok: Boolean, rest: Int, label: String, startedAt: Long) =
        Cmd(
            base("attempt").put("scheda", scheda).put("ex", ex).put("kg", kg).put("ok", ok)
                .put("rest", rest).put("label", label).put("startedAt", startedAt),
        )

    fun closeTest() = Cmd(base("closeTest"))
}

/** Frequenza cardiaca della sessione corrente (letta da Health Services). */
data class Hr(
    val bpm: Int = 0,
    val avg: Int = 0,
    val max: Int = 0,
    val min: Int = 0,
    val kcal: Int = 0,
    val samples: Int = 0,
)

/** Applica sul polso, in modo ottimistico, l'effetto di un comando non ancora registrato dal telefono. */
fun Snapshot.apply(c: Cmd): Snapshot {
    val j = c.json
    return when (c.type) {
        "start" -> {
            val a = active
            if (a != null && a.isWorkout && a.scheda == j.getString("scheda")) this
            else copy(active = Active("workout", j.getString("scheda"), j.optLong("startedAt", c.t), emptyMap(), emptyMap()))
        }
        "set" -> {
            val scheda = j.getString("scheda")
            var a = active?.takeIf { it.isWorkout && it.scheda == scheda }
                ?: Active("workout", scheda, j.optLong("startedAt", c.t), emptyMap(), emptyMap())
            val exId = j.getString("ex")
            val i = j.getInt("i")
            val cur = a.sets[exId].orEmpty().toMutableList()
            while (cur.size <= i) cur.add(null)
            cur[i] = SetRec(j.getInt("reps"), j.getDouble("kg"))
            a = a.copy(sets = a.sets + (exId to cur))
            copy(active = a)
        }
        "unset" -> {
            val a = active ?: return this
            val exId = j.getString("ex")
            val i = j.getInt("i")
            val cur = a.sets[exId].orEmpty().toMutableList()
            if (i < cur.size) cur[i] = null
            copy(active = a.copy(sets = a.sets + (exId to cur)))
        }
        "finish", "discard", "closeTest" -> copy(active = null)
        "attempt" -> {
            val scheda = j.getString("scheda")
            val a = active?.takeIf { !it.isWorkout && it.scheda == scheda }
                ?: Active("test", scheda, j.optLong("startedAt", c.t), emptyMap(), emptyMap())
            val exId = j.getString("ex")
            val kg = j.getDouble("kg")
            val ok = j.getBoolean("ok")
            val schede2 = if (ok) schede.map { s ->
                s.copy(exercises = s.exercises.map { e ->
                    if (e.id == exId && (e.rm == null || kg > e.rm)) e.copy(rm = kg) else e
                })
            } else schede
            copy(active = a.copy(tested = a.tested + (exId to (a.tested[exId] ?: 0) + 1)), schede = schede2)
        }
        else -> this
    }
}
