# Lokale Speicherung (S08)

## Umfang und Ablage

`js/storage.js` speichert unter dem LocalStorage-Schlüssel `sturzstein.save` ein
UTF-8-JSON-Dokument mit `formatVersion: 1`. Es enthält ausschließlich lokale Spieldaten;
es gibt keinen Serverabgleich und keinen Upload. Browser, Browserprofil und Adresse bestimmen
den Speicherbereich. GitHub Pages, ein lokaler HTTP-Server und `file://` teilen ihn nicht automatisch.
Das Verhalten von LocalStorage bei `file://` ist browserabhängig; Einschränkungen werden angezeigt.

| Feld | Inhalt |
|---|---|
| `formatVersion` | Speicherformat, derzeit ausschließlich 1 |
| `settings` | `{ "showHints": true }`; boolesche Anzeige der Bedienhinweise |
| `progress` | Einträge mit `packId`, `levelId`, `unlocked`, `solved` |
| `bests` | Einträge mit `packId`, `levelId`, `levelRevision`, `ruleVersion`, `seed`, `usedRewind`, `score`, `ticks` |
| `session` | `null` oder `{ state, replay }` für die zuletzt gespeicherte Partie |

Alle Felder sind verpflichtend, unbekannte Felder werden abgewiesen.
IDs folgen dem Levelpack-Format. Die Listen dürfen keine doppelten Identitäten enthalten.
Als Grenzen gelten 8 MiB UTF-8 für das Dokument und jeweils 10.000 Fortschritts-/Bestwerteinträge.
Der Browser kann bereits deutlich vorher seine eigene LocalStorage-Quote erreichen.
Ein solcher Fehler wird angezeigt; die vorherige Speicherung bleibt erhalten.
Das ist kein unbegrenztes Archiv und keine externe Datensicherung.

## Stabile Identitäten und Bestwerte

Fortschritt ist an Pack-ID und Level-ID gebunden, nicht an Listenposition oder Packrevision.
Gelöste Level bleiben gelöst, auch wenn sie in einer Pack-Aktualisierung verschoben werden.
Gelöste sowie die ersten drei ungelösten Kampagnenlevel werden freigeschaltet;
bereits gespeicherte Freischaltungen werden beim Umsortieren nicht zurückgenommen.
Seit S09 berücksichtigt ein vorläufiger zyklischer Höhlenwechsel diese Freigaben.
Die vollständige Levelauswahl folgt in S12.

Bestwerte sind zusätzlich an Levelrevision, Regelversion, Anfangsseed und Rückspulklasse gebunden.
Ein Lauf ersetzt den passenden Bestwert nur bei höherer Punktzahl oder bei gleicher Punktzahl
und weniger Ticks. Ohne und mit Rückspulen sind zwei unabhängige Bestwerte.
Alte Revisionen und momentan nicht vorhandene Level bleiben im Profil erhalten, werden aber
nicht als aktuelle kompatible Bestwerte angezeigt. Die Packrevision allein entwertet nichts.

Ein Sieg markiert das Level als gelöst, aktualisiert den passenden Bestwert, schaltet weitere Level
frei und entfernt die laufende Partie aus `session`. Eine Niederlage markiert kein Level als gelöst.

## Vollständige Partie und Fortsetzen

`state` entspricht dem vollständigen JSON-Simulationszustand mit `stateVersion: 1`;
`replay` folgt dem [Replayformat](replay-format.md).
Der Rückspulmarker liegt in `replay.usedRewind`, außerhalb rückspulbarer Snapshots.
Eine Fortsetzung baut den Recorder aus der gesamten bisherigen Eingabefolge wieder auf,
damit weitere Eingaben und spätere Rückspul-Verzweigungen ein gültiges Replay ergeben.

Geladen wird nach Pack-/Level-ID, nicht nach der aktuell ersten Höhle.
Levelrevision, Regelversion, Seed und Simulationszustandsversion müssen passen.
Die Prüfung umfasst Pflichtfelder, Typen, Rastermaße, Objekt-IDs, Zelltypen, Stahlrand,
Figur/Ausgang, Schubzustand, Mechanikparameter, Zufallszustand, Zähler und Punkte.
Restticks müssen zur Levelzeit und Tickzahl passen; die Replaylänge muss genau der Tickzahl entsprechen.
Neue Mechaniken müssen diesen Zustandsvalidator zusammen mit ihrer Speicher-/Versionsentscheidung erweitern.
Seit S09 sind `beetle`/`butterfly` mit einer gültigen `direction` und `explosion` mit ganzzahligem
`remainingTicks` von 0 bis 3 sowie `result: "empty"` oder `"gem"` zugelassen. Explosionen können nicht
bei Tick 0 vorkommen; nach Explosionstod darf die gespeicherte Spielerzelle eine Explosion enthalten.
Die zusätzlichen Zellvarianten ändern keine bisher gültigen Zustände, daher bleiben Speicherformat
und Simulationszustandsversion 1. Ketten werden vollständig innerhalb eines Ticks abgewickelt;
es gibt keine persistente, versteckte Explosionswarteschlange.

