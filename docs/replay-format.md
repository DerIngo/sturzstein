# Replayformat und Lösungsprüfung

## Zweck und Version

Ein Replay beschreibt ausschließlich die tatsächlichen Simulationseingaben ab Levelbeginn.
Browserereignisse, Renderframes und Pausendauer gehören nicht hinein. Aktuell ausgegeben wird
Formatversion 2 als UTF-8-JSON; ein optionales UTF-8-BOM wird beim Lesen akzeptiert.
Formatversion 1 aus S06 bleibt lesbar und wird zu Version 2 mit `usedRewind: false` normalisiert.
Version 2 ergänzt die ausdrückliche Laufkennzeichnung; ältere S06-Prüfer unterstützen sie nicht.
Es ist weder ein Spielstand noch eine neue Leveldefinition.

Das vollständige Lösungsbeispiel liegt unter
`replays/sturzstein-einstieg/erste-schritte.json`.

```json
{
  "formatVersion": 2,
  "packId": "sturzstein-einstieg",
  "levelId": "erste-schritte",
  "levelRevision": 1,
  "ruleVersion": 1,
  "seed": 137,
  "usedRewind": false,
  "inputs": [
    { "ticks": 3, "direction": "right", "grab": false },
    { "ticks": 2, "direction": null, "grab": false }
  ]
}
```

Dieser kurze Ausschnitt ist ausdrücklich keine Lösung.

## Felder und Kompatibilität

Alle gezeigten Felder sind Pflichtfelder; unbekannte Felder werden abgewiesen.

| Feld | Bedeutung |
|---|---|
| `formatVersion` | Ausgabe 2; Eingabe 1 oder 2 |
| `packId`, `levelId` | Stabile IDs gemäß Levelpack-Format, keine Listenpositionen |
| `levelRevision` | Positive Revision des tatsächlich gespielten Levels |
| `ruleVersion` | Simulationsregeln, derzeit ausschließlich 1 |
| `seed` | Anfangsseed des Levels, ganzzahlig von 0 bis 4294967295 |
| `usedRewind` | Pflichtfeld in Version 2: `true`, sobald der Lauf mindestens einen Tick zurückgespult hat |
| `inputs` | Geordnete Folge aus Eingabeblöcken; leerer Verlauf ist keine Lösung |
| `ticks` | Positive Anzahl aufeinanderfolgender Simulationsticks mit derselben Eingabe |
| `direction` | `null`, `up`, `right`, `down` oder `left` |
| `grab` | `true` für Graben/Sammeln ohne Bewegung, sonst `false` |

Der erste Block beginnt bei Tick 1. Jeder Tick einschließlich neutraler Eingaben wird erfasst.
Gleiche aufeinanderfolgende Eingaben werden bei der Aufzeichnung zu einem Block zusammengefasst;
auch unkomprimierte Blöcke mit `ticks: 1` sind gültig.
Die Zeitbasis folgt der Regelversion: derzeit 100 ms pro Tick.

Pack-ID, Level-ID, Levelrevision, Regelversion und Anfangsseed müssen zum geprüften Level passen.
Ein Replay überschreibt den Levelseed nicht. Die Packrevision wird absichtlich nicht gebunden:
Ergänzungen oder Umsortierungen eines Packs dürfen Replays unveränderter Level nicht entwerten.
Eine inhaltliche Leveländerung muss daher dessen Revision erhöhen.
Replays sind kein kryptografischer Manipulationsschutz.
`usedRewind` ist Laufmetadatum, kein Teil des rückspulbaren Simulationszustands.
Version 1 besitzt dieses Feld nicht und stammt aus der Version ohne Rückspulfunktion.

## Grenzen und Fehler

Textdateien dürfen höchstens 4 MiB UTF-8 umfassen. Höchstens 36.000 Eingabeblöcke und insgesamt
36.000 Ticks entsprechen dem maximal erlaubten Levelzeitlimit von einer Stunde bei Regelversion 1.
Auch die unkomprimierte, formatierte Ausgabe des Recorders passt in dieses Dateilimit.
Zusätzlich darf ein Replay das konkrete Levelzeitlimit nicht überschreiten.

