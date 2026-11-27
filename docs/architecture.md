# Technischer Entwurf: Sturzstein

## Stand und Verbindlichkeit

Das Projekt befindet sich vor der Implementierung. Dieses Dokument enthält bisher nur die
Leitplanken aus `PROMPT.md`, keine Behauptung über bereits existierende Module.
S01 konkretisiert die Regeln und Schnittstellen, S02 richtet Projekt und Prüfwerkzeuge ein.
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

## In S01 noch festzulegen

- Tickdauer und Verarbeitungsreihenfolge einschließlich gleichzeitiger Ereignisse.
- Vollständige Spielregeln und Sonderfälle aller geforderten Objekte.
- Punktesystem, Freischaltung und Maßstab für Zeitreserven.
- Konkrete Zustandsstruktur, Schnittstellen und Dateiaufteilung.
- Symboltabelle, Parameter, Versionierungs-/Kompatibilitätsregeln und Datenlimits.
- Kleinste geeignete Entwicklungs- und Testwerkzeuge.

Für diese Punkte gelten die Abnahmekriterien von S01 in `ISSUE_PLAN.md`.
Wichtige Abwägungen erhalten einen Eintrag unter `docs/decisions/`; dieses Dokument beschreibt
anschließend die jeweils gültige Architektur, ohne Entscheidungsprotokolle zu duplizieren.
