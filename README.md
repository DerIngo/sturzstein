# Sturzstein

Eigenständiges Höhlen-Action-Puzzle für den Browser, inspiriert von klassischen Boulder-Dash-Spielen.
Eigene Level, Grafiken und Regeln; keine Originalassets oder kopierten Originallevel.

## Aktueller Umfang

Der spielbare Stand enthält eine eigene Höhle mit Graben, Sammeln, Schieben,
Fall-/Abrollphysik, Zeitlimit, Sieg/Niederlage, Pause und Neustart.
Seit S05 sind Standard-Gamepads sowie geräteabhängige Bedienhinweise integriert.
Die vollständigen Produktanforderungen stehen in `PROMPT.md`.
Arbeitspakete und Abhängigkeiten: `ISSUE_PLAN.md`, aktueller Stand: GitHub-Issues.
Replays (S06), Rückspulen (S07), Speicherung (S08), Gegner/Sondermechaniken,
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

Menüknöpfe sind auch per Maus und Tab bedienbar. Beim Fokus-/Tabverlust oder einer längeren
Unterbrechung wird automatisch pausiert; erst bewusste Bestätigung setzt das Spiel fort.
Es gibt keine begrenzten Leben. Beim Schließen der Seite geht diese Partie aktuell noch verloren.

## Gamepad und Eingabegeräte

Controller anschließen und eine Taste drücken, damit der Browser ihn freigibt. Unterstützt wird
das Browser-Standard-Mapping; andere Mappings werden ausdrücklich gemeldet statt geraten.

| Aktion | Standard-Gamepad |
|---|---|
| Bewegen / Menüauswahl | Steuerkreuz oder linker Stick |
| Graben/Sammeln ohne Bewegung | A halten und Richtung |
| Menüknopf betätigen | A |
| Zurück / Neustartdialog abbrechen | B |
| Pause/Fortsetzen | Start |
| Neustart mit Bestätigung | Y |

Nach einem Bildschirmwechsel gehaltene Tasten/Stick erst loslassen, bevor die nächste Aktion erfolgt.
Bei diagonaler Stickstellung gewinnt die stärkere Achse; die Deadzone verhindert kleine unbeabsichtigte
Bewegungen. Beim Trennen des aktiv benutzten Controllers pausiert das Spiel.
Tastatur, Maus und Controller lassen sich ohne Neuladen wechseln; die Hinweise passen sich an.
Menüauswahl funktioniert auch per Pfeiltasten/WASD; gehaltene Richtungen wiederholen kontrolliert.

Bei fehlender/blockierter Gamepad-API erscheinen Hinweise unter dem Spielfeld. Insbesondere bei
Einschränkungen unter `file://` den lokalen Webserver oder die HTTPS-Seite verwenden.
Die Tastatur bleibt nutzbar. Rückspulen (Z/U bzw. B im Spiel) und Ton (M) liefern bereits abstrakte
Aktionen, zeigen derzeit aber ausdrücklich an, dass die Funktionen erst in S07/S14 hinzukommen.

## Entwicklung und Prüfungen

Node.js 24 LTS:

```sh
npm test
npm run check
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
Browsertest; das separate Replay-Dateiformat folgt in S06.
S04 wurde nach lokaler Screenshot-Sichtprüfung und Nutzer-Spielabnahme freigegeben.
Für S05 stehen der echte Controller-Spieltest und die Nutzerabnahme noch aus.
Simulierte Gamepad-API-Tests ersetzen keine Controllerhardware. Edge ist bisher nicht geprüft.

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
| `js/clock.js` | Tick-Akkumulator |
| `js/input.js`, `js/gamepad.js` | Einheitliche Aktionen, Tastatur-/Gamepadzustand und Gerätewechsel |
| `js/renderer.js`, `assets/` | Pixelgenaue Canvas-Darstellung und eigene PNG-Sprites |
| `js/main.js` | Browseranbindung und Spielablauf |
| `tools/`, `tests/` | Erzeugungswerkzeuge, Logik- und Browsertests |
