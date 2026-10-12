package it.ghisa.app.wear

import android.graphics.Typeface
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.gestures.detectTapGestures
import kotlinx.coroutines.launch

/** Palette GHISA: pavimento in gomma, magnesite e i quattro dischi IWF. */
object C {
    val floor = Color(0xFF0B0B0A)
    val s1 = Color(0xFF161614)
    val s2 = Color(0xFF1F1F1C)
    val s3 = Color(0xFF2B2B27)
    val chalk = Color(0xFFEEEBE3)
    val chalk2 = Color(0xFFACA89E)
    val chalk3 = Color(0xFF75726A)
    val red = Color(0xFFEE3B2F)
    val blue = Color(0xFF3D74FF)
    val yellow = Color(0xFFF7C51B)
    val green = Color(0xFF22B85E)

    fun scheda(id: String?): Color = when (id) {
        "A" -> red
        "B" -> blue
        "C" -> yellow
        "D" -> green
        else -> chalk
    }

    /** Testo leggibile sopra il colore della scheda. */
    fun ink(id: String?): Color = if (id == "C" || id == "D" || id == null) floor else Color.White
}

val Display = FontFamily(Typeface.create("sans-serif-condensed", Typeface.BOLD))
val Mono = FontFamily.Monospace

@Composable
fun T(
    text: String,
    size: TextUnit = 14.sp,
    color: Color = C.chalk,
    weight: FontWeight = FontWeight.Medium,
    family: FontFamily = FontFamily.SansSerif,
    align: TextAlign = TextAlign.Center,
    maxLines: Int = Int.MAX_VALUE,
    spacing: TextUnit = TextUnit.Unspecified,
    lineHeight: TextUnit = TextUnit.Unspecified,
    modifier: Modifier = Modifier,
) {
    BasicText(
        text = text,
        modifier = modifier,
        maxLines = maxLines,
        overflow = TextOverflow.Ellipsis,
        style = TextStyle(
            color = color, fontSize = size, fontWeight = weight, fontFamily = family,
            textAlign = align, letterSpacing = spacing, lineHeight = lineHeight,
        ),
    )
}

/** Etichetta piccola in maiuscolo con carattere monospazio, come nell'app. */
@Composable
fun Mono(text: String, color: Color = C.chalk2, size: TextUnit = 9.sp, modifier: Modifier = Modifier) =
    T(text.uppercase(), size = size, color = color, family = Mono, spacing = 0.8.sp, modifier = modifier)

/** Numero grande in carattere condensato. */
@Composable
fun Num(text: String, size: TextUnit, color: Color = C.chalk, modifier: Modifier = Modifier) =
    T(text, size = size, color = color, weight = FontWeight.ExtraBold, family = Display, modifier = modifier, lineHeight = size)

/**
 * Pulsante a pressione elastica: si "schiaccia" al tocco e torna con una molla,
 * come i pulsanti dell'app telefono.
 */
@Composable
fun Tappable(
    modifier: Modifier = Modifier,
    onLongPress: (() -> Unit)? = null,
    onTap: () -> Unit,
    content: @Composable () -> Unit,
) {
    val s = remember { Animatable(1f) }
    val scope = androidx.compose.runtime.rememberCoroutineScope()
    Box(
        modifier = modifier
            .scale(s.value)
            .pointerInput(onLongPress) {
                detectTapGestures(
                    onPress = {
                        scope.launch { s.animateTo(0.92f, spring(stiffness = Spring.StiffnessHigh)) }
                        tryAwaitRelease()
                        scope.launch { s.animateTo(1f, spring(dampingRatio = 0.45f, stiffness = Spring.StiffnessMedium)) }
                    },
                    onTap = { onTap() },
                    onLongPress = onLongPress?.let { f -> { _: Offset -> f() } },
                )
            },
        contentAlignment = Alignment.Center,
    ) { content() }
}

