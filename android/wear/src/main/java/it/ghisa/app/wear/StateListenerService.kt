package it.ghisa.app.wear

import com.google.android.gms.wearable.DataEvent
import com.google.android.gms.wearable.DataEventBuffer
import com.google.android.gms.wearable.WearableListenerService

/** Riceve lo stato dal telefono anche quando l'app dell'orologio è chiusa. */
class StateListenerService : WearableListenerService() {
    override fun onDataChanged(events: DataEventBuffer) {
        Repo.init(this)
        for (e in events) {
            if (e.type == DataEvent.TYPE_CHANGED && e.dataItem.uri.path == "/state") {
                e.dataItem.data?.toString(Charsets.UTF_8)?.let { Repo.onState(it) }
            }
        }
    }
}
