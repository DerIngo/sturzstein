# Technischer Entwurf: Sturzstein

## Stand und Verbindlichkeit

Dies ist der in S01 festgelegte Entwurf. Implementiert sind seit S02 Levelvalidator, native Beispieldaten,
Datenbundle-Werkzeug, Browser-Startgerüst und Testwerkzeuge. Seit S03 ist die DOM-unabhängige
Kernsimulation mit Grundelementen, Timer, Wertung und terminalen Zuständen implementiert.
Seit S04 sind Canvas-Darstellung, Tick-Akkumulator, Tastatureingabe und der vollständige kleine
Browser-Spielablauf implementiert. Die späteren Mechaniken und Komfortmodule bleiben geplant.
S05 ergänzt Standard-Gamepads, ein Competition-Pro-Profil, Gerätewechsel und einheitliche Menü-/Spielaktionen.
S06 ergänzt tickgenaue Browseraufzeichnung, JSON-Export und eine DOM-unabhängige Replay-Lösungsprüfung.
S07 ergänzt begrenzten Rückspulverlauf, Wiederherstellung nach Niederlage und verzweigte Replays.
S08 ergänzt versionierte lokale Speicherung mit bewusster Wiederaufnahme, Fortschritt und getrennten Bestwerten.
S09 ergänzt Wandfolge-Gegner, Explosionsketten, eigene animierte Sprites und zwei weitere Beispielhöhlen.
S10 ergänzt die Amöbe und die zeitgesteuerte Umwandlungswand.
Die konkreten Regeln stehen in [rules.md](rules.md), die Datenverträge in [level-format.md](level-format.md).
Verifizierte Aufrufe stehen in der README und in den Projekt-Instructions.
Der aktuelle Bearbeitungsstatus gehört in die GitHub-Issues, nicht in eine zweite Aufgabenliste hier.

## Vorgegebene Architektur

| Bereich | Verantwortung |
|---|---|
| Simulation | Diskrete Rasterregeln, fester Tick, vollständiger expliziter Zustand; ohne DOM, Canvas und echte Uhr |
| Eingabe | Tastatur, Gamepad und Maus auf kontextabhängige Aktionen abbilden |
| Darstellung | Canvas, eigene PNG-Sprites, Animationen, Kamera und rein visuelle Interpolation |
| Audio | Eigene Sounds aus Spielereignissen; keine Rückwirkung auf die Simulation |
| Levelverwaltung | Native JSON-Packs, Validierung, stabile Identitäten und Versionen |
| Speicherung | Validierte Spielstände, Fortschritt, Bestwerte, Einstellungen und importierte Packs |
| Oberfläche | Bildschirme, HUD, Menüs, Hilfen und verständliche Fehlerrückmeldungen |

Ein gemeinsamer Simulationszustand muss Replays, Rückspulen und Speichern/Fortsetzen tragen.
Er enthält auch Zufallsgeneratorzustand, Objektzustände, Timer, Punkte und Zähler.
Neue Mechaniken dürfen keine versteckten Zustände außerhalb dieses Modells einführen.

## Start und Leveldaten

Das ausgelieferte Spiel startet ohne Installation oder Build durch Öffnen von `index.html`.
Ein lokaler Webserver ist eine Alternative, keine Voraussetzung.
Die mitgelieferten JSON-Quelldaten werden durch ein Entwicklungswerkzeug in ein klassisches
Skript-Datenbundle überführt. Das Bundle wird mitgeliefert und nicht separat von Hand gepflegt.
Zusätzliche Packs werden seit S11 als Daten über Dateiauswahl und Browser File API importiert.
`js/packs.js` prüft Sammlungsgrenzen und Revisionskompatibilität. `SaveStore` speichert
Zusatzpacks und zugehörige Profildaten gemeinsam. Die scrollbare Packverwaltung bietet direkten
Zugriff auf Zusatzhöhlen. Metadaten werden ausschließlich als Text angezeigt.
Es ist weder eine automatische Verzeichnissuche noch ein allgemeines Plugin-System vorgesehen.

