# Technischer Entwurf: Sturzstein

## Stand und Verbindlichkeit

Dies ist der in S01 festgelegte Entwurf. Implementiert sind seit S02 Levelvalidator, native Beispieldaten,
Datenbundle-Werkzeug, Browser-Startgerüst und Testwerkzeuge. Seit S03 ist die DOM-unabhängige
Kernsimulation mit Grundelementen, Timer, Wertung und terminalen Zuständen implementiert.
Die Browser-Spielanbindung und weiteren Mechaniken sind noch geplant.
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
Zusätzliche Packs werden als Daten über Dateiauswahl und Browser File API importiert.
Es ist weder eine automatische Verzeichnissuche noch ein allgemeines Plugin-System vorgesehen.

## Module und Schnittstellen

Klassische Skripte registrieren ihre APIs unter `globalThis.Sturzstein`. Reine Module exportieren
zusätzlich dieselbe API per CommonJS für Node-Tests. Kein Bundler, keine transpilierten Quellen.

| Datei/Bereich (geplant) | Vertrag |
|---|---|
| `js/levels.js` | `parsePack(text, source)`, `validatePack(value, source)` liefern ein normalisiertes Pack oder werfen einen beschreibenden Fehler |
| `js/simulation.js` | `createState(pack, levelId)` erzeugt einen neuen Zustand; `step(state, {direction, grab})` verändert ihn um genau einen Tick |
| `js/clock.js` | Fester 100-ms-Akkumulator; rendert beliebig oft, pausiert bei Unterbrechungen statt große Sprünge nachzuholen |
| `js/input.js` | Hält Tastenstatus und liefert pro Tick eine Richtung oder `null` sowie `grab`; Menüaktionen getrennt |
| `js/renderer.js` | Zeichnet Zustand und vorherigen Zustand mit Interpolationsfaktor; verändert weder Simulation noch Zufall |
| `js/main.js` | Verbindet Module mit Browser, HUD, Pause und später Bildschirmverwaltung |
| `levels/*.json`, `js/level-bundle.js` | Maßgebliche Textdaten und generiertes, mitgeliefertes Bundle |
| `tools/`, `tests/` | Bundle-/Asset-Erzeugung und automatisierte Prüfungen |

Später kommen Replay-, Rückspul-, Speicher- und Audiomodule mit eigenen Verantwortlichkeiten hinzu.
Sie werden nicht durch leere Platzhalter vorweggenommen. Spielerische Pause gehört zur Anwendung,
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
- bei Erweiterung: Gegnerrichtungen, Explosionsalter/-ergebnis, Amöbenzustand und Wandtimer.

Felsen/Edelsteine tragen `falling`. Die Daten enthalten keine DOM-Referenzen, Funktionen, Maps oder Sets.
Kurzlebige Verarbeitungssätze innerhalb eines Ticks werden nicht gespeichert; Snapshots entstehen nur an Tickgrenzen.
Die Anwendung hält zusätzlich `usedRewind`: Dieses Kennzeichen bleibt nach erster Nutzung gesetzt,
auch wenn vor die Nutzung zurückgespult wird, und wird später mit der Partie gespeichert.

Das Starten erzeugt den Zustand immer neu aus unveränderten Leveldaten. Replays speichern Tick-Eingaben
und Versionsidentität, keine Browserereignisse oder Millisekunden. Rückspulen speichert begrenzte Snapshots
oder gleichwertige Deltas; die genaue Optimierung entscheidet S07 anhand gemessenen Speicherverbrauchs.

## Entwicklungswerkzeuge und Prüfungen

Node.js 24 LTS ist die Entwicklungsbasis; `node:test` und `node:assert/strict` benötigen keine Pakete.
Node-Werkzeuge erzeugen Bundle und PNG-Assets, Letztere mit Standardbibliotheken statt Grafikdownloads.
JavaScript bleibt bewusst klein und untranspiliert; syntaktische Prüfungen und Tests werden in S02 eingerichtet.
Ein Browser-Automationstool darf als reine Entwicklungsabhängigkeit hinzukommen, falls es für reale
`file://`-/HTTP-Prüfungen benötigt wird; keine Auswirkung auf die ausgelieferten Laufzeitdateien.

Die Simulation wird mit kleinen Rasterfällen geprüft. Die Anwendung wird über tatsächliche Browserstarts
geprüft, nicht allein über eine HTTP-Antwort. Browser-/Controllerstände und Einschränkungen werden
im zugehörigen Issue festgehalten. Testbefehle werden erst nach Einrichtung als vorhanden dokumentiert.
