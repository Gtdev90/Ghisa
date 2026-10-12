package it.ghisa.app.wear

import android.content.ComponentName
import android.content.Context
import androidx.wear.tiles.TileService
import androidx.wear.watchface.complications.datasource.ComplicationDataSourceUpdateRequester

object ComplicationRefresher {
    fun request(ctx: Context) {
        runCatching {
            ComplicationDataSourceUpdateRequester
                .create(ctx, ComponentName(ctx, RestComplicationService::class.java))
                .requestUpdateAll()
        }
    }
}

object TileRefresher {
    fun request(ctx: Context) {
        runCatching { TileService.getUpdater(ctx).requestUpdate(GhisaTileService::class.java) }
    }
}
