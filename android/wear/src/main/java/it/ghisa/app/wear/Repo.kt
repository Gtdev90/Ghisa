package it.ghisa.app.wear

import android.content.Context
import android.content.SharedPreferences
import android.net.Uri
import android.util.Log
import com.google.android.gms.wearable.PutDataMapRequest
import com.google.android.gms.wearable.Wearable
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import org.json.JSONArray
import org.json.JSONObject

/** Stato di recupero sull'orologio. Il timer è un timestamp di fine: resta esatto anche a schermo spento. */
data class Rest(val endAt: Long, val dur: Int, val label: String, val fromPhone: Boolean = false)

/** Stato "effettivo" mostrato dall'interfaccia: ultimo stato del telefono + comandi non ancora registrati. */
data class UiState(
    val snapshot: Snapshot? = null,
    val pending: Int = 0,
    val rest: Rest? = null,
    val hr: Hr = Hr(),
)

/**
 * Unica fonte di verità dell'app orologio.
 *
 * - Lo stato arriva dal telefono (`/state`) e viene salvato su disco.
 * - I comandi (serie fatta, inizio/fine allenamento...) partono come DataItem `/cmd/<id>`: la Data Layer li
 *   consegna al telefono appena è raggiungibile, anche ore dopo. Nel frattempo restano in `pending` e il
 *   polso li applica in locale, così l'interfaccia risponde subito.
 * - Quando il telefono li registra, il suo stato successivo li elenca in `acked` e qui vengono tolti.
 */
object Repo {
    private const val TAG = "GhisaRepo"
    private lateinit var appCtx: Context
    private lateinit var prefs: SharedPreferences
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    private var base: Snapshot? = null
    private val pending = mutableListOf<Cmd>()

    private val _ui = MutableStateFlow(UiState())
    val ui: StateFlow<UiState> = _ui.asStateFlow()

    private var rest: Rest? = null
    private var hr = Hr()

    /** Inizio sessione lato orologio (per cronometro e frequenza cardiaca), persistito. */
    val sessionStart: Long get() = prefs.getLong("sessionStart", 0L)

    @Synchronized
    fun init(ctx: Context) {
        if (this::appCtx.isInitialized) return
        appCtx = ctx.applicationContext
        prefs = appCtx.getSharedPreferences("ghisa", Context.MODE_PRIVATE)
        prefs.getString("state", null)?.let { runCatching { base = Snapshot.parse(it) } }
        prefs.getString("pending", null)?.let { s ->
            runCatching {
                val arr = JSONArray(s)
                for (i in 0 until arr.length()) pending.add(Cmd(arr.getJSONObject(i)))
            }
        }
        prefs.getString("rest", null)?.let { s ->
            runCatching {
                val o = JSONObject(s)
                val r = Rest(o.getLong("endAt"), o.getInt("dur"), o.optString("label"), o.optBoolean("fromPhone"))
                if (r.endAt > System.currentTimeMillis()) rest = r
            }
        }
        publish()
        scope.launch { fetchState() }
    }

    /** Legge lo stato più recente già presente nella Data Layer (utile al primo avvio). */
    suspend fun fetchState() {
        try {
            val buf = Wearable.getDataClient(appCtx)
                .getDataItems(Uri.Builder().scheme("wear").path("/state").build()).await()
            try {
                for (item in buf) {
                    val json = item.data?.toString(Charsets.UTF_8) ?: continue
                    onState(json)
                }
            } finally {
                buf.release()
            }
        } catch (e: Exception) {
            Log.w(TAG, "fetchState: ${e.message}")
        }
    }

    // ---------- Ingresso dal telefono ----------

    @Synchronized
    fun onState(json: String) {
        val snap = runCatching { Snapshot.parse(json) }.getOrElse {
            Log.w(TAG, "stato non valido: ${it.message}")
            return
        }
        val cur = base
        if (cur != null && snap.rev < cur.rev) return
        prefs.edit().putString("state", json).apply()
        base = snap
        pending.removeAll { it.id in snap.acked }
        savePending()
        // Recupero avviato dal telefono (serie fatta sul telefono): lo seguiamo anche sul polso.
        val t = snap.timer
        if (t != null && t.endAt > System.currentTimeMillis() && rest?.endAt != t.endAt) {
            setRest(Rest(t.endAt, t.dur, t.label, fromPhone = true))
        }
        // Sessione chiusa sul telefono: si spegne anche il polso.
        if (snap.active == null && pending.none { it.type in setOf("start", "set", "attempt") }) {
            if (prefs.getLong("sessionStart", 0L) != 0L) endLocalSession()
        }
        publish()
        ComplicationRefresher.request(appCtx)
        TileRefresher.request(appCtx)
    }

    // ---------- Uscita verso il telefono ----------

    @Synchronized
    fun send(c: Cmd) {
        pending.add(c)
        savePending()
        publish()
        val ctx = appCtx
        scope.launch {
            try {
                val req = PutDataMapRequest.create("/cmd/${c.id}").apply {
                    dataMap.putString("json", c.json.toString())
                    dataMap.putLong("ts", System.currentTimeMillis())
                }.asPutDataRequest().setUrgent()
                Wearable.getDataClient(ctx).putDataItem(req).await()
            } catch (e: Exception) {
                Log.w(TAG, "invio comando: ${e.message}")
            }
        }
    }

    // ---------- Recupero ----------

    @Synchronized
    fun startRest(sec: Int, label: String) {
        if (sec <= 0) return
        setRest(Rest(System.currentTimeMillis() + sec * 1000L, sec, label))
        publish()
    }

    @Synchronized
    fun adjustRest(deltaSec: Int) {
        val r = rest ?: return
        val end = r.endAt + deltaSec * 1000L
        if (end - System.currentTimeMillis() < 1500) {
            clearRest()
        } else {
            setRest(r.copy(endAt = end, dur = maxOf(r.dur, ((end - System.currentTimeMillis()) / 1000).toInt())))
        }
        publish()
    }

    @Synchronized
    fun clearRest() {
        rest = null
        prefs.edit().remove("rest").apply()
        publish()
    }

    private fun setRest(r: Rest) {
        rest = r
        prefs.edit().putString(
            "rest",
            JSONObject().put("endAt", r.endAt).put("dur", r.dur).put("label", r.label).put("fromPhone", r.fromPhone).toString(),
        ).apply()
    }

    // ---------- Sessione locale (cronometro + frequenza cardiaca) ----------

    @Synchronized
    fun beginLocalSession(startedAt: Long) {
        if (prefs.getLong("sessionStart", 0L) == 0L) {
            prefs.edit().putLong("sessionStart", startedAt).apply()
            hr = Hr()
        }
        publish()
    }

    @Synchronized
    fun endLocalSession() {
        prefs.edit().remove("sessionStart").apply()
        rest = null
        prefs.edit().remove("rest").apply()
        publish()
    }

    @Synchronized
    fun setHr(h: Hr) {
        hr = h
        publish()
    }

    fun currentHr(): Hr = hr

    // ---------- Interno ----------

    private fun savePending() {
        val arr = JSONArray()
        pending.forEach { arr.put(it.json) }
        prefs.edit().putString("pending", arr.toString()).apply()
    }

    private fun publish() {
        var s = base
        if (s != null) for (c in pending) s = s!!.apply(c)
        _ui.value = UiState(s, pending.size, rest, hr)
    }
}
