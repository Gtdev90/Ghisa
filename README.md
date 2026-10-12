# GHISA — PWA per l'allenamento in palestra

Test dei massimali sulle schede **A B C D**, poi **Fase 1** con i carichi calcolati sui tuoi numeri.
Tutto in locale sul telefono, funziona offline, nessun account.

## Come funziona

1. **Onboarding** (3 schermate) → si entra nella **fase test**.
2. **Fase test**: per ogni esercizio trovi l'RM (es. 10 RM = il peso più alto con cui chiudi 10 ripetizioni).
   Registri i tentativi uno dopo l'altro (riuscito / non riuscito): il miglior tentativo riuscito è l'RM.
   Dopo ogni tentativo parte il recupero e il carico suggerito sale da solo.
3. **Squat e Stacco** seguono il protocollo "Test massimale" in 9 step: inserisci il massimale stimato,
   l'app calcola i carichi di riscaldamento (30% → 90%), mostra i dischi da montare e gestisce i recuperi
   (1′, 2′, 2′, 2′, 3′, 4′, 5′ = 19 minuti), poi i tentativi al 100% finché registri l'1RM.
4. Rilevati tutti i pesi si **sblocca la Fase 1** (si può anche passare prima, da Home o Impostazioni):
   - Squat e Stacco al **70% del massimale** (arrotondato, default 2,5 kg)
   - tutti gli altri esercizi al **100% dell'RM** rilevato
   - Workout 1 = Scheda A, Workout 2 = B, Workout 3 = C, Workout 4 = D, a rotazione.
5. In allenamento tocchi il disco di ogni serie → recupero automatico. Tocca una serie fatta per correggerla,
   tocca il carico per cambiarlo (solo oggi o da ora in poi). Si chiude tenendo premuto il bottone in basso.

Massimali modificabili a mano dalla sezione **Massimali**, storico completo nel **Diario**,
backup/ripristino in JSON e "Nuovo ciclo di test" dalle **Impostazioni**.

## Avvio in locale

```bash
npm install
npm run build
npm run serve
```