## Module und Schnittstellen

Klassische Skripte registrieren ihre APIs unter `globalThis.Sturzstein`. Reine Module exportieren
zusätzlich dieselbe API per CommonJS für Node-Tests. Kein Bundler, keine transpilierten Quellen.

| Datei/Bereich (S02–S10) | Vertrag |
|---|---|
| `js/levels.js` | `parsePack(text, source)`, `validatePack(value, source)` liefern ein normalisiertes Pack oder werfen einen beschreibenden Fehler |
| `js/simulation.js` | `createState(pack, levelId)` erzeugt einen neuen Zustand; `step(state, {direction, grab})` verändert ihn um genau einen Tick |
| `js/replay.js` | Versionierte Replayvalidierung, `Recorder.record(input)`, `truncate(tick)`, `Recorder.fromReplay(pack, replay)` und `play(pack, replay)` |
| `js/rewind.js` | `RewindHistory.push(state, input)` speichert Tickgrenzen; `back()` stellt den vorherigen Gesamtzustand wieder her |
| `js/storage.js` | `SaveStore` kapselt LocalStorage-Zugriff, Profilvalidierung, vollständiges Fortsetzen und Fehlerbehandlung |
| `js/clock.js` | Fester 100-ms-Akkumulator; rendert beliebig oft, pausiert bei Unterbrechungen statt große Sprünge nachzuholen |
| `js/input.js` | `InputManager.update(now)` für Menüaktionen; `sample()` liefert Tick-Eingaben, `rewinding()` liest die Halteaktion ohne Eingabepuffer zu verbrauchen |
| `js/gamepad.js` | Standard-Mapping, Deadzone, Tastenkanten, Polling, Hotplugging und sichtbare API-Fehler |
| `js/renderer.js` | Zeichnet Zustand und vorherigen Zustand mit Interpolationsfaktor; verändert weder Simulation noch Zufall |
| `js/main.js` | Verbindet Module mit Browser, HUD, Pause und später Bildschirmverwaltung |
| `levels/*.json`, `js/level-bundle.js` | Maßgebliche Textdaten und generiertes, mitgeliefertes Bundle |
| `tools/`, `tests/` | Bundle-/Asset-Erzeugung und automatisierte Prüfungen |

Später kommen Audio und dauerhafte Packverwaltung hinzu, ohne leere Platzhalter vorwegzunehmen.
Spielerische Pause gehört zur Anwendung,
nicht als Echtzeitquelle in die Simulation. Render-/Soundereignisse sind aus Zustandsänderungen ableitbar.

## Vollständiger Simulationszustand

Ein JSON-serialisierbares Objekt enthält:

- `stateVersion`, Pack-ID, Level-ID/-Revision und Regelversion als Kompatibilitätsidentität;
- Breite/Höhe, `board` als flaches Zeilenraster mit Zellen `{type, id, ...Objektzustand}`;
  freie Felder haben `id: 0`, alle Objekte stabile positive IDs und `nextId` für spätere Erzeugung;
- `playerIndex`, `exitIndex`, `tick`, `remainingTicks`, `collected`, `quota`, `score`;
- `status` (`playing`, `won`, `lost`) und `reason`;
- `rngState` als 32-Bit-Zahl und Mechanikparameter;
- `push` mit Zielindex, Richtung und bisheriger Haltedauer;
- Gegner mit `direction`, Explosionen mit `remainingTicks` und `result`;
- Amöbenzellen als `amoeba`, in Höhlen mit Umwandlungswand außerdem `wallActivatedAt`
  und je `magicWall` der letzte blockierte Treffer `blockedAt`.

Felsen/Edelsteine tragen `falling`. Die Daten enthalten keine DOM-Referenzen, Funktionen, Maps oder Sets.
Kurzlebige Verarbeitungssätze innerhalb eines Ticks werden nicht gespeichert; Snapshots entstehen nur an Tickgrenzen.
Seit S07 hält die Anwendung außerhalb der Simulationssnapshots zusätzlich `recorder.replay.usedRewind`:
Dieses Kennzeichen bleibt nach dem ersten tatsächlich zurückgenommenen Tick gesetzt,
auch wenn vor die Nutzung zurückgespult wird, und wird seit S08 mit der Partie gespeichert.

