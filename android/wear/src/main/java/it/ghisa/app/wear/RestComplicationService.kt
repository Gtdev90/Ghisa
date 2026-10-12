package it.ghisa.app.wear

import android.app.PendingIntent
import android.content.Intent
import androidx.wear.watchface.complications.data.ComplicationData
import androidx.wear.watchface.complications.data.ComplicationType
import androidx.wear.watchface.complications.data.CountDownTimeReference
import androidx.wear.watchface.complications.data.LongTextComplicationData
import androidx.wear.watchface.complications.data.PlainComplicationText
import androidx.wear.watchface.complications.data.ShortTextComplicationData
import androidx.wear.watchface.complications.data.TimeDifferenceComplicationText
import androidx.wear.watchface.complications.data.TimeDifferenceStyle
import androidx.wear.watchface.complications.datasource.ComplicationRequest
import androidx.wear.watchface.complications.datasource.SuspendingComplicationDataSourceService
import java.time.Instant

/**
 * Complicazione per il quadrante: conto alla rovescia del recupero mentre ti alleni,
 * altrimenti l'avanzamento della sessione o il prossimo allenamento.
 */
class RestComplicationService : SuspendingComplicationDataSourceService() {

    private fun tap(): PendingIntent = PendingIntent.getActivity(
        this, 0, Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
        PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    private fun plain(s: String) = PlainComplicationText.Builder(s).build()

    override fun getPreviewData(type: ComplicationType): ComplicationData? = when (type) {
        ComplicationType.SHORT_TEXT -> ShortTextComplicationData.Builder(plain("1:30"), plain("Recupero")).setTitle(plain("REC")).build()
        ComplicationType.LONG_TEXT -> LongTextComplicationData.Builder(plain("Recupero 1:30"), plain("Recupero")).build()
        else -> null
    }

    override suspend fun onComplicationRequest(request: ComplicationRequest): ComplicationData? {
        Repo.init(this)
        val ui = Repo.ui.value
        val snap = ui.snapshot
        val now = System.currentTimeMillis()
        val rest = ui.rest?.takeIf { it.endAt > now }

        val shortText: androidx.wear.watchface.complications.data.ComplicationText
        val title: String
        val longText: androidx.wear.watchface.complications.data.ComplicationText
        when {
            rest != null -> {
                val countdown = TimeDifferenceComplicationText.Builder(
                    TimeDifferenceStyle.STOPWATCH, CountDownTimeReference(Instant.ofEpochMilli(rest.endAt)),
                ).build()
                shortText = countdown; title = "REC"; longText = countdown
            }
            snap?.active != null && snap.active.isWorkout -> {
                val sc = snap.scheda(snap.active.scheda)
                val s = "${sc?.let { snap.setsDone(snap.active, it) } ?: 0}/${sc?.totalSets ?: 0}"
                shortText = plain(s); title = "SERIE"; longText = plain("Workout · $s serie")
            }
            snap != null -> {
                val sc = snap.scheda(snap.next)
                shortText = plain(snap.next); title = if (snap.phase == "test") "TEST" else "W${sc?.workout ?: ""}"
                longText = plain(if (snap.phase == "test") "Test scheda ${snap.next}" else "Workout ${sc?.workout ?: ""} · Scheda ${snap.next}")
            }
            else -> {
                shortText = plain("GHISA"); title = ""; longText = plain("GHISA")
            }
        }
        val cd = plain("GHISA")
        return when (request.complicationType) {
            ComplicationType.SHORT_TEXT -> ShortTextComplicationData.Builder(shortText, cd)
                .apply { if (title.isNotEmpty()) setTitle(plain(title)) }
                .setTapAction(tap()).build()
            ComplicationType.LONG_TEXT -> LongTextComplicationData.Builder(longText, cd).setTapAction(tap()).build()
            else -> null
        }
    }
}
