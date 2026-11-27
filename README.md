# Sturzstein

Eigenständiges Höhlen-Action-Puzzle für den Browser, inspiriert von klassischen Boulder-Dash-Spielen.
Eigene Level, Grafiken und Regeln; keine Originalassets oder kopierten Originallevel.

## Aktueller Umfang

Der spielbare Stand enthält eine eigene Höhle mit Graben, Sammeln, Schieben,
Fall-/Abrollphysik, Zeitlimit, Sieg/Niederlage, Pause und Neustart.
Seit S05 sind Standard-Gamepads und der Competition Pro (040b:6533) sowie geräteabhängige Bedienhinweise integriert.
Seit S06 werden Partien als tickgenaue Replays aufgezeichnet und können heruntergeladen und geprüft werden.
Seit S07 lässt sich der vollständige Spielzustand mindestens zehn Sekunden zurückspulen, auch nach einer Niederlage.
Die vollständigen Produktanforderungen stehen in `PROMPT.md`.
Arbeitspakete und Abhängigkeiten: `ISSUE_PLAN.md`, aktueller Stand: GitHub-Issues.
Speicherung (S08), Gegner/Sondermechaniken,
Pack-Import und die vollständige Kampagne sind noch nicht implementiert.

## Start

**Online spielen:** https://deringo.github.io/sturzstein/

`index.html` direkt im Browser öffnen. Es werden keine Pakete, kein Build und kein Server benötigt.
Alternativ im Projektordner `python3 -m http.server 8000 --bind 127.0.0.1` starten und
`http://127.0.0.1:8000` aufrufen. Zum Beenden des Servers Strg+C drücken.

GitHub Pages veröffentlicht den Repository-Stamm von `main` automatisch nach Pushes.
`.nojekyll` sorgt für unveränderte statische Dateien; ein eigener Build-Workflow ist nicht erforderlich.

## Erste Höhle spielen

„Höhle betreten“ wählen, drei türkisfarbene Edelsteine einsammeln und den anschließend grün
leuchtenden Ausgang betreten. Die Erde lässt sich weggraben; Felsen können nach Entfernen
ihrer Unterlage herunterfallen. Ein bereits fallender Fels oder Edelstein ist tödlich.
Die schmale Mittelwand endet unten: Der Weg in die rechte Höhlenhälfte führt daran vorbei.

| Aktion | Tastatur |
|---|---|
| Bewegen / Erde weggraben | Pfeiltasten oder WASD |
| Benachbart graben/sammeln ohne Bewegung | Leertaste oder Umschalt halten und Richtung drücken |
| Fels horizontal schieben | Richtung kurz halten; das Feld hinter dem Fels muss frei sein |
| Pause/Fortsetzen | Esc oder P |
| Neustart | R; bei laufender Partie mit Bestätigung |
| Start/erneuter Versuch | Enter auf dem jeweiligen Knopf |
| Rückspulen im Spiel und nach Niederlage | Z oder U halten |

Menüknöpfe sind auch per Maus und Tab bedienbar. Beim Fokus-/Tabverlust oder einer längeren
Unterbrechung wird automatisch pausiert; erst bewusste Bestätigung setzt das Spiel fort.
Es gibt keine begrenzten Leben. Beim Schließen der Seite geht diese Partie aktuell noch verloren.

## Gamepad und Eingabegeräte

Controller anschließen und eine Taste drücken, damit der Browser ihn freigibt. Unterstützt wird
das Browser-Standard-Mapping sowie ein gezieltes Profil für den Competition Pro
„USB 2A4K GamePad“ (Vendor 040b, Product 6533) ohne Standard-Mapping.
Andere unbekannte Mappings werden ausdrücklich gemeldet statt geraten.

| Aktion | Standard-Gamepad |
|---|---|
| Bewegen / Menüauswahl | Steuerkreuz oder linker Stick |
| Graben/Sammeln ohne Bewegung | A halten und Richtung |
| Menüknopf betätigen | A |
| Zurück / Neustartdialog abbrechen | B |
| Rückspulen im Spiel und nach Niederlage | B halten |
| Pause/Fortsetzen | Start |
| Neustart mit Bestätigung | Y |

Beim Competition Pro bewegt der digitale Joystick die Figur und die Menüauswahl.
Die Belegung basiert auf den vom Nutzer unter Windows 11 / Edge gemeldeten Achsen und Tasten:

