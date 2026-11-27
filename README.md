# Sturzstein

Eigenständiges Höhlen-Action-Puzzle für den Browser, inspiriert von klassischen Boulder-Dash-Spielen.
Eigene Level, Grafiken und Regeln; keine Originalassets oder kopierten Originallevel.

## Aktueller Umfang

Die technische Grundlage mit geprüftem Levelpack-Format ist eingerichtet.
Ein spielbarer Stand folgt mit S04; die vollständigen Produktanforderungen stehen in `PROMPT.md`.
Arbeitspakete und Abhängigkeiten: `ISSUE_PLAN.md`, aktueller Stand: GitHub-Issues.

## Start

`index.html` direkt im Browser öffnen. Es werden keine Pakete, kein Build und kein Server benötigt.
Alternativ im Projektordner `python3 -m http.server 8000 --bind 127.0.0.1` starten und
`http://127.0.0.1:8000` aufrufen. Zum Beenden des Servers Strg+C drücken.

## Entwicklung und Prüfungen

Node.js 24 LTS:

```sh
npm test
npm run check
npm run bundle
```

`npm run bundle` wird nur nach Änderungen an `levels/*.json` benötigt.
Die JSON-Dateien sind maßgeblich; `js/level-bundle.js` wird generiert und mitgeliefert.
`npm run check` prüft JavaScript-Syntax sowie Übereinstimmung von Bundle und Quellen.

Browserprüfungen benötigen ausschließlich zur Entwicklung zusätzliche Werkzeuge:

```sh
npm ci
npx playwright install chromium firefox
npm run test:browser
```

Diese Downloads sind nicht zum Spielen erforderlich. Automatisierte Browserprüfungen ersetzen
keine menschliche Beurteilung von Spielgefühl, Grafik oder Controllerhardware.

## Leveldaten und Architektur

`levels/einstieg.json` dient als eigene Formatvorlage.
Das native Format und die bewusst nicht implementierten Fremdformat-Importer sind in
[docs/level-format.md](docs/level-format.md) beschrieben.
Neue native JSON-Packs unter `levels/` ablegen, dann `npm run bundle` und die Prüfungen ausführen.
Der spätere Import im laufenden Spiel ist Teil von S11, aktuell noch nicht vorhanden.

[Architektur](docs/architecture.md), [Regeln](docs/rules.md) und
[Entscheidungen](docs/decisions/) dokumentieren die technischen Verträge.
Historische Referenzen und deren Lizenzgrenzen stehen im Rechercheabschnitt von `PROMPT.md`.
