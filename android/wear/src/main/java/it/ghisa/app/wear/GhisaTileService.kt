package it.ghisa.app.wear

import androidx.compose.ui.graphics.toArgb
import androidx.wear.protolayout.ActionBuilders
import androidx.wear.protolayout.ColorBuilders.argb
import androidx.wear.protolayout.DimensionBuilders.sp
import androidx.wear.protolayout.DimensionBuilders.dp
import androidx.wear.protolayout.LayoutElementBuilders
import androidx.wear.protolayout.ModifiersBuilders
import androidx.wear.protolayout.ResourceBuilders
import androidx.wear.protolayout.TimelineBuilders
import androidx.wear.tiles.RequestBuilders
import androidx.wear.tiles.TileBuilders
import androidx.wear.tiles.TileService
import com.google.common.util.concurrent.Futures
import com.google.common.util.concurrent.ListenableFuture

/** Tile: prossimo allenamento, oppure avanzamento della sessione in corso. Un tocco apre l'app. */
class GhisaTileService : TileService() {

    override fun onTileRequest(requestParams: RequestBuilders.TileRequest): ListenableFuture<TileBuilders.Tile> {
        Repo.init(this)
        val snap = Repo.ui.value.snapshot
        val a = snap?.active

        val title: String
        val main: String
        val sub: String
        val color: Int
        if (snap == null) {
            title = "GHISA"; main = "Apri l'app"; sub = "sul telefono, una volta"; color = C.chalk.toArgb()
        } else if (a != null && a.isWorkout) {
            val sc = snap.scheda(a.scheda)
            val done = sc?.let { snap.setsDone(a, it) } ?: 0
            title = "IN CORSO · SCHEDA ${a.scheda}"
            main = "$done/${sc?.totalSets ?: 0} serie"
            sub = "Workout ${sc?.workout ?: ""}"
            color = C.scheda(a.scheda).toArgb()
        } else if (a != null) {
            title = "TEST IN CORSO"; main = "Scheda ${a.scheda}"; sub = "${a.tested.values.sum()} tentativi"; color = C.scheda(a.scheda).toArgb()
        } else if (snap.phase == "test") {
            val sc = snap.scheda(snap.next)
            title = "FASE TEST"
            main = "Scheda ${snap.next}"
            sub = "${sc?.exercises?.count { it.rm != null } ?: 0}/${sc?.exercises?.size ?: 0} RM"
            color = C.scheda(snap.next).toArgb()
        } else {
            val sc = snap.scheda(snap.next)
            title = "PROSSIMO"
            main = "Workout ${sc?.workout ?: ""} · ${snap.next}"
            sub = "${sc?.totalSets ?: 0} serie"
            color = C.scheda(snap.next).toArgb()
        }

        val click = ModifiersBuilders.Clickable.Builder()
            .setId("open")
            .setOnClick(
                ActionBuilders.LaunchAction.Builder()
                    .setAndroidActivity(
                        ActionBuilders.AndroidActivity.Builder()
                            .setPackageName(packageName)
                            .setClassName(MainActivity::class.java.name)
                            .build(),
                    ).build(),
            ).build()

        fun text(s: String, size: Float, argb: Int, bold: Boolean = false) = LayoutElementBuilders.Text.Builder()
            .setText(s)
            .setFontStyle(
                LayoutElementBuilders.FontStyle.Builder()
                    .setSize(sp(size))
                    .setColor(argb(argb))
                    .setWeight(
                        if (bold) LayoutElementBuilders.FONT_WEIGHT_BOLD else LayoutElementBuilders.FONT_WEIGHT_MEDIUM,
                    ).build(),
            ).build()

        val layout = LayoutElementBuilders.Box.Builder()
            .setWidth(androidx.wear.protolayout.DimensionBuilders.expand())
            .setHeight(androidx.wear.protolayout.DimensionBuilders.expand())
            .setModifiers(ModifiersBuilders.Modifiers.Builder().setClickable(click).build())
            .setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
            .setVerticalAlignment(LayoutElementBuilders.VERTICAL_ALIGN_CENTER)
            .addContent(
                LayoutElementBuilders.Column.Builder()
                    .setHorizontalAlignment(LayoutElementBuilders.HORIZONTAL_ALIGN_CENTER)
                    .addContent(text(title, 11f, color, true))
                    .addContent(LayoutElementBuilders.Spacer.Builder().setHeight(dp(4f)).build())
                    .addContent(text(main, 26f, C.chalk.toArgb(), true))
                    .addContent(LayoutElementBuilders.Spacer.Builder().setHeight(dp(2f)).build())
                    .addContent(text(sub, 13f, C.chalk2.toArgb()))
                    .build(),
            ).build()

        val tile = TileBuilders.Tile.Builder()
            .setResourcesVersion("1")
            .setFreshnessIntervalMillis(0)
            .setTileTimeline(TimelineBuilders.Timeline.fromLayoutElement(layout))
            .build()
        return Futures.immediateFuture(tile)
    }

    override fun onTileResourcesRequest(requestParams: RequestBuilders.ResourcesRequest): ListenableFuture<ResourceBuilders.Resources> =
        Futures.immediateFuture(ResourceBuilders.Resources.Builder().setVersion("1").build())
}
