// Icone e splash del progetto Android (android/app/src/main/res): launcher classico e tondo,
// icona adattiva (primo piano trasparente + sfondo), icona a tema monocromatica per Android 13+.
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { svg, renderPng, cleanup, FLOOR } from './lib/render.mjs';

const RES = fileURLToPath(new URL('../android/app/src/main/res/', import.meta.url));
const WEAR = fileURLToPath(new URL('../android/wear/src/main/res/', import.meta.url));
if (!existsSync(RES)) throw new Error('Manca il progetto Android: esegui prima "npx cap add android"');

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

for (const [d, k] of Object.entries(DENSITIES)) {
  const dir = join(RES, `mipmap-${d}`);
  mkdirSync(dir, { recursive: true });
  renderPng(svg({ scale: 0.86, bg: 'squircle' }), 48 * k, join(dir, 'ic_launcher.png'), { transparent: true });
  renderPng(svg({ scale: 0.8, bg: 'round' }), 48 * k, join(dir, 'ic_launcher_round.png'), { transparent: true });
  // Icona adattiva 108dp: i dischi stanno nella zona sicura (66dp), il bilanciere può essere tagliato dalla maschera.
  renderPng(svg({ scale: 0.72, bg: 'none' }), 108 * k, join(dir, 'ic_launcher_foreground.png'), { transparent: true });
  renderPng(svg({ scale: 0.72, bg: 'none', mono: true }), 108 * k, join(dir, 'ic_launcher_monochrome.png'), { transparent: true });
  console.log('mipmap', d);
}
// Icone launcher dell'app orologio (tonde): stesso marchio.
for (const [d, k] of Object.entries(DENSITIES)) {
  const dir = join(WEAR, `mipmap-${d}`);
  mkdirSync(dir, { recursive: true });
  renderPng(svg({ scale: 0.8, bg: 'round' }), 48 * k, join(dir, 'ic_launcher.png'), { transparent: true });
  renderPng(svg({ scale: 0.8, bg: 'round' }), 48 * k, join(dir, 'ic_launcher_round.png'), { transparent: true });
}
cleanup();

const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
</adaptive-icon>
`;
writeFileSync(join(RES, 'mipmap-anydpi-v26', 'ic_launcher.xml'), adaptive);
writeFileSync(join(RES, 'mipmap-anydpi-v26', 'ic_launcher_round.xml'), adaptive);

writeFileSync(join(RES, 'values', 'ic_launcher_background.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">${FLOOR}</color>
</resources>
`);

writeFileSync(join(RES, 'values', 'colors.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ghisa_floor">${FLOOR}</color>
</resources>
`);

// Splash (Android < 12): fondo pavimento + marchio centrato, senza bitmap stirate.
writeFileSync(join(RES, 'drawable', 'splash.xml'), `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item android:drawable="@color/ghisa_floor"/>
    <item android:width="180dp" android:height="180dp" android:gravity="center"
        android:drawable="@mipmap/ic_launcher_foreground"/>
</layer-list>
`);
// Le splash PNG del template (logo Capacitor) andrebbero in conflitto con splash.xml.
for (const dir of ['drawable', ...['land', 'port'].flatMap((o) => Object.keys(DENSITIES).map((d) => `drawable-${o}-${d}`))]) {
  rmSync(join(RES, dir, 'splash.png'), { force: true });
}

// Tema: splash di Android 12+ scura col marchio, finestra scura per evitare il lampo bianco.
writeFileSync(join(RES, 'values', 'styles.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>

    <style name="AppTheme" parent="Theme.AppCompat.DayNight.DarkActionBar">
        <item name="colorPrimary">@color/ghisa_floor</item>
        <item name="colorPrimaryDark">@color/ghisa_floor</item>
        <item name="colorAccent">#ee3b2f</item>
        <item name="android:windowBackground">@color/ghisa_floor</item>
    </style>

    <style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar">
        <item name="windowActionBar">false</item>
        <item name="windowNoTitle">true</item>
        <item name="android:background">@null</item>
        <item name="android:windowBackground">@color/ghisa_floor</item>
    </style>

    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:background">@drawable/splash</item>
        <item name="windowSplashScreenBackground">@color/ghisa_floor</item>
        <item name="windowSplashScreenAnimatedIcon">@mipmap/ic_launcher_foreground</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
    </style>
</resources>
`);

console.log('Risorse Android aggiornate');