| Knopf | Aktion |
|---|---|
| Links groß (B0) | Bestätigen; im Spiel halten und Richtung zum Graben |
| Rechts groß (B1) | Im Spiel/nach Niederlage halten: Rückspulen; sonst Zurück/Abbrechen |
| Links klein (B2) | Neustart mit Bestätigung |
| Rechts klein (B3) | Pause/Fortsetzen |

Nach einem Bildschirmwechsel gehaltene Tasten/Stick erst loslassen, bevor die nächste Aktion erfolgt.
Bei diagonaler Stickstellung gewinnt die stärkere Achse; die Deadzone verhindert kleine unbeabsichtigte
Bewegungen. Beim Trennen des aktiv benutzten Controllers pausiert das Spiel.
Nach dem Wiederanschließen zuerst alle Tasten und den Stick loslassen, dann bewusst fortsetzen.
Tastatur, Maus und Controller lassen sich ohne Neuladen wechseln; die Hinweise passen sich an.
Menüauswahl funktioniert auch per Pfeiltasten/WASD; gehaltene Richtungen wiederholen kontrolliert.

Bei fehlender/blockierter Gamepad-API erscheinen Hinweise unter dem Spielfeld. Insbesondere bei
Einschränkungen unter `file://` den lokalen Webserver oder die HTTPS-Seite verwenden.
Die Tastatur bleibt nutzbar. Die Tonaktion (M) ist vorbereitet und meldet ausdrücklich,
dass Soundeffekte und Tonsteuerung erst in S14 hinzukommen.

## Rückspulen

Z/U, am Standard-Gamepad B oder am Competition Pro den großen rechten Knopf halten.
Das funktioniert während des Spiels und nach Tod/Zeitablauf; nach dem Loslassen geht es am
wiederhergestellten Punkt weiter. Im Pause-/Neustart-/Siegmenü bleibt B die Zurück-Aktion.
Rückspulen läuft mit einem Simulationstick pro 100 ms; Richtungseingaben werden dabei nicht ausgeführt.

Das HUD zeigt den verfügbaren Verlauf. Nach ausreichend Vorlauf sind mindestens zehn Sekunden
verfügbar; davor nur die bereits gespielte Zeit. Am ältesten verfügbaren Punkt bleibt die Welt
bis zum Loslassen stehen. Es gibt keinen Vorwärtssprung in die verworfene Zukunft.
Spielfeld, Zeit, Zähler, Punkte, Zufallszustand und alle Objektzustände werden gemeinsam wiederhergestellt.
Fokusverlust oder Controllertrennung pausiert auch während des Rückspulens.

