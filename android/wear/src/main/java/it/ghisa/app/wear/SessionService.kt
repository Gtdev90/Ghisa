package it.ghisa.app.wear

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.VibrationEffect
import android.os.VibratorManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.health.services.client.ExerciseUpdateCallback
import androidx.health.services.client.HealthServices
import androidx.health.services.client.data.Availability
import androidx.health.services.client.data.DataType
import androidx.health.services.client.data.ExerciseConfig
import androidx.health.services.client.data.ExerciseLapSummary
import androidx.health.services.client.data.ExerciseTrackedStatus
import androidx.health.services.client.data.ExerciseType
import androidx.health.services.client.data.ExerciseUpdate
import androidx.lifecycle.LifecycleService
import androidx.lifecycle.lifecycleScope
import androidx.wear.ongoing.OngoingActivity
import androidx.wear.ongoing.Status
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.guava.await
import kotlinx.coroutines.launch

/**
 * Servizio in primo piano per tutta la durata di un allenamento:
 *  - tiene vivo il processo, così il recupero vibra anche con lo schermo spento;
 *  - legge la frequenza cardiaca e le calorie con Health Services (sessione "Allenamento di forza");
 *  - mostra l'attività in corso sul quadrante dell'orologio (Ongoing Activity).
 */
class SessionService : LifecycleService() {