Poi apri http://localhost:5173. In locale il service worker è disattivato per non intralciare lo sviluppo
(aggiungi `?sw` all'indirizzo per provarlo).

## Pubblicazione (per installarla sul telefono)

La PWA è la cartella **`app/`**: sono solo file statici. Serve un hosting **HTTPS**, ad esempio:

- **Netlify Drop**: trascina la cartella `app/` su https://app.netlify.com/drop
- **GitHub Pages**, **Cloudflare Pages**, **Vercel**: pubblica `app/` come sito statico

Dal telefono apri l'indirizzo e scegli **"Aggiungi a schermata Home" / "Installa app"**.

Dopo ogni modifica ai file esegui `npm run precache`: aggiorna la lista dei file e la versione del
service worker, così l'app installata propone "Nuova versione pronta · Aggiorna".

## App Android (APK)

L'APK è un guscio nativo **Capacitor 8** che contiene la cartella `app/`: funziona offline,
senza hosting. Il progetto Android Studio è in **`android/`** (pacchetto `it.ghisa.app`).

- APK pronto: **`dist/GHISA-1.0.0.apk`**: copialo sul telefono e aprilo
  (consenti "Installa app sconosciute" per il file manager o il browser da cui lo apri).
- Ricompilare dopo una modifica: `npm run apk` (aggiorna `app/`, sincronizza e compila con Gradle).
- Aprire in Android Studio: `npm run android:open`, oppure *File → Open* sulla cartella `android/`.
  Da lì *Run ▶* lo installa sul telefono collegato via USB o sull'emulatore.
- Icone e splash nativi: `npm run android:res` (generati dallo stesso marchio della PWA).

Nell'APK alcune funzioni passano dai plugin nativi invece che dalle API web: vibrazione (Haptics),
schermo sempre acceso (KeepAwake), esportazione backup (Filesystem + menu Condividi), tasto indietro (App).

**Firma**: la build `release` è firmata con la chiave di debug di Android Studio, va benissimo per
installarla sui tuoi dispositivi. Per pubblicarla sul Play Store crea una tua chiave con
*Build → Generate Signed App Bundle / APK* e togli `signingConfig signingConfigs.debug` da
`android/app/build.gradle`. Per gli aggiornamenti successivi incrementa `versionCode` e `versionName`.

## App per orologio Wear OS

Modulo **`android/wear/`** (Kotlin + Jetpack Compose): companion per OnePlus Watch 3 e altri Wear OS 4+.
`npm run apk` produce anche **`dist/GHISA-Watch-1.0.0.apk`** (3,7 MB).

**Cosa fa**
- Avvio dell'allenamento, segna/annulla serie con carico e ripetizioni sempre visibili, elenco esercizi, riepilogo.
- Recupero con anello a 60 tacche, vibrazione a 3-2-1 e al via (anche a schermo spento), ±15″ e salta.
- Test RM: carico con la corona rotante o con ±, tentativo riuscito/mancato; chiusura del test.
- Frequenza cardiaca live, media/massimo e calorie (Health Services, sessione "Allenamento di forza"):
  finiscono nel riepilogo e nel diario del telefono.
- Attività in corso sul quadrante, **Tile** (prossimo allenamento / avanzamento), **complicazione** con il conto alla rovescia.

**Come sincronizza**
- Telefono → orologio: a ogni cambio l'app web pubblica un'istantanea (`app/js/watch.js`) nella Data Layer.
- Orologio → telefono: ogni azione è un comando (`/cmd/<id>`) consegnato anche ore dopo; sul telefono lo riceve un
  servizio nativo (`WatchCommandService`) che lo mette in coda, e l'app lo applica in ordine appena è sveglia.
  Nel frattempo l'orologio mostra già l'effetto (stato "da sincronizzare"), quindi puoi allenarti con il telefono in tasca.

**Installare l'app sull'orologio** (Wi-Fi, una volta):
1. Orologio: Impostazioni → Sistema → Informazioni → Versioni → tocca 7 volte *Numero build*.
2. Impostazioni → Opzioni sviluppatore → attiva *Debug ADB* e *Debug tramite Wi-Fi* (compare IP:porta).
3. Dal PC: `npm run orologio -- 192.168.1.50:5555` (con il tuo IP:porta). La prima volta aggiungi
   `--pair 192.168.1.50:41234 123456` usando i dati di "Associa nuovo dispositivo".

Requisito sul telefono: orologio accoppiato tramite l'app **Wear OS** (Google Play Services espone la Data Layer solo così).
Dopo ogni nuova APK telefono/orologio la parte web si aggiorna da sola con `npm run pubblica`.

## Struttura

```
app/
  index.html, manifest.webmanifest, sw.js
  css/app.css            design system (colori dei dischi IWF, tipografia, componenti)
  js/data.js             schede, protocollo 1RM, regole Fase 1
  js/store.js            stato e persistenza (localStorage)
  js/anim.js             GSAP: curve, entrate, magnesite, transizioni
  js/nav.js              navigazione con supporto al tasto indietro
  js/ui/                 selettore di carico, bilanciere, timer, pannelli, tieni-premuto
  js/views/              schermate
  vendor/gsap, fonts/    copiati da node_modules (npm run vendor)
scripts/                 vendor, icone, precache, server locale
```

## Note

- Animazioni: GSAP 3.15 (SplitText, Flip, Draggable + Inertia, DrawSVG, Physics2D, ScrambleText,
  CustomEase/CustomBounce, Observer). Di default sono sempre **Piene**; con **Animazioni → Auto**
  l'app rispetta l'impostazione di sistema "movimento ridotto", con **Ridotte** restano solo dissolvenze.
- Vibrazione disponibile su Android (iOS non la supporta per le web app).
- "Schermo sempre acceso" usa la Wake Lock API durante test e allenamenti.