Das Starten erzeugt den Zustand immer neu aus unveränderten Leveldaten. Replays speichern Tick-Eingaben
und Versionsidentität, keine Browserereignisse oder Millisekunden. Rückspulen kombiniert begrenzte
vollständige JSON-Snapshots mit den dazwischenliegenden Eingaben (siehe S07 unten).

## Gegner und Explosionen (S09)

`beetle` folgt der linken, `butterfly` der rechten Wand. `direction` nutzt dieselben vier Richtungsnamen
wie die Eingabe. Startorientierungen stammen aus den Levelzeichen. Bewegung erfolgt nur in freie Zellen,
höchstens einmal pro Tick anhand einer Rastermomentaufnahme der Gegner-IDs nach der Fallphase.
Kontaktprüfung nach Spieleraktion und nach jeder Gegnerbewegung löst betroffene Gegner sofort aus.

Ketten werden innerhalb desselben Ticks über eine nach Rasterindex sortierte Warteschlange abgewickelt,
nicht rekursiv. Erfasste Gegner werden sofort durch Explosionszellen ersetzt; ihre vorgemerkten Zentren
und Ergebnisse bleiben bis zur Abarbeitung erhalten. IDs verhindern doppelte Auslösung.
Pro betroffenem Feld entstehen `type: "explosion"`, eine neue ID, `remainingTicks: 3` und
`result: "empty"` oder `"gem"`. Bestehende Explosionen behalten ID und Alter; nur das Ergebnis kann
zu `"empty"` wechseln. Stahl schützt ausschließlich sein eigenes Feld; das Ausgangsfeld bleibt auch
mit der gerade eintretenden Figur geschützt.

Die Alterung läuft vor der Spieleraktion. Nach drei vollständigen gesperrten Folgeticks (Zähler 2, 1, 0)
werden die Zellen im nächsten Tick aufgelöst. Neue Edelsteine erhalten neue IDs und `falling: false`;
ein temporärer Verarbeitungssatz schließt sie für diesen Tick von Fall-/Abrollbewegungen aus.
Alle dauerhaften Daten liegen im JSON-Raster; Replay und Rückspulverlauf brauchen keinen Sonderpfad.
Der Speicherprüfer kennt die zusätzlichen Zellvarianten und erkennt ungültige Richtungen, Timer und Ergebnisse.

Regelversion und `stateVersion` bleiben 1: Die neuen Mechaniken erfüllen den bereits festgelegten Vertrag
und betreffen zuvor abgewiesene Levelzeichen. Bestehende gültige Level, Zustände und Replays bleiben unverändert.
Das Einstiegspack erhält Revision 2 durch Ergänzung; die erste Höhle behält ihre ID, Revision und ihren Seed.

Ein vorläufiger zyklischer Höhlenwechsel bietet die freigeschalteten Beispiele in Pack-Reihenfolge an.
Vor Ersetzung der Partie steht ein Bestätigungsdialog; Abbrechen erhält auch eine noch nicht fortgesetzte
Speicherung. Fortschritt und Bestwerte bleiben ID-basiert. Dies ersetzt nicht die vollständige Levelauswahl S12.
Zwei Spritephasen je Gegner, eine Drehung zur Blickrichtung und vier Explosionsphasen machen die Zustände
sichtbar, ohne Simulationsdaten oder Tickdauer zu verändern.

## Amöbe und Umwandlungswand (S10)

