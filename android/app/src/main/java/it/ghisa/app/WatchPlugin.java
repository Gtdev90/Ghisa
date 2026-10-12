package it.ghisa.app;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.wearable.PutDataRequest;
import com.google.android.gms.wearable.Wearable;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Ponte tra l'app web e l'orologio Wear OS (Data Layer).
 *
 *  - push({state}) : pubblica lo stato su /state, che l'orologio legge.
 *  - drain()       : restituisce (e svuota) i comandi arrivati dall'orologio, ordinati per tempo.
 *  - status()      : orologio collegato o no.
 *
 * I comandi arrivano da {@link WatchCommandService}, anche quando la WebView non è in esecuzione:
 * restano in una coda su disco finché l'app non li ritira.
 */
@CapacitorPlugin(name = "Watch")
public class WatchPlugin extends Plugin {

    static final String PREFS = "ghisa_watch";
    static final String KEY_QUEUE = "queue";

    private static WatchPlugin instance;

    @Override
    public void load() {
        instance = this;
    }

    @Override
    protected void handleOnDestroy() {
        if (instance == this) instance = null;
    }

    /** Avvisa la WebView che ci sono comandi da ritirare (se è viva). */
    static void wake() {
        WatchPlugin p = instance;
        if (p != null) p.notifyListeners("watchCmd", new JSObject());
    }

    @PluginMethod
    public void push(PluginCall call) {
        String state = call.getString("state");
        if (state == null) {
            call.reject("state mancante");
            return;
        }
        PutDataRequest req = PutDataRequest.create("/state")
                .setData(state.getBytes(java.nio.charset.StandardCharsets.UTF_8))
                .setUrgent();
        Wearable.getDataClient(getContext()).putDataItem(req)
                .addOnSuccessListener(item -> call.resolve())
                .addOnFailureListener(e -> call.reject("invio fallito: " + e.getMessage()));
    }

    @PluginMethod
    public void drain(PluginCall call) {
        JSObject out = new JSObject();
        out.put("cmds", takeQueue(getContext()));
        call.resolve(out);
    }

    /** Solo build di debug: finge l'arrivo di un comando dall'orologio (stessa coda e stesso avviso del servizio). */
    @PluginMethod
    public void injectTest(PluginCall call) {
        if ((getContext().getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE) == 0) {
            call.reject("solo build di debug");
            return;
        }
        String json = call.getString("json");
        if (json == null) {
            call.reject("json mancante");
            return;
        }
        enqueue(getContext(), json);
        wake();
        call.resolve();
    }

    @PluginMethod
    public void status(PluginCall call) {
        Wearable.getNodeClient(getContext()).getConnectedNodes()
                .addOnSuccessListener(nodes -> {
                    JSObject out = new JSObject();
                    JSArray names = new JSArray();
                    for (com.google.android.gms.wearable.Node n : nodes) names.put(n.getDisplayName());
                    out.put("connected", !nodes.isEmpty());
                    out.put("nodes", names);
                    call.resolve(out);
                })
                .addOnFailureListener(e -> {
                    JSObject out = new JSObject();
                    out.put("connected", false);
                    out.put("nodes", new JSArray());
                    out.put("error", String.valueOf(e.getMessage()));
                    call.resolve(out);
                });
    }

    // ---------- coda comandi (condivisa col servizio) ----------

    static synchronized void enqueue(Context ctx, String json) {
        SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        try {
            JSONArray q = new JSONArray(sp.getString(KEY_QUEUE, "[]"));
            String id = new JSONObject(json).optString("id");
            for (int i = 0; i < q.length(); i++) {
                if (new JSONObject(q.getString(i)).optString("id").equals(id)) return; // già in coda
            }
            q.put(json);
            sp.edit().putString(KEY_QUEUE, q.toString()).apply();
        } catch (JSONException ignored) {
            // comando non valido: scartato
        }
    }

    static synchronized JSArray takeQueue(Context ctx) {
        SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        JSArray out = new JSArray();
        try {
            JSONArray q = new JSONArray(sp.getString(KEY_QUEUE, "[]"));
            List<JSONObject> list = new ArrayList<>();
            for (int i = 0; i < q.length(); i++) list.add(new JSONObject(q.getString(i)));
            // La Data Layer non garantisce l'ordine di consegna: si ordina per istante del comando.
            Collections.sort(list, (a, b) -> Long.compare(a.optLong("t"), b.optLong("t")));
            for (JSONObject o : list) out.put(o.toString());
        } catch (JSONException ignored) {
            // coda illeggibile: si riparte vuota
        }
        sp.edit().remove(KEY_QUEUE).apply();
        return out;
    }
}