Nach dem ersten tatsächlich rückgängig gemachten Tick bleibt der Lauf als **„Mit Rückspulen“**
gekennzeichnet – auch beim Rückspulen bis zum Anfang. Erst ein Neustart setzt Kennzeichnung und
Verlauf zurück. Die Replaydatei enthält nur die resultierende Eingabefolge und bewahrt die Kennzeichnung.
Persistente Spielstände und getrennte Bestwerte folgen in S08.
Der Verlauf hält höchstens elf vollständige Zustände und 109 Eingaben; Details und Speichermessung
stehen in der [Architektur](docs/architecture.md#rückspulverlauf-s07).
Der Nutzer hat das Rückspulen unter Windows 11 / Edge mit dem Competition Pro am
27. November 2026 bestätigt und S07 freigegeben.

## Entwicklung und Prüfungen

Node.js 24 LTS:

```sh
npm test
npm run check
npm run replay
npm run bundle
node tools/sprites.cjs
```

`npm run bundle` wird nur nach Änderungen an `levels/*.json` benötigt.
Die JSON-Dateien sind maßgeblich; `js/level-bundle.js` wird generiert und mitgeliefert.
`npm run check` prüft JavaScript-Syntax sowie Übereinstimmung von Bundle und Quellen.
`tools/sprites.cjs` erzeugt die eigenen 16×16-Pixel-Grafiken in `assets/tiles.png` ausschließlich
mit der Node-Standardbibliothek. Die fertige PNG liegt bei; keine Grafikwerkzeuge zum Spielen nötig.

Browserprüfungen benötigen ausschließlich zur Entwicklung zusätzliche Werkzeuge:

```sh
npm ci
npx playwright install chromium firefox
npm run test:browser
```

Diese Downloads sind nicht zum Spielen erforderlich. Automatisierte Browserprüfungen ersetzen
keine menschliche Beurteilung von Spielgefühl, Grafik oder Controllerhardware.

Die Prüfungen in Node und Playwright-Chromium/Firefox decken beide Startarten, einen Sieg durch
Tastatureingaben und simulierte Controller, Tod, Neustart, Pause, Fokusereignisse, variable
Fenstergrößen/Pixeldichten und große Höhlen ab. Die Lösung liegt als getaktete Eingabefolge im
mitgelieferten Replay; Browserdownloads werden gegen denselben Simulationszustand geprüft.
S04 wurde nach lokaler Screenshot-Sichtprüfung und Nutzer-Spielabnahme freigegeben.
S05 wurde am 27. November 2026 vom Nutzer mit echtem Competition Pro (040b:6533)
unter Windows 11 / Edge freigegeben: Erkennung und Spielbetrieb sowie Pause beim Abziehen
und bewusstes Fortsetzen nach Wiederanschließen ohne Neuladen wurden bestätigt.
Diese Hardwareabnahme gilt für die genannte Kombination; simulierte Gamepad-API-Tests
ersetzen keine weiteren Hardwaretests. Edge wird nicht automatisiert geprüft.

## Replay aufzeichnen und prüfen

Jede Partie wird automatisch ab dem Start aufgezeichnet. Im Pause-, Sieg- oder Niederlagendialog
„Replay herunterladen“ wählen. Pausen zählen nicht als Spielzeit; ein Neustart beginnt eine neue
Aufzeichnung. Auch unvollständige/verlorene Verläufe sind exportierbar, aber keine Lösungsnachweise.

`npm run replay` prüft alle mitgelieferten Lösungen ohne Browser. Einen eigenen Download prüfst du mit:

```sh
node tools/replay.cjs levels/einstieg.json /pfad/zum/heruntergeladenen.replay.json
```

Der Prüfer meldet Sieg, benötigte Ticks und Restzeit; fehlerhafte, inkompatible oder erfolglose
Replays führen zu einem Fehlerstatus. Die erste Höhle ist mit dem mitgelieferten Replay in
38 Ticks mit 116,2 Sekunden Restzeit lösbar. Format und Grenzen: [Replayformat](docs/replay-format.md).
Der Exportdialog ist in Chromium/Firefox automatisiert geprüft und wurde am 27. November 2026
vom Nutzer unter Windows 11 / Edge abgenommen. Der heruntergeladene Nutzerlauf wurde erfolgreich
bis zum Sieg abgespielt: 91 Ticks, 110,9 Sekunden Restzeit und 140 Punkte.
Visuelle Replay-Wiedergabe im Spiel ist nicht Teil dieses Schritts.

## Leveldaten und Architektur

`levels/einstieg.json` dient als eigene Formatvorlage.
Das native Format und die bewusst nicht implementierten Fremdformat-Importer sind in
[docs/level-format.md](docs/level-format.md) beschrieben.
Neue native JSON-Packs unter `levels/` ablegen, dann `npm run bundle` und die Prüfungen ausführen.
Der spätere Import im laufenden Spiel ist Teil von S11, aktuell noch nicht vorhanden.

[Architektur](docs/architecture.md), [Regeln](docs/rules.md) und
[Entscheidungen](docs/decisions/) dokumentieren die technischen Verträge.
Historische Referenzen und deren Lizenzgrenzen stehen im Rechercheabschnitt von `PROMPT.md`.

## Projektstruktur

| Pfad | Inhalt |
|---|---|
| `index.html`, `css/` | Startseite, HUD, Dialoge und Layout |
| `js/levels.js`, `levels/` | Gemeinsamer Validator und maßgebliche JSON-Level |
| `js/level-bundle.js` | Generierte integrierte Leveldaten |
| `js/simulation.js` | DOM-unabhängige deterministische Regeln |
| `js/replay.js`, `replays/` | Tick-Aufzeichnung, Replayformat/-prüfung und mitgelieferte Lösungen |
| `js/rewind.js` | Begrenzter Zustandsverlauf und tickgenaue Wiederherstellung |
| `js/clock.js` | Tick-Akkumulator |
| `js/input.js`, `js/gamepad.js` | Einheitliche Aktionen, Tastatur-/Gamepadzustand und Gerätewechsel |
| `js/renderer.js`, `assets/` | Pixelgenaue Canvas-Darstellung und eigene PNG-Sprites |
| `js/main.js` | Browseranbindung und Spielablauf |
| `tools/`, `tests/` | Erzeugungswerkzeuge, Logik- und Browsertests |
