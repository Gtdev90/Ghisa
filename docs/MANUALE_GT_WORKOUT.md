# GT Workout — Manuale Operativo e Principi Scientifici

> **Versione:** 1.0.0  
> **Target:** Atleti, Preparatori Atletici e Professionisti dell'Allenamento con Sovraccarichi  
> **Piattaforme supportate:** PWA (Web / Android / iOS / Desktop), Android APK Nativo, Wear OS Companion

---

## Indice dei Contenuti
1. [Introduzione e Visione del Progetto](#1-introduzione-e-visione-del-progetto)
2. [I Fondamenti Scientifici dell'Allenamento](#2-i-fondamenti-scientifici-dellanatomia-e-fisiologia-del-carico)
   - Tensione Meccanica e Sovraccarico Progressivo
   - Intensità Relativa, Scala RPE e Repetitions in Reserve (RIR)
   - Monitoraggio della Fatica Neurale e Drop Dinamico
   - Time Under Tension (TUT) e Cadenza di Movimento
   - Densità dell'Allenamento e Jump Sets
   - Periodizzazione del Carico e Protocolli di Scarico (Deload)
   - Gestione del Volume Sistemico (MEV, MAV, MRV)
3. [Architettura e Funzionalità dell'Applicazione](#3-architettura-e-funzionalit-dellapplicazione)
   - Schermata Oggi (Dashboard Operativa)
   - Sessione di Allenamento (Workout Attivo)
   - Sistema di Timer e Dynamic Floating Pill
   - Protocollo di Test dei Massimali (1RM, 3RM, 5RM, 8RM, 10RM)
   - Gestione e Tabella Massimali
   - Diario e Analytics del Volume per Gruppo Muscolare
   - Impostazioni e Backup Dati
4. [Companion App Wear OS (Smartwatch)](#4-companion-app-wear-os-smartwatch)
   - Funzionalità Standalone e Sincronizzazione Bidirezionale
   - Monitoraggio Cardio e Feedback Aptico
5. [Guida Operativa Passo-Passo](#5-guida-operativa-passo-passo)
6. [Conclusioni e Best Practice di Progressione](#6-conclusioni-e-best-practice-di-progressione)

---

## 1. Introduzione e Visione del Progetto

**GT Workout** è una piattaforma avanzata per la gestione, la progressione e il monitoraggio scientifico dell'allenamento con i pesi. L'applicazione nasce per colmare il divario tra la ricerca accademica sulla fisiologia dell'ipertrofia e della forza e la pratica quotidiana in sala pesi.

A differenza delle tradizionali applicazioni di tracciamento (che si limitano a fungere da taccuino digitale), GT Workout implementa un **motore algoritmico deterministico**:
- Calcola in tempo reale i carichi di lavoro basandosi su percentuali matematiche derivate dai massimali effettivi dell'atleta.
- Guida la cadenza esecutiva (Time Under Tension) per massimizzare la tensione meccanica per singola ripetizione.
- Monitora la riserva neurale (RIR/RPE) suggerendo compensazioni istantanee sul carico in caso di cedimento precoce.
- Automatizza l'avanzamento dei mesocicli e applica protocolli standardizzati di scarico attivo.

```
       ┌────────────────────────────────────────────────────────┐
       │                       GT WORKOUT                       │
       ├─────────────────────────┬──────────────────────────────┤
       │     Smartphone / Web    │     Wear OS Smartwatch       │
       │   (Controllo & Analisi) │   (Esecuzione & Sensori)     │
       └────────────┬────────────┴───────────────┬──────────────┘
                    │                            │
                    │   Google Play Services     │
                    │   Wearable Data Layer      │
                    │   (Bidirezionale Offline)  │
                    ▼                            ▼
       ┌────────────────────────────────────────────────────────┐
       │   Motore Scientifico: Sovraccarico Progressivo         │
       │   Periodizzazione Mesocicli · Controllo RPE · TUT      │
       └────────────────────────────────────────────────────────┘
```

---

## 2. I Fondamenti Scientifici dell'Allenamento

### 2.1 Tensione Meccanica e Sovraccarico Progressivo
L'ipertrofia muscolare è regolata primariamente dalla **tensione meccanica** sviluppata dalle fibre contrattili. Il reclutamento delle unità motorie a soglia più elevata (secondo la Legge della Dimensione di Henneman) si verifica quando:
1. L'intensità di carico è elevata ($\ge 80\text{--}85\%$ 1RM), oppure
2. Le ripetizioni sono eseguite in prossimità del cedimento concentrico (ultime 3-5 ripetizioni con massimo sforzo).

GT Workout struttura la programmazione su due pilastri sequenziali:
- **Fase di Test dei Massimali:** individuazione accurata del massimale specifico per ciascun esercizio (1RM sui grandi multiarticolari a bilanciere, 3RM-10RM sugli esercizi accessori e macchine).
- **Fase 1 (Ipertrofia / Forza Ibrida):** applicazione rigorosa di un carico standardizzato al **$70\%$ del massimale testato**, associato a un volume prestabilito di ripetizioni e serie. In questo modo il carico stimolante è calibrato sul potenziale neuromuscolare reale dell'atleta.

---

### 2.2 Intensità Relativa, Scala RPE e Repetitions in Reserve (RIR)
L'atleta non possiede ogni giorno lo stesso potenziale contrattile: fluttuazioni del sonno, alimentazione e stress sistemico modulano la prontezza neurale. GT Workout integra il monitoraggio della scala **RPE (Rating of Perceived Exertion)** basata sul concetto di **RIR (Repetitions in Reserve)**:

| RPE | Ripetizioni in Riserva (RIR) | Descrizione Operativa |
|:---:|:---:|:---|
| **@10** | **0 RIR** | **Cedimento concentrico.** Impossibile completare un'ulteriore ripetizione mantenendo la tecnica corretta. |
| **@9** | **1 RIR** | **Target standard per serie allenanti.** Rimane esattamente 1 ripetizione nel serbatoio prima del cedimento. Massima stimolazione neurale con minima fatica eccedente. |
| **@8** | **2 RIR** | **Lavoro tecnico o prima serie accumulativa.** Rimangono 2 ripetizioni prima del cedimento. |
| **@7** | **3 RIR** | **Scarico parziale / riscaldamento finale.** Carico controllato, ottima velocità concentrica, bassissima fatica residua. |

```
Frequenza di reclutamento unità motorie
▲
│                       [ RPE 10 / 0 RIR ] Cedimento concentrico
│                    ┌───────────────────┐ (Fatica neurale esponenziale)
│              [ RPE 9 / 1 RIR ]         │
│           ┌───────────────────┐        │ ◄── ZONA OTTIMALE
│     [ RPE 8 ]                 │        │     DI STIMOLAZIONE
│  ┌────────┘                   │        │
└──┴────────────────────────────┴────────┴───────────────────────► Ripetizioni
```

---

### 2.3 Monitoraggio della Fatica Neurale e Drop Dinamico
Quando una serie viene portata a cedimento involontario (**RPE 10**) su un esercizio con più serie consecutive, la concentrazione di ioni idrogeno e la fatica sinaptica centrale riducono la frequenza di scarica dei motoneuroni per le serie successive. 

Se l'atleta tenta di mantenere il medesimo carico, subirà un brusco crollo nel volume di ripetizioni completate (es. da 8 reps a 5 reps), compromettendo il tonnellaggio totale.

**Algoritmo di Auto-Drop di GT Workout:**
Se l'atleta registra una serie a cedimento (@10) e mancano ancora serie al completamento dell'esercizio, l'applicazione suggerisce immediatamente un aggiustamento prudenziale:
$$\Delta\text{Carico} = -2.5\text{ kg}$$
Questo drop riduce la richiesta neurale conservando il volume programmato di ripetizioni e massimizzando il lavoro metabolico effettivo.

---

### 2.4 Time Under Tension (TUT) e Cadenza di Movimento
La velocità di esecuzione influenza drasticamente il tempo di tensione a cui è sottoposto il sarcomero. GT Workout definisce per ogni esercizio una specifica notazione a 4 cifre:

$$\mathbf{E} \cdot \mathbf{A} \cdot \mathbf{C} \cdot \mathbf{F}$$

- **E (Fase Eccentrica):** tempo in secondi impiegato nella discesa controllata del carico (es. 2 o 3 secondi). Favorisce il micro-danneggiamento muscolare controllato.
- **A (Pausa in Massimo Allungamento):** sosta isometrica al punto di massima estensione muscolare (es. 0 o 1 secondo). Elimina la componente viscoelastica elastica (riflesso miotatico).
- **C (Fase Concentrica):** tempo di risalita/spinta (es. 1 secondo o massima intenzione esplosiva).
- **F (Fermo Contrazione di Picco):** sosta isometrica al massimo accorciamento (es. 0 o 1 secondo per esercizi a profilo di resistenza favorevole in accorciamento come leg extension, pulley o alzate laterali).

*Esempio:* `3.0.1.0` per Stacco Rumeno o Panca Inclinata; `2.0.1.1` per Leg Extension e Pulley.

---

### 2.5 Densità dell'Allenamento e Jump Sets
I **Jump Sets** consistono nell'alternare serie di due esercizi per gruppi muscolari antagonisti o distanti (es. Trazioni e Lento Avanti, oppure Leg Extension e Leg Curl), intercalando un tempo di recupero fisiologico (60-90 secondi) anziché attendere il recupero completo sullo stesso gruppo (3-4 minuti).

**Vantaggi fisiologici:**
1. **Inibizione Reciproca:** la contrazione di un gruppo antagonista favorisce il rilassamento e l'irrorazione sanguigna dell'agonista.
2. **Elevata Densità Temporale:** riduzione del 40% del tempo totale di permanenza in palestra senza cali prestazionali di forza.
3. **Mantenimento dell'Attivazione Neurale:** il sistema nervoso centrale rimane termicamente e neuralmente attivo per tutta la durata del blocco.

---

### 2.6 Periodizzazione del Carico e Protocolli di Scarico (Deload)
Un mesociclo non può essere protratto a tempo indeterminato senza incorrere nell'accumulo di fatica sistemica e nella sindrome da sovrallenamento non funzionale (overreaching).

GT Workout organizza il programma in **Mesocicli da 4 a 6 settimane**:
- **Settimane 1–4:** Accumulo di volume e progressione del carico.
- **Avanzamento Automatico:** completata la serie dei 4 allenamenti (A, B, C, D), l'app avanza la settimana del mesociclo.
- **Settimana di Scarico (Deload):** attivabile con un tocco quando l'atleta registra cali motivazionali, dolori articolari o stagnazione.

L'app mette a disposizione due protocolli scientifici di scarico selezionabili:

```
┌────────────────────────────────────────────────────────────────────────┐
│                   MODALITÀ DI SCARICO PROGRAMMATO                      │
├───────────────────────────────────┬────────────────────────────────────┤
│   Scarico Parziale (Volume)       │   Scarico Medio (Intensità)        │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Riduzione di 1 serie per gruppo │ • Taglio del 10% sui carichi       │
│ • Intensità RPE target: @7        │ • Taglio del 50% sulle serie totali│
│ • Preserva il feeling sul peso    │ • Indicato per recupero articolare │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

### 2.7 Gestione del Volume Sistemico (MEV, MAV, MRV)
Nel Diario di Allenamento, GT Workout calcola il numero di **serie allenanti completate negli ultimi 7 giorni suddivise per gruppo muscolare**:
- **Gambe (Quadricipiti/Femorali/Glutei)**
- **Spalle / Deltoidi**
- **Dorso / Tirata**
- **Petto / Spinta**
- **Braccia (Bicipiti/Tricipiti)**
- **Addome / Core**

Questo consente all'atleta di verificare se il proprio volume si colloca all'interno della finestra di stimolo ottimale:
- **MEV (Minimum Effective Volume):** volume minimo per generare adattamenti (~8-10 serie settimanali).
- **MAV (Maximum Adaptive Volume):** volume in cui l'ipertrofia è massima (~12-18 serie settimanali).
- **MRV (Maximum Recoverable Volume):** limite oltre il quale subentra il catabolismo da mancato recupero (~22-25 serie settimanali).

---

## 3. Architettura e Funzionalità dell'Applicazione

### 3.1 Schermata Oggi (Dashboard Operativa)
La vista principale dell'applicazione fornisce la visione d'insieme dello stato corrente:

```
┌─────────────────────────────────────────────────────────┐
│ ≡ GT WORKOUT                             [Ciclo 1] [⚙]  │
├─────────────────────────────────────────────────────────┤
│ PROSSIMO ALLENAMENTO                                    │
│ SCHEDA A                                                │
│ Gambe · Addome                                          │
│ 8 esercizi · 24 serie totali · ~65 min                  │
│                                                         │
│ [ AVVIA ALLENAMENTO A ]                                 │
├─────────────────────────────────────────────────────────┤
│ STATO MESOCICLO                                         │
│ Settimana 2 · Fase 1 (Ipertrofia)                       │
│ [ Attiva Scarico ]  ·  [ + Avanza Settimana ]           │
├─────────────────────────────────────────────────────────┤
│ SCHEDE DISPONIBILI                                      │
│ [ A: Gambe/Addome ]    [ B: Spalle/Braccia ]            │
│ [ C: Dorso/Tricipiti ] [ D: Petto/Bicipiti ]            │
└─────────────────────────────────────────────────────────┘
```

- **Riconoscimento automatico della rotazione:** l'app propone la scheda successiva in base allo storico completato.
- **Stato del Mesociclo:** indica chiaramente settimana e modalità (ordinaria o scarico con badge dedicato).

---

### 3.2 Sessione di Allenamento (Workout Attivo)
Durante la sessione di allenamento, ogni esercizio è presentato con schede interattive chiare e ad alto contrasto per l'utilizzo in palestra:

```
┌─────────────────────────────────────────────────────────┐
│ SCHEDA A · Esercizio 1/8                                │
│ SQUAT CON BILANCIERE                                    │
│ Target: 4 serie × 8 rip · TUT: 2.0.1.0 · JS: No        │
├─────────────────────────────────────────────────────────┤
│ CARICO DI OGGI                                          │
│ 85.0 kg  [ -2.5 kg ]  [ +2.5 kg ]                       │
│ 70% di 121.5 kg (1RM) · Barra 20 kg + 32.5 kg per lato  │
├─────────────────────────────────────────────────────────┤
│ SERIE E RIPETIZIONI                                     │
│ [✓] Set 1:  8 rip  @85 kg  [@9 · RIR 1]  02:00 recupero │
│ [✓] Set 2:  8 rip  @85 kg  [@9 · RIR 1]  02:00 recupero │
│ [ ] Set 3:  8 rip  @85 kg  [@9 target]                  │
│ [ ] Set 4:  8 rip  @85 kg  [@10 cedimento finale]       │
├─────────────────────────────────────────────────────────┤
│ [ RECUPERA 120s ]          [ COMPLETA ALLENAMENTO ]     │
└─────────────────────────────────────────────────────────┘
```

- **Dettaglio Bilanciere:** per ogni esercizio a bilanciere, l'app mostra esattamente la composizione dei dischi per lato.
- **Correzione Rapida Serie:** toccando una serie già completata è possibile modificare al volo ripetizioni, carico o scala RPE.
- **Suggerimento Auto-Drop:** all'occorrenza di un cedimento (@10), un toast di conferma propone il decremento immediato di 2.5 kg.

---

### 3.3 Sistema di Timer e Dynamic Floating Pill
Il timer di recupero è progettato per non essere mai interrotto:
- **Audio Sintetizzato Web Audio API:** sequenza melodica squillante a tre toni al completamento del recupero (anche a schermo spento con le opportune impostazioni).
- **Vibrazione Aptica Differenziata:** sequenza doppia ad alta intensità.
- **Floating Island Pill (Dynamic Pill):** se l'atleta esce dalla schermata del workout per consultare il diario o i massimali, una pillola flottante rimane ancorata nella parte alta dello schermo con anello di progressione e countdown al secondo:

```
┌─────────────────────────────────────────────────────────┐
│   (●) 01:24 · Recupero Squat · Scheda A  [Apri →]      │
└─────────────────────────────────────────────────────────┘
```
Allo scadere del timer, la pillola si colora in rosso ad alto contrasto, pulsando continuamente finché l'utente non la tocca per rientrare nella scheda.

---

### 3.4 Protocollo di Test dei Massimali (1RM, 3RM, 5RM, 8RM, 10RM)
Per impostare i carichi scientifici, la fase iniziale o il cambio ciclo prevede il test guidato dei massimali:
1. **Stima di Partenza:** inserimento della stima o carico storico.
2. **Serie di Riscaldamento Algoritmiche:** l'app calcola automaticamente i set di avvicinamento a percentuale crescente (es. 50%, 65%, 80%) con basse ripetizioni per preparare il sistema nervoso senza accumulare acido lattico.
3. **Tentativi Ufficiali:** test del carico target. Se completato con successo (Valido), l'app propone il salto di carico successivo; se fallito (Nullo), archivia il massimale valido più alto.

```
       [ Stima Iniziale ] ──► [ Set 1: 50% × 5 reps ] (Riscaldamento)
                                      │
                              [ Set 2: 70% × 3 reps ] (Avvicinamento)
                                      │
                              [ Set 3: 85% × 1 rep  ] (Attivazione)
                                      │
                              [ Tentativo 1: 100% × 1 rep ]
                                 ┌────┴────┐
                             (Valido)   (Nullo)
                                 │         │
                        [ Salto +2.5kg ] [ Riconferma ]
```

---

### 3.5 Diario e Analytics del Volume per Gruppo Muscolare
Il diario registra in modo indelebile ogni sessione:
- **Tonnellaggio Totale:** volume complessivo in tonnellate o chilogrammi spostati nella sessione ($\sum \text{reps} \times \text{kg}$).
- **Distribuzione Settimanale Serie:** grafico a barre e tasselli con il conteggio delle serie allenanti per distretto corporeo.
- **Cronologia Dettagliata:** registro consultabile con data, durata, volume e singole serie svolte.

---

### 3.6 Impostazioni e Backup Dati
Tutti i dati risiedono localmente sul dispositivo dell'utente (`LocalStorage` / `IndexedDB`), garantendo **totale privacy e funzionamento offline al 100%**.
- **Esportazione Backup JSON:** genera un file strutturato con lo snapshot completo di massimali, storico, preferenze e stato del mesociclo.
- **Importazione Backup:** ripristina istantaneamente l'intero percorso di allenamento su un nuovo dispositivo o browser.
- **Regolazioni Fine:** peso del bilanciere vuoto, passo di arrotondamento (0.5 kg, 1 kg, 1.25 kg, 2.5 kg), tempi di recupero predefiniti distinti tra esercizi base e accessori.

---

## 4. Companion App Wear OS (Smartwatch)

GT Workout include un'applicazione nativa per smartwatch Wear OS (sviluppata in Kotlin e Jetpack Compose for Wear OS).

```
┌───────────────────────────────┐
│         GT WORKOUT            │
│            ● 128 BPM          │
├───────────────────────────────┤
│  SQUAT BILANCIERE             │
│  Set 2 di 4                   │
│  85.0 kg                      │
│                               │
│       [  FATTA  (8)  ]        │
├───────────────────────────────┤
│  Recupero: 01:42              │
│  [ -15s ]           [ +15s ]  │
└───────────────────────────────┘
```

### 4.1 Funzionalità della Companion Watch
1. **Completamento Serie al Polso:** toccando "FATTA", la serie viene spuntata e il timer di recupero parte simultaneamente sia sul polso che sul telefono.
2. **Monitoraggio Frequenza Cardiaca in Tempo Reale:** visualizza e traccia i battiti cardiaci durante la serie e il recupero tramite l'API `BODY_SENSORS`.
3. **Feedback Aptico di Fine Recupero:** vibrazione marcata direttamente al polso quando scade il timer, eliminando la necessità di guardare lo schermo del telefono.
4. **Sincronizzazione Bidirezionale Offline (Google Play Services Wearable):**
   - L'orologio memorizza la sessione anche se il telefono è nello spogliatoio.
   - Non appena i dispositivi rientrano nel raggio Bluetooth o sulla rete Wi-Fi, tutti i dati vengono accodati e sincronizzati senza alcun conflitto.

---

## 5. Guida Operativa Passo-Passo

### Primo Utilizzo (Setup Iniziale)
1. **Definizione dei Massimali:**
   - Vai nella sezione **Massimali**.
   - Per ciascuno degli esercizi delle Schede A, B, C, D, inserisci i tuoi massimali attuali oppure avvia la procedura di test guidata.
2. **Personalizzazione Parametri:**
   - Vai in **Impostazioni**.
   - Imposta il peso della tua barra bilanciere (es. 20 kg o 15 kg).
   - Verifica i tempi di recupero desiderati.

### Giorno di Allenamento
1. Apri la schermata **Oggi**: l'app mostrerà la scheda del giorno (es. Scheda A).
2. Tocca **Avvia Allenamento**.
3. Consulta il primo esercizio, controlla il carico calcolato automaticamente e il TUT indicato.
4. Esegui la serie e tocca la casella per spuntarla (o tocca "FATTA" sullo smartwatch).
5. Il timer di recupero si avvia automaticamente. Rilassati e attendi il segnale sonoro e la vibrazione prima della serie successiva.
6. A fine allenamento, tocca **Completa Allenamento**: la sessione viene archiviata nel diario e la scheda successiva (Scheda B) viene impostata automaticamente come prossima in rotazione.

---

## 6. Conclusioni e Best Practice di Progressione

Per massimizzare i risultati estetici e prestazionali con GT Workout, si consiglia di rispettare le seguenti linee guida:

1. **Non forzare carichi al di fuori del programma:** il carico del 70% 1RM è calibrato per costruire efficienza neurale e ipertrofia senza logorare le articolazioni.
2. **Rispettare la cadenza TUT:** 3 secondi di eccentrica controllata producono uno stimolo meccanico superiore rispetto a carichi più pesanti eseguiti balisticamente.
3. **Registrare fedelmente l'RPE:** se una serie è stata a cedimento (@10), segnalala: permetterà all'algoritmo di preservare le serie successive.
4. **Eseguire lo scarico ogni 4-6 settimane:** la supercompensazione avviene durante la fase di scarico; ignorarla porta a una prematura stagnazione della forza.

---
*GT Workout — Scienza Applicata all'Allenamento con Sovraccarichi.*
