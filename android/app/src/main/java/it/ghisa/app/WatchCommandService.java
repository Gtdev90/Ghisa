package it.ghisa.app;

import com.google.android.gms.wearable.DataEvent;
import com.google.android.gms.wearable.DataEventBuffer;
import com.google.android.gms.wearable.DataMapItem;
import com.google.android.gms.wearable.Wearable;
import com.google.android.gms.wearable.WearableListenerService;

/**
 * Riceve i comandi dell'orologio ({@code /cmd/<id>}) anche quando l'app è chiusa:
 * li mette in coda su disco, li cancella dalla Data Layer e avvisa l'app se è in esecuzione.
 */
public class WatchCommandService extends WearableListenerService {

    @Override
    public void onDataChanged(DataEventBuffer events) {
        boolean any = false;
        for (DataEvent e : events) {
            if (e.getType() != DataEvent.TYPE_CHANGED) continue;
            String path = e.getDataItem().getUri().getPath();
            if (path == null || !path.startsWith("/cmd/")) continue;
            String json = DataMapItem.fromDataItem(e.getDataItem()).getDataMap().getString("json");
            if (json != null) {
                WatchPlugin.enqueue(this, json);
                any = true;
            }
            Wearable.getDataClient(this).deleteDataItems(e.getDataItem().getUri());
        }
        if (any) WatchPlugin.wake();
    }
}
