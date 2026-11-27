# Natives Levelpack-Format, Version 1

Vertrag aus S01, Implementierung ab S02. JSON in UTF-8, keine ausführbaren Inhalte.
Alle Angaben sind erforderlich, außer dem Objekt `parameters` und dessen einzelnen Feldern.

## Struktur

Pack: `formatVersion: 1`, `id`, `title`, `author`, `revision`, `source`, `license`, `levels`.
`levels` ist eine geordnete Liste von 1 bis 100 Leveln.

Level: `id`, `revision`, `ruleVersion: 1`, `name`, `description`, `difficulty` (1–5),
`width`, `height`, `timeLimit` (Sekunden), `quota`, `seed`, `map` und optional `parameters`.
`map` enthält genau `height` gleich lange Zeichenketten mit je `width` Zeichen.
Genau ein Start und genau ein Ausgang sind erforderlich; der gesamte äußere Rand besteht aus Stahl.

IDs sind 1–64 ASCII-Zeichen aus Kleinbuchstaben, Ziffern und Bindestrich, beginnen mit Buchstabe/Ziffer.
Pack-IDs sind sammlungsweit, Level-IDs innerhalb eines Packs eindeutig.
Revisionen sind positive ganze Zahlen. Texte sind nicht leere Zeichenketten bis 500 Zeichen;
Titel/Name/Autor höchstens 100 Zeichen. Herkunft und Lizenz werden als Text, nicht als HTML behandelt.
`source` und `license` dokumentieren Herkunft bzw. Rechtehinweis; sie erteilen nicht automatisch Nutzungsrechte.
Unbekannte Felder werden abgewiesen, damit Schreibfehler nicht still andere Regeln ergeben.

## Symbole

| Zeichen | Element |
|---|---|
| Leerzeichen | Freier Raum |
| `.` | Erde |
| `#` | Unzerstörbarer Stahl |
| `+` | Zerstörbare Mauer |
| `@` | Spielerstart |
| `O` | Ruhender Fels |
| `*` | Ruhender Edelstein |
| `X` | Ausgang |
| `u`, `r`, `d`, `l` | Glutkäfer nach oben, rechts, unten, links |
| `U`, `R`, `D`, `L` | Kristallfalter nach oben, rechts, unten, links |
| `A` | Amöbe |
| `M` | Umwandlungswand |

Startzustände wie Explosion oder fallender Fels werden nicht im Kartenformat angeboten.
Sie entstehen durch die Simulation. Seit S09 werden alle acht Gegnersymbole einschließlich
Startorientierung unterstützt. Seit S10 teilen alle `A` eine Wachstumsfront und alle `M`
die Aktivierungszeit ihres Levels. Eine Umwandlungswand beginnt bereit für den ersten fallenden Treffer.

## Grenzen und Parameter

| Wert | Grenze/Standard |
|---|---|
| Datei | höchstens 1 MiB UTF-8 vor JSON-Parsing |
| Breite/Höhe | jeweils 5–128 Zellen |
| Gesamte Kartenflächen je Pack | höchstens 65.536 Zellen |
| Zeitlimit | 10–3.600 ganze Sekunden |
| Edelsteinquote | 0–65.536, unabhängig von der Anzahl zu Beginn |
| Seed | ganze Zahl 0–4.294.967.295 |
| Revision | ganze Zahl 1–2.147.483.647 |
| `amoebaGrowthTicks` | 1–600, Standard 10 (eine Sekunde) |
| `amoebaMaxCells` | 1–16.384, Standard 200 |
| `magicWallTicks` | 1–36.000, Standard 200 (20 Sekunden) |

Grenzen halten Parsing, Rasterarbeit und Snapshots überschaubar. Gesamtzellengrenze und Dateilimit
verhindern, dass 100 maximale Höhlen ungebremst Speicher belegen. Die spätere Sammlung erhält in S11
zusätzlich ein dokumentiertes Gesamtlimit unter Berücksichtigung des lokalen Speicherbudgets.
Parameter werden normalisiert; explizite ungültige Werte werden niemals durch Standardwerte ersetzt.

## Identität und Kompatibilität

Formatversion bezeichnet die Datenstruktur, Regelversion die Simulationssemantik.
Pack-Revision bezeichnet eine Änderung der Sammlung; Fortschritt hängt nicht von der Listenposition ab.
Spielstände, Bestwerte und Replays sind an Pack-ID, Level-ID, Levelrevision und Regelversion gebunden.
Karten-/Parameteränderungen erfordern eine höhere Levelrevision. Nur Umsortieren/Ergänzen ändert die
Pack-Revision, nicht die unveränderten Levelrevisionen.
Bei Import derselben Identität mit geändertem Levelinhalt ohne höhere Revision wird das Pack abgewiesen.
Kein Laden einer inkompatiblen Partie durch stilles Zurücksetzen einzelner Felder.

Speicherformat und Replayformat erhalten bei ihrer Implementierung eigene Versionsnummern.
Ihr Kernvertrag ist bereits fest: kompletter Zustand bzw. Anfangsidentität/Seed und diskrete Tick-Aktionen.
Unbekannte Versionen erfordern eine ausdrückliche Fehlermeldung, nicht eine bestmögliche Interpretation.

## Fremdformate

Die C-Implementierung verwendet Kopfzeilen und Zeichenraster. Größe, Zeit und Quote lassen sich
prinzipiell zuordnen, ihre Wasser-/Verfolgermechaniken und ihr dynamisch entstehender Ausgang aber nicht.
Ein späterer Konverter muss diese Abweichungen melden, nicht still Ersatzobjekte einsetzen.
BDCFF enthält auch Parameter, Varianten und Konstruktionsanweisungen; ein Rasterleser wäre keine
vollständige BDCFF-Unterstützung. Nur native Packs sind Pflichtumfang.
Links und Hinweise zu Nutzungsrechten stehen im Rechercheabschnitt von `PROMPT.md`.
