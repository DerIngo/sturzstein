# Sturzstein

Eigenständiges Höhlen-Action-Puzzle für den Browser, inspiriert von klassischen Boulder-Dash-Spielen.
Eigene Level, Grafiken und Regeln; keine Originalassets oder kopierten Originallevel.

## Aktueller Umfang

Der erste spielbare Stand (S04) enthält eine eigene Höhle mit Graben, Sammeln, Schieben,
Fall-/Abrollphysik, Zeitlimit, Sieg/Niederlage, Pause und Neustart.
Die vollständigen Produktanforderungen stehen in `PROMPT.md`.
Arbeitspakete und Abhängigkeiten: `ISSUE_PLAN.md`, aktueller Stand: GitHub-Issues.
Gamepad (S05), Replays (S06), Rückspulen (S07), Speicherung (S08), Gegner/Sondermechaniken,
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

Der S04-Stand wurde mit 40 Node-Tests und zehn automatisierten Browserprüfungen in
Playwright-Chromium/Firefox geprüft. Abgedeckt sind beide Startarten, ein Sieg durch echte
Tastatureingaben, Tod, Neustart, Pause, Fokusereignisse, variable Fenstergrößen/Pixeldichten
und große Höhlen. Die Lösung liegt als getaktete Tastaturfolge im Browsertest;
das separate Replay-Dateiformat folgt in S06. Eine lokale Screenshot-Sichtprüfung wurde durchgeführt.
Eine menschliche Spielabnahme sowie Tests in Edge und mit echter Controllerhardware stehen aus.

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
| `js/clock.js`, `js/input.js` | Tick-Akkumulator und Tastaturaktionen |
| `js/renderer.js`, `assets/` | Pixelgenaue Canvas-Darstellung und eigene PNG-Sprites |
| `js/main.js` | Browseranbindung und Spielablauf |
| `tools/`, `tests/` | Erzeugungswerkzeuge, Logik- und Browsertests |
