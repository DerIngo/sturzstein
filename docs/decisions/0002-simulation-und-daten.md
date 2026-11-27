# 0002: Eigene deterministische Regeln und einfache Browserarchitektur

Datum: 2026-11-27
Status: angenommen

## Kontext

Das Spiel muss per Doppelklick laufen, später vollständig rückspulbar sein und zusätzliche Level laden.
Eine Originalemulation oder Übernahme fremder Engines würde Umfang und Lizenzabhängigkeiten vergrößern.

## Entscheidung

Klassische Skripte, reines JavaScript und ein gemeinsamer Namespace statt Framework oder ES-Modullader.
Dieselben reinen Module sind per CommonJS in Node testbar. Native JSON-Packs werden für den
Offline-Start in ein mitgeliefertes Skript-Bundle überführt.

100-ms-Ticks und ein vollständig serialisierbarer Simulationszustand sind die gemeinsame Grundlage
für Spiel, Replay, Rückspulen und Speicherung. Regeln und Limits sind in `rules.md` und `level-format.md`
festgelegt. Darstellung interpoliert, verändert aber keine Regeln.

Der Nutzer bestätigte Tempo, Wertung, Zeitreserve und drei gleichzeitig zugängliche ungelöste
Kampagnenlevel im Rahmen von S01. Weitere Regelprioritäten sind eigene konsistente Festlegungen,
keine Behauptung einer originalgetreuen Emulation.

## Konsequenzen

Kein Build zum Spielen, keine Laufzeitdownloads und keine allgemeinen Plugin-/Physiksysteme.
Entwicklungswerkzeuge dürfen Bundles/Assets erzeugen; fertige Ergebnisse werden eingecheckt.
Node-Standardbibliotheken genügen zunächst für die Logiktests.
Deterministische Scanfolge muss ausdrücklich getestet werden; Regeländerungen benötigen eine
Versionsentscheidung und erneute Lösungsprüfungen. Nicht implementierte Mechaniken werden abgewiesen.