Fehler nennen Quelle bzw. Feld und werden nicht still repariert. Ungültiges JSON, unbekannte Felder,
Versionen oder Richtungen, falsche Identität/Revision/Seed, fehlende Dateien, Zeitablauf,
Niederlage oder ein Verlauf ohne Sieg führen im Prüfwerkzeug zu Exitstatus 1.
Eingaben nach Sieg oder Niederlage werden nicht ignoriert, sondern ebenfalls abgewiesen.

`Replay.play(pack, replay)` verlangt standardmäßig einen Sieg. Nur für Zustandsvergleiche und
Fehlersuche kann `requireWin: false` gesetzt werden; das macht einen unvollständigen oder verlorenen
Verlauf nicht zum Lösungsnachweis. Der CLI-Prüfer verwendet diese Ausnahme nie.

## Browseraufzeichnung und Export

Jeder Start bzw. Neustart erzeugt einen neuen Recorder. Der Browser zeichnet genau die an
`Simulation.step` übergebenen Richtungen und Grabeaktionen auf – unabhängig von Tastatur oder Controller.
Pause, Fokusverlust und Downloaddialoge erzeugen keine zusätzlichen Simulationsticks.
Rückspulaktionen werden nicht als negative Ticks gespeichert: S07 kürzt den Verlauf bis zum
wiederhergestellten Tick und ersetzt die verworfene Zukunft durch neue Eingaben.
`usedRewind` bleibt dabei gesetzt, auch beim Rückspulen bis zum Start. Erst ein neuer Lauf setzt es zurück.
Die Wiedergabe erzeugt so denselben finalen Simulationszustand, nicht die zwischenzeitlichen Rückspulbilder.

Im Pause-, Sieg- und Niederlagendialog steht nach mindestens einem Tick „Replay herunterladen“
zur Verfügung. Der Export verändert die Partie nicht. Auch ein verlorener oder abgebrochener
Verlauf kann zur Fehlersuche heruntergeladen werden.
Die Datei heißt `<packId>--<levelId>.replay.json`. Der Browser entscheidet über Speicherort und
Downloadfreigabe; die Spielmeldung bestätigt nur die Anforderung, nicht das Speichern auf dem Datenträger.
Ein Replay-Import oder eine visuelle Replay-Wiedergabe im Spiel gehört nicht zu S06.

## Prüfen ohne Browser

Node.js 24 LTS, keine zusätzlichen Pakete erforderlich:

```sh
npm run replay
npm run replay -- levels/einstieg.json replays/sturzstein-einstieg/erste-schritte.json
node tools/replay.cjs levels/einstieg.json /pfad/zum/heruntergeladenen.replay.json
```

Ohne Argumente prüft das Werkzeug alle Level sämtlicher mitgelieferter `levels/*.json`.
Jedes Level benötigt `replays/<packId>/<levelId>.json`; fehlende Nachweise sind Fehler.
Mit genau zwei Argumenten werden ein natives Levelpack und eine Replaydatei geprüft.
Alle Wege verwenden dieselbe DOM-unabhängige Simulation wie das Spiel.

Bei Erfolg wird je Replay Ergebnis, Tickzahl, Restzeit, Punktzahl und Rückspulkennzeichnung ausgegeben; Exitstatus ist 0.
Das mitgelieferte Beispiel gewinnt nach 38 Ticks mit 116,2 Sekunden Restzeit und 146 Punkten.
Seit S09 liegen außerdem `glutkaefer-tor.json` und `kristallkette.json` im selben Replayverzeichnis.
Beide gewinnen nach 21 Ticks mit 87,9 Sekunden Restzeit; die Kristallkette erfordert erst erzeugte Edelsteine.
Gegnerbewegungen und Explosionen entstehen aus derselben Simulation, ohne zusätzliche Replayfelder.
Tests vergleichen außerdem den vollständigen Zustand an jeder Tickgrenze über wiederholte Läufe
sowie heruntergeladene Browseraufzeichnungen mit ihrem tatsächlichen Endzustand.