    companion object {
        private const val TAG = "GhisaSession"
        private const val CHANNEL = "session"
        private const val NOTIF_ID = 42

        fun start(ctx: Context) {
            Repo.init(ctx)
            ContextCompat.startForegroundService(ctx, Intent(ctx, SessionService::class.java))
        }

        fun stop(ctx: Context) {
            ctx.stopService(Intent(ctx, SessionService::class.java))
        }

        fun hasHealthPermissions(ctx: Context) =
            ctx.checkSelfPermission(Manifest.permission.BODY_SENSORS) == PackageManager.PERMISSION_GRANTED &&
                ctx.checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION) == PackageManager.PERMISSION_GRANTED
    }

    private var hrStarted = false

    // Statistiche cardio accumulate durante la sessione.
    private var sum = 0L
    private var count = 0
    private var min = Int.MAX_VALUE
    private var max = 0
    private var kcal = 0

    private val exerciseClient by lazy { HealthServices.getClient(this).exerciseClient }

    private val callback = object : ExerciseUpdateCallback {
        override fun onExerciseUpdateReceived(update: ExerciseUpdate) {
            val m = update.latestMetrics
            m.getData(DataType.HEART_RATE_BPM).forEach { addSample(it.value.toInt()) }
            m.getData(DataType.CALORIES_TOTAL)?.let { kcal = it.total.toInt() }
            publishHr()
        }

        override fun onLapSummaryReceived(lapSummary: ExerciseLapSummary) = Unit
        override fun onRegistered() = Unit
        override fun onRegistrationFailed(throwable: Throwable) {
            Log.w(TAG, "registrazione Health Services fallita: ${throwable.message}")
        }

        override fun onAvailabilityChanged(dataType: androidx.health.services.client.data.DataType<*, *>, availability: Availability) = Unit
    }

    private var currentBpm = 0

    private fun addSample(bpm: Int) {
        if (bpm <= 0) return
        currentBpm = bpm
        sum += bpm
        count++
        min = minOf(min, bpm)
        max = maxOf(max, bpm)
    }

    private fun publishHr() {
        Repo.setHr(
            Hr(
                bpm = currentBpm,
                avg = if (count > 0) (sum / count).toInt() else 0,
                max = max,
                min = if (min == Int.MAX_VALUE) 0 else min,
                kcal = kcal,
                samples = count,
            ),
        )
    }

    override fun onCreate() {
        super.onCreate()
        Repo.init(this)
        createChannel()
        // Recupero: vibrazioni a 3-2-1 e al "via", poi il recupero si chiude da solo.
        lifecycleScope.launch {
            Repo.ui.map { it.rest }.distinctUntilChanged().collectLatest { r ->
                if (r != null) runRest(r)
            }
        }
        // Chiusura automatica quando la sessione finisce (chiusa dall'orologio o dal telefono).
        lifecycleScope.launch {
            Repo.ui.map { Repo.sessionStart != 0L }.distinctUntilChanged().collectLatest { on ->
                if (!on) stopSelf()
            }
        }
        // Aggiorna il testo dell'attività in corso.
        lifecycleScope.launch {
            while (true) {
                notifyOngoing()
                delay(10_000)
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        super.onStartCommand(intent, flags, startId)
        val type = if (hasHealthPermissions(this)) ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH
        else ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
        try {
            startForeground(NOTIF_ID, buildNotification(), type)
        } catch (e: Exception) {
            Log.w(TAG, "startForeground: ${e.message}")
            stopSelf()
            return START_NOT_STICKY
        }
        if (!hrStarted && hasHealthPermissions(this)) {
            hrStarted = true
            lifecycleScope.launch { startHeartRate() }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        if (hrStarted) {
            hrStarted = false
            // endExercise è asincrono: lo si lancia fuori dal ciclo di vita del servizio.
            runCatching {
                exerciseClient.endExerciseAsync()
                exerciseClient.clearUpdateCallbackAsync(callback)
            }
        }
        super.onDestroy()
    }

    // ---------- Frequenza cardiaca ----------

    private suspend fun startHeartRate() {
        try {
            val info = exerciseClient.getCurrentExerciseInfoAsync().await()
            if (info.exerciseTrackedStatus == ExerciseTrackedStatus.OTHER_APP_IN_PROGRESS) {
                Log.i(TAG, "un'altra app sta registrando un allenamento")
                return
            }
            exerciseClient.setUpdateCallback(callback)
            if (info.exerciseTrackedStatus == ExerciseTrackedStatus.OWNED_EXERCISE_IN_PROGRESS) return
            val caps = exerciseClient.getCapabilitiesAsync().await()
            val supported = caps.getExerciseTypeCapabilities(ExerciseType.STRENGTH_TRAINING).supportedDataTypes
            val wanted = setOf(DataType.HEART_RATE_BPM, DataType.CALORIES_TOTAL).filter { it in supported }.toSet()
            if (wanted.isEmpty()) return
            val config = ExerciseConfig.builder(ExerciseType.STRENGTH_TRAINING)
                .setDataTypes(wanted)
                .setIsAutoPauseAndResumeEnabled(false)
                .setIsGpsEnabled(false)
                .build()
            exerciseClient.startExerciseAsync(config).await()
        } catch (e: Exception) {
            Log.w(TAG, "frequenza cardiaca non disponibile: ${e.message}")
        }
    }

    // ---------- Recupero ----------

    private suspend fun runRest(r: Rest) {
        val vibrate = Repo.ui.value.snapshot?.settings?.vibrate ?: true
        for (t in 3 downTo 1) {
            val wait = (r.endAt - t * 1000L) - System.currentTimeMillis()
            if (wait > 0) {
                delay(wait)
                if (vibrate) buzz(longArrayOf(0, 35))
            }
        }
        val last = r.endAt - System.currentTimeMillis()
        if (last > 0) delay(last)
        if (vibrate) buzz(longArrayOf(0, 220, 110, 220, 110, 520))
        delay(2600)
        if (Repo.ui.value.rest?.endAt == r.endAt) Repo.clearRest()
    }

    private fun buzz(pattern: LongArray) {
        runCatching {
            val vm = getSystemService(VibratorManager::class.java)
            vm.defaultVibrator.vibrate(VibrationEffect.createWaveform(pattern, -1))
        }
    }

    // ---------- Notifica / attività in corso ----------

    private fun createChannel() {
        val nm = getSystemService(NotificationManager::class.java)
        if (nm.getNotificationChannel(CHANNEL) == null) {
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL, "Allenamento in corso", NotificationManager.IMPORTANCE_LOW),
            )
        }
    }

    private fun statusLine(): String {
        val ui = Repo.ui.value
        val bits = mutableListOf<String>()
        if (ui.hr.bpm > 0) bits += "♥ ${ui.hr.bpm}"
        ui.rest?.let { r ->
            val left = (r.endAt - System.currentTimeMillis()) / 1000
            if (left > 0) bits += "REC ${fmtClock(left)}"
        }
        return if (bits.isEmpty()) "Allenamento in corso" else bits.joinToString(" · ")
    }

    private fun buildNotification(): android.app.Notification {
        val pi = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
        )
        val builder = NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(R.drawable.ic_status)
            .setContentTitle("GHISA")
            .setContentText(statusLine())
            .setCategory(NotificationCompat.CATEGORY_WORKOUT)
            .setOngoing(true)
            .setContentIntent(pi)
            .setOnlyAlertOnce(true)

        val status = Status.Builder()
            .addTemplate("#line#")
            .addPart("line", Status.TextPart(statusLine()))
            .build()
        OngoingActivity.Builder(applicationContext, NOTIF_ID, builder)
            .setStaticIcon(R.drawable.ic_status)
            .setTouchIntent(pi)
            .setStatus(status)
            .build()
            .apply(applicationContext)
        return builder.build()
    }

    private fun notifyOngoing() {
        runCatching {
            getSystemService(NotificationManager::class.java).notify(NOTIF_ID, buildNotification())
        }
    }
}