Nach der Gegnerphase sammelt die Simulation alle Amöbenzellen und ihre freien oder mit Erde
gefüllten orthogonalen Nachbarfelder. Ein Set zählt jedes Ziel einmal, auch zwischen getrennten
Amöben. Zum Wachstumstick wird die Front nach Rasterindex sortiert. Genau ein Aufruf von
`nextRandom` wählt das Ziel. Nach dem Wachstum entfällt dieses Feld aus der Front, seine
geeigneten Nachbarn kommen hinzu. Zellzahl und Front reichen für die sofortige gemeinsame
Umwandlung aus. Am Tickende tragen erzeugte Felsen und Edelsteine neue IDs und sind ruhend.

Beim ersten fallenden Treffer hält `wallActivatedAt` für die ganze Höhle den aktuellen Tick fest.
Die aktive Zeit endet zu Beginn von Tick `wallActivatedAt + magicWallTicks`. In der Fallphase
belegt eine erfolgreiche Ausgabe das freie Feld mit einer neuen Objekt-ID. Diese ID kommt erst
in der Fallliste des nächsten Ticks vor. Bei blockierter Ausgabe speichert das getroffene Wandfeld
den Tick in `blockedAt`. Der Renderer zeichnet dort kurz ein blinkendes rotes Kreuz. Die Pfeile
an der Wand wechseln bei Aktivierung von Kupfer zu laufendem Violett, nach Ablauf erscheint ein
grauer Strich. Auch der Puls der Amöbe folgt allein dem gespeicherten Zustand.