@Composable
fun Pill(
    label: String,
    modifier: Modifier = Modifier,
    fill: Color = C.chalk,
    ink: Color = C.floor,
    height: Dp = 38.dp,
    size: TextUnit = 15.sp,
    onLongPress: (() -> Unit)? = null,
    onTap: () -> Unit,
) {
    Tappable(modifier = modifier, onLongPress = onLongPress, onTap = onTap) {
        Box(
            Modifier.fillMaxWidth().height(height).clip(RoundedCornerShape(50)).background(fill),
            contentAlignment = Alignment.Center,
        ) { T(label.uppercase(), size = size, color = ink, weight = FontWeight.ExtraBold, family = Display, spacing = 0.6.sp, maxLines = 1) }
    }
}

/** Anello di avanzamento con la lunetta a 60 tacche del recupero sul telefono. */
@Composable
fun RestRing(progress: Float, color: Color, modifier: Modifier = Modifier, bezel: Boolean = true) {
    Canvas(modifier) {
        val unit = size.minDimension / 454f
        val c = Offset(size.width / 2, size.height / 2)
        val tickOuter = size.minDimension / 2 - 5 * unit
        val ringR = tickOuter - 26 * unit
        val stroke = 10 * unit
        val tl = Offset(c.x - ringR, c.y - ringR)
        val sz = Size(ringR * 2, ringR * 2)
        drawArc(C.s3, 0f, 360f, false, tl, sz, style = Stroke(stroke))
        drawArc(color, -90f, 360f * progress.coerceIn(0f, 1f), false, tl, sz, style = Stroke(stroke, cap = StrokeCap.Round))
        if (bezel) {
            for (i in 0 until 60) {
                val a = Math.toRadians(i * 6.0 - 90)
                val len = if (i % 5 == 0) 14 * unit else 7 * unit
                val cos = Math.cos(a).toFloat()
                val sin = Math.sin(a).toFloat()
                drawLine(
                    C.chalk3.copy(alpha = if (i % 5 == 0) 0.95f else 0.5f),
                    Offset(c.x + tickOuter * cos, c.y + tickOuter * sin),
                    Offset(c.x + (tickOuter - len) * cos, c.y + (tickOuter - len) * sin),
                    strokeWidth = 2.2f * unit,
                )
            }
        }
    }
}

/** Pallino/disco di una serie: pieno nel colore della scheda quando è fatta. */
@Composable
fun SetDot(index: Int, rec: SetRec?, isNext: Boolean, accent: Color, ink: Color, size: Dp, onTap: () -> Unit, onLong: () -> Unit) {
    val border = if (rec != null) accent else if (isNext) C.chalk2 else C.s3
    Tappable(onTap = onTap, onLongPress = onLong) {
        Box(
            Modifier.size(size).clip(CircleShape).background(if (rec != null) accent else C.s2),
            contentAlignment = Alignment.Center,
        ) {
            Canvas(Modifier.size(size)) {
                drawCircle(border, radius = this.size.minDimension / 2 - 1.5.dp.toPx() / 2, style = Stroke(1.5.dp.toPx()))
            }
            if (rec != null) {
                Num("${rec.reps}", 17.sp, ink)
            } else {
                Num("${index + 1}", 15.sp, if (isNext) C.chalk else C.chalk3)
            }
        }
    }
}

@Composable
fun Bars(modifier: Modifier = Modifier) {
    Row(modifier, horizontalArrangement = Arrangement.spacedBy(2.dp), verticalAlignment = Alignment.CenterVertically) {
        listOf(C.red to 14.dp, C.blue to 12.dp, C.yellow to 10.dp, C.green to 8.dp).forEach { (c, h) ->
            Box(Modifier.widthIn(min = 3.dp).size(width = 3.dp, height = h).clip(RoundedCornerShape(1.dp)).background(c))
        }
    }
}

@Composable
fun Header(left: String, right: String? = null, color: Color = C.chalk2) {
    Column(Modifier.fillMaxWidth().padding(top = 2.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Mono(left, color = color)
        if (right != null) Mono(right, color = C.chalk3, size = 8.sp)
    }
}

@Composable
fun KeepFocus(requester: androidx.compose.ui.focus.FocusRequester) {
    LaunchedEffect(Unit) { runCatching { requester.requestFocus() } }
}