Die gesamte Partie wird zum Laden nicht nochmals tickweise durchsimuliert: Das könnte bei einer großen,
langen Höhle die Oberfläche blockieren. Geprüft werden Struktur und Zustandsinvarianten.
Die separate Replayprüfung bleibt der Weg zum vollständigen Nachspielen. LocalStorage-Daten und
Bestwerte sind kein kryptografischer Manipulationsschutz.

Die Welt bleibt im Fortsetzen-Dialog angehalten. Erst „Gespeicherte Partie fortsetzen“ beginnt
die Uhr neu ab dem gespeicherten Tick; Offlinezeit wird nicht abgezogen.
„Neu beginnen …“ erfordert Bestätigung, bevor die gespeicherte Partie ersetzt wird.
Der temporäre Rückspulverlauf wird nicht gespeichert und beginnt beim geladenen Zustand neu.
`usedRewind` bleibt trotzdem erhalten. Ein bereits verlorener Versuch kann wieder angezeigt
und als Replay exportiert werden; ohne alten Rückspulverlauf muss er neu gestartet werden.

## Schreibzeitpunkte und Fehlerbehandlung

Während Vorwärts- und Rückwärtsspiel wird an jeder durch zehn teilbaren Tickgrenze gespeichert,
also normalerweise einmal je aktiver Spielsekunde. Hinzu kommen Start/Fortsetzen,
Loslassen nach Rückspulen, Pause, Sieg, Niederlage, Bestätigungsdialoge und `pagehide`.
Einstellungen werden direkt nach ihrer Änderung gespeichert.
Ein abrupter Browser-/Rechnerabsturz kann seit dem letzten erfolgreichen Schreibvorgang gespielte
Ticks verlieren; `pagehide` ist keine garantierte Absturzsicherung.

Ein vollständiges Dokument wird durch einen einzigen `setItem`-Aufruf ersetzt.
„Lokal gespeichert“ erscheint erst nach erfolgreichem Schreiben.
Verweigerter Zugriff, erschöpfte Quote, defektes JSON, unbekannte Versionen und inkompatible
Partien werden sichtbar gemeldet und in der Konsole protokolliert.
Das Spiel bleibt mit Daten im Arbeitsspeicher nutzbar.

Nach einem Lesefehler oder inkompatiblen Spielstand sind automatische Schreibvorgänge gesperrt:
Die ursprünglichen Browserdaten werden weder gelöscht noch durch Standardwerte ersetzt.
Soweit das Profil lesbar war, bleiben Einstellungen und Fortschritt in der Sitzung verfügbar.
Bei einem reinen Schreibfehler wird an den folgenden Speicherzeitpunkten erneut versucht.
Vor jedem gewöhnlichen Schreiben wird außerdem geprüft, ob der Schlüssel gegenüber dem zuletzt
gelesenen/geschriebenen Stand geändert wurde, etwa durch eine andere Registerkarte.
Dann wird nicht überschrieben; die Anzeige fordert zum Neuladen auf.
Das ist keine tabübergreifende Transaktions- oder Zusammenführungsfunktion.

Bei gesperrtem Speicher bietet das Menü „Speicherdaten ersetzen …“ mit eigenem Bestätigungsdialog.
Abbrechen lässt die Browserdaten unverändert. Bestätigen ersetzt sie durch die Daten dieser Sitzung:
lesbare Fortschritte/Bestwerte bleiben erhalten, unlesbare Daten sind nicht rekonstruierbar.
Die inkompatible alte Partie wird verworfen; eine inzwischen gespielte temporäre Partie wird
anschließend erneut gespeichert. Schlägt das Schreiben fehl, wird kein Erfolg behauptet.

## Prüfgrenzen

Node-Tests prüfen Rundlauf und Weiterführung vollständiger Zustände, getrennte Bestwerte,
Freischaltungen, Umsortieren, Revisionen, beschädigte Daten, fremde Änderungen, verweigerten Zugriff
und Quotenfehler. Browserprüfungen decken `file://` und HTTP, Neuladen, einen neu geöffneten Tab,
bewusste Wiederaufnahme ohne Offlinezeitabzug, Replayfortsetzung, Einstellungen und Fehlerdialoge ab.
Speichern/Fortsetzen wurde für S08 vom Nutzer unter Windows 11 / Edge bestätigt.
Die Erweiterung um laufende Explosionen ist automatisiert geprüft; der S09-Zwischenstand wurde
am 27. November 2026 vom Nutzer abgenommen.