Das Einstiegspack erhält durch Anhängen der beiden Beispielhöhlen Revision 3. Die drei vorhandenen
Level behalten Inhalt, Revision und Seed. Für ihre Zustandsform sowie die Speicher- und Replayversionen
gilt die [Kompatibilitätsentscheidung im Speicherformat](storage-format.md#vollständige-partie-und-fortsetzen).

## Entwicklungswerkzeuge und Prüfungen

Node.js 24 LTS ist die Entwicklungsbasis; `node:test` und `node:assert/strict` benötigen keine Pakete.
Node-Werkzeuge erzeugen Bundle und PNG-Assets, Letztere mit Standardbibliotheken statt Grafikdownloads.
JavaScript bleibt bewusst klein und untranspiliert; syntaktische Prüfungen und Tests werden in S02 eingerichtet.
Ein Browser-Automationstool darf als reine Entwicklungsabhängigkeit hinzukommen, falls es für reale
`file://`-/HTTP-Prüfungen benötigt wird; keine Auswirkung auf die ausgelieferten Laufzeitdateien.

Die Simulation wird mit kleinen Rasterfällen geprüft. Die Anwendung wird über tatsächliche Browserstarts
geprüft, nicht allein über eine HTTP-Antwort. Browser-/Controllerstände und Einschränkungen werden
im zugehörigen Issue festgehalten. Testbefehle werden erst nach Einrichtung als vorhanden dokumentiert.

## Browserdarstellung und Zeitquelle (S04)

`FixedClock` verwendet den monotonen Wert von `performance.now()` sowohl beim bewussten Start
als auch beim Frame-Aufruf. Der rAF-Zeitstempel wird nicht mit diesem Wert vermischt:
Firefox kann einen vor dem Startklick liegenden Frame-Zeitstempel liefern.
Unterbrechungen über 250 ms pausieren statt mehrere Physikschritte unbemerkt nachzuholen.
Fokus-/Sichtbarkeitswechsel pausieren unabhängig davon sofort. Beim Fortsetzen werden
Zeitakkumulator und Eingabepuffer zurückgesetzt.

Canvas-Backing-Store entspricht CSS-Größe mal Geräte-Pixeldichte. Sprites werden nur mit
ganzzahligen Geräte-Pixel-Faktoren gezeichnet, Kameraversatz und interpolierte Positionen
auf Geräte-Pixel gerundet. Die Kamera bleibt innerhalb der Weltgrenzen; kleine Höhlen sind zentriert.
Overlay-Menüs und HUD sind DOM-Elemente, die Simulation bleibt davon unabhängig.
Fokussierte Schaltflächen zeigen unabhängig von der Eingabeart einen sichtbaren Rahmen.
Dieser nutzt `:focus`, nicht nur `:focus-visible`: Nach einem Mausklick erkennen Browser
eine anschließende Gamepad-Navigation nicht zuverlässig als Wechsel zur Tastaturnavigation.

## Einheitliche Eingabe (S05)

Tastatur und Gamepad liefern dieselben diskreten Richtungen und Aktionsflags; Menübefehle sind
von Simulationseingaben getrennt. Rückspulen ist seit S07 angeschlossen; Ton bleibt bis S14 eine
vorbereitete Aktion mit sichtbarem Hinweis auf die noch fehlende Spielfunktion.

Die Gamepad-API wird pro Renderframe gelesen, auch im Menü. Standard-Mapping hat Vorrang.
Zusätzlich wird der Competition Pro (USB-ID 040b:6533) bei leerem Mapping akzeptiert:
Chromium/Edge-ID mit `Vendor: 040b Product: 6533` oder Firefox-ID mit Präfix `040b-6533-`,
mindestens zwei Achsen und vier Buttons. Kein allgemeines Raten für andere Geräte.
Die vom Nutzer unter Windows 11 / Edge bestätigten digitalen Achsen 0/1 liefern links/oben
mit -1 und rechts/unten mit +1. B0 ist Graben/Bestätigen, B1 Rückspulen/Zurück,
B2 Neustart und B3 Pause. Profile ändern nur die Eingabeübersetzung, nicht die Simulation.
Bedienhinweise folgen dem aktiven Profil auch beim Wechsel zwischen zwei Gamepads.
Stick-Einschaltung ab 0,35, Rückkehr zur Neutralstellung unter 0,25; stärkere Achse gewinnt.
Bei Gleichstand bleibt eine noch passende Richtung erhalten, sonst gewinnt die vertikale Richtung.
Steuerkreuz hat Vorrang vor Analogstick; entgegengesetzte Steuerkreuzrichtungen heben sich auf.
Menübewegung erfolgt sofort, nach 350 ms erneut und danach alle 150 ms. Die Spielbewegung
bleibt an den unveränderten 100-ms-Simulationstick gebunden.

Bestätigen, Zurück, Pause und Neustart werden nur beim Drücken ausgelöst, nicht in jedem Frame.
Bildschirmwechsel sperren noch gehaltene Controlleraktionen bis zur Neutralstellung. Kurze
Richtungseingaben werden bis zum nächsten Simulationstick gepuffert.
Das zuletzt aktiv verwendete Gerät steuert; ein nur weiter gehaltener Stick übernimmt nicht
ungefragt nach einer Tastatur-/Mausaktion. Bei mehreren Controllern wählt eine neue relevante
Eingabe das Gerät; bei gleichzeitig neuen Eingaben gilt die Reihenfolge der API-Liste.

Controllertrennung wird über Ereignisse und Polling erkannt. Nur der zuletzt aktiv verwendete
Controller löst bei Trennung die Pause aus. Während Fokusverlust/unsichtbarem Tab werden
Controlleraktionen nicht verarbeitet. Nach Rückkehr müssen zunächst alle Controlleraktionen
losgelassen werden; kein unbewusstes Fortsetzen durch eine außerhalb des Fensters gedrückte Taste.
Nach aktiver Controllertrennung bleibt die Neutralstellungssperre auch ohne angeschlossenen Controller
und über Bildschirmwechsel bestehen. Beim Wiederanschließen darf ein gehaltenes B nicht als neue
Zurück-/Fortsetzen-Aktion die Trennungspause beenden.
Fehlende API, verweigerter Zugriff und unbekanntes Mapping erhalten deutsche Hinweise.
Browser-API-Tests verwenden simulierte Controller; der echte Hardwaretest bleibt gesonderte Abnahme.

## Replayaufzeichnung und Prüfung (S06)

`Replay.Recorder` bindet eine neue Partie an Pack-/Level-ID, Levelrevision, Regelversion und
Anfangsseed. `record(input)` normalisiert die Simulationseingabe, komprimiert gleiche aufeinanderfolgende
Ticks und liefert genau die Richtung/Grabeaktion zurück, die `main.js` an `Simulation.step` übergibt.
Menü-/Pausenaktionen und Renderzeit gelangen nicht in den Verlauf. Ein Neustart ersetzt ihn.

`parseReplay`, `validateReplay` und `stringifyReplay` liefern strikt validierte Daten bzw. JSON.
`play` erzeugt einen frischen Zustand aus dem passenden Level, prüft Identität und Seed,
führt jeden Tick aus und liefert Endzustand, Tickzahl und Restzeit. Optional kann `onTick(state)`
für Prüfungen den vollständigen aktuellen Zustand lesen; der Callback darf ihn nicht verändern.
Ein Sieg ist standardmäßig erforderlich; nur Zustandsanalysen können `requireWin: false` verwenden.
Eingaben hinter einem terminalen Zustand bleiben auch dabei ein Fehler.

Die Anwendung bietet Downloads in Pause, Sieg und Niederlage an; der Download verändert den
Simulationszustand nicht. `tools/replay.cjs` prüft alle mitgelieferten Level oder ein angegebenes Dateipaar
ohne Browser. Format, Ressourcengrenzen, Kompatibilität und Aufrufe stehen in
[replay-format.md](replay-format.md).

## Rückspulverlauf (S07)

`RewindHistory` speichert den Anfangszustand und alle zehn Ticks einen vollständigen JSON-Snapshot.
Höchstens elf Snapshots und 109 Eingaben bleiben erhalten. Bei einem neuen zwölften Snapshot
entfallen der älteste Snapshot und die ersten zehn Eingaben. Nach genügend Vorlauf sind dadurch
immer 100 bis 109 vergangene Ticks verfügbar, also mindestens zehn Sekunden bei Regelversion 1.
Nach Rückspulen steht entsprechend weniger Vergangenheit zur Verfügung, bis neue Ticks hinzukommen.

`back()` rekonstruiert den unmittelbar vorherigen Tick aus dem nächstgelegenen Snapshot und
höchstens neun Aufrufen derselben Simulation. Die gespeicherten Zustände werden dabei nie mutiert.
JSON-Snapshots enthalten sämtliche Zustandsfelder einschließlich Zufallszustand und Schubfortschritt;
es gibt keine pflegebedürftige Liste einzelner zurückzuspulender Mechanikfelder.
Neue Mechaniken müssen weiter ausschließlich im JSON-Zustand und in `Simulation.step` leben.
Rekonstruktion führt keine Browser-, Audio- oder Speichernebenwirkungen aus.

Das Rückspulen entfernt sofort die verworfenen Eingaben und späteren Snapshots.
`Recorder.truncate(state.tick)` kürzt auch einen teilweise verworfenen Eingabeblock und setzt
`usedRewind` dauerhaft außerhalb der Snapshots. Die resultierende Eingabefolge bleibt von Levelbeginn
an reproduzierbar. Format 2 transportiert die Laufkennzeichnung; Format 1 wird weiterhin gelesen.
Ein Neustart erzeugt Recorder und Verlauf neu. S08 speichert Zustand, Replay und Laufkennzeichnung
gemeinsam, jedoch nicht den temporären Rückspulverlauf.

`main.js` unterscheidet den UI-Zustand `rewinding` von `playing`: Der unveränderte 100-ms-Takt
führt entweder einen Vorwärts- oder einen Rückwärtsschritt aus. Während Rückspulen und am leeren
Verlaufsrand läuft die Simulation nicht vorwärts. Loslassen setzt erst ab dem nächsten vollständigen
Tick bewusst fort. Das Bild zeigt den wiederhergestellten Zustand ohne Vorwärtsinterpolation.
`usedRewind` ändert sich erst bei tatsächlicher Wiederherstellung, nicht beim Drücken an leerem Verlauf.

Der Eingabekontext `lost` erhält Menüauswahl/Bestätigung, interpretiert B jedoch als Rückspulen.
Beim Wechsel ins Rückspulen bleibt nur bewusst der gehaltene Eingabezustand erhalten; sonst gelten
weiterhin die Loslasssperren. Fokusverlust, Zeitunterbrechung und Controllertrennung unterbrechen auch
das Rückspulen. Nach Wiederkehr wird nicht automatisch fortgesetzt.

### Speicherentscheidung und Messung

Hundert vollständige Rasterkopien wurden zugunsten von elf Snapshots plus Eingaben vermieden.
Der Verlauf ist durch Anzahl und die maximalen Levelabmessungen begrenzt; er wächst nicht mit der
Partiedauer. Der Recorder für die gesamte Partie bleibt separat auf maximal 36.000 Ticks begrenzt.

Gemessen am 27. November 2026 unter Node.js 24.13.1 auf Linux: jeweils 109 neutrale Vorwärtsticks,
danach 100 einzelne Rückwärtsschritte. Die große Testkarte bestand aus 128×128 Feldern mit Stahlrand,
Start/Ausgang und sonst Felsen. Das sind Prüfdaten, kein mitgeliefertes Kampagnenlevel.

| Karte | Snapshot-/Eingabe-Nutzdaten als UTF-16 | Rückschritt im Mittel / Maximum |
|---|---:|---:|
| Erste Höhle, 20×12 | 0,15 MiB | 0,09 / 1,04 ms |
| Felsgefüllte Maximalkarte, 128×128 | 14,40 MiB | 9,84 / 23,42 ms |

Die Nutzdatenmessung zählt zwei Bytes je gespeichertem JSON-Zeichen, nicht den gesamten JavaScript-Heap.
Zusätzlicher Verwaltungs-/Parser-/Simulationsspeicher und kurzlebige Rekonstruktionszustände kommen hinzu.
Die Zeitmessung ist keine Browser-/Hardwareabnahme und keine Zusicherung von 60 FPS auf jeder Karte.

## Lokale Speicherung (S08)

`SaveStore` erhält den Speicherzugriff als Funktion; auch ein bereits beim Lesen von `localStorage`
ausgelöster Browserfehler wird dadurch abgefangen und sichtbar gemeldet.
Das versionierte Dokument verbindet Einstellungen, ID-basierten Fortschritt, revisions-/regelgebundene
Bestwerte je Rückspulklasse und maximal eine Partie aus vollständigem Zustand plus Replay.
Bekannte und aktuell unbekannte Fortschritts-/Bestwerteinträge bleiben erhalten.
Die initial drei ungelösten Kampagnenfreigaben werden ergänzt, bestehende Freigaben nicht zurückgenommen.

`restoreSession` validiert Identität, Struktur und Zustandsinvarianten gegen die passende Leveldefinition.
`Recorder.fromReplay` stellt Eingabeverlauf, Tickzähler, Seedbindung und Laufkennzeichnung wieder her.
Zum Schutz vor langen Ladeblockaden wird nicht die ganze Partie erneut simuliert; der Replayprüfer
bleibt separat verfügbar. Der Rückspulverlauf startet mit dem geladenen Snapshot und ist anfangs leer.
Die Anwendung zeigt zuerst einen Fortsetzen-Dialog und setzt den Zeitakkumulator erst bei Bestätigung zurück.

Schreibvorgänge erfolgen etwa einmal pro Spielsekunde und zusätzlich an Bildschirm-/Lebenszyklusgrenzen.
Ein Ladefehler sperrt Schreiben, bis der Nutzer das Ersetzen bestätigt. Quoten-/Zugriffsfehler beim
Schreiben lassen das Spiel weiterlaufen, ohne erfolgreiche Speicherung vorzutäuschen.
Ein Vergleich mit dem zuletzt gelesenen/geschriebenen Dokument erkennt zwischenzeitliche Änderungen
vor dem nächsten Schreiben und schützt sie vor automatischem Überschreiben.
Format, Grenzen, Validierung, Wiederherstellung und bewusstes Ersetzen:
[storage-format.md](storage-format.md).
