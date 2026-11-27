# Sturzstein-Regeln, Version 1

Entwurf aus S01 für eine eigenständige Umsetzung, keine C64-Emulation.
Das vollständige Regelwerk ist das Implementierungsziel; Gegner/Explosionen sind seit S09 implementiert,
Amöbe und Umwandlungswand folgen in S10. Noch fehlende Mechaniken werden beim Laden abgewiesen.

## Zeit, Bewegung und Wertung

Ein Simulationstick dauert 100 ms. Die Welt läuft auch bei neutraler Eingabe weiter.
Pro Tick höchstens ein Bewegungsschritt bzw. eine Grabeaktion; keine diagonale Bewegung.
Gleichzeitige Richtungen werden in der Eingabeschicht durch die zuletzt gedrückte aufgelöst.
Schieben benötigt zwei unmittelbar aufeinanderfolgende Ticks derselben Richtung gegen denselben
ruhenden Fels (200 ms Haltezeit einschließlich des ersten Ticks). Unterbrechung setzt den Versuch zurück.

Die mit dem Nutzer bestätigte Wertung: 10 Punkte je eingesammeltem Edelstein und beim Sieg
ein Punkt je voller verbleibender Sekunde. Kein Bonus für Graben, Gegner oder Rückspulen.
Zeitlimits sind ganze Sekunden. Tod und Zeitablauf führen zur Niederlage, nicht zu Lebensverlusten.
Sieg und Niederlage frieren die Simulation ein; Neustart verwendet wieder denselben Seed.

Die Hauptkampagne lässt gelöste Level sowie die ersten drei ungelösten Level in Pack-Reihenfolge zu.
Zusatzpacks lassen alle Level zu. Ein Kampagnenlevel muss mindestens 30 % und mindestens 10 Sekunden
mehr Zeit bieten als der erfolgreiche Lösungsreplay benötigt (größere Reserve gilt).
Das ersetzt nicht den menschlichen Fairness-/Schwierigkeitstest.

## Tick-Reihenfolge

1. Nur für `playing`: Tick erhöhen und temporäre Verarbeitungsliste leeren.
2. Bereits laufende Explosionen altern/auflösen; ablaufende aktive Wandtimer verringern.
3. Spieleraktion ausführen, anschließend direkten orthogonalen Gegnerkontakt prüfen.
4. Felsen/Edelsteine aus einer Momentaufnahme ihrer IDs von oben nach unten, links nach rechts verarbeiten.
   Jedes Objekt wird höchstens einmal verarbeitet; in diesem Tick geschobene Objekte fallen erst im nächsten.
5. Gegner in derselben stabilen Rasterreihenfolge bewegen; Kontakte und ausgelöste Explosionen sofort abwickeln.
6. Amöbe auf Einschließung/Übergröße prüfen, gegebenenfalls wachsen lassen und erneut prüfen.
7. Restzeit um einen Tick verringern, dann Abschlusspriorität: Tod vor Zeitablauf vor Ausgangserfolg.

Ein neu erzeugtes Objekt wird nicht erneut im selben Tick verarbeitet.
Anfang und Ende eines Ticks sind die einzigen Snapshot-Grenzen.
Bei Eintritt in den offenen Ausgang wird der Spieler bis zum Tickende als dort stehend behandelt;
das Ausgangsfeld bleibt vor Felsen/Explosionen geschützt. Bei genau null Restticks ist der Eintritt zu spät.
Eine erstmals erreichte Quote erlaubt den Ausgang ab diesem Tick, aber keine zweite Spielerbewegung.

## Grundelemente

| Element | Verhalten |
|---|---|
| Freier Raum | Begehbar, Ziel für Fallbewegung und Schieben |
| Erde | Durch Betreten oder benachbartes Graben entfernt; blockiert fallende Objekte |
| Fels | Fällt und rollt; horizontal schiebbar, niemals ziehbar oder vertikal schiebbar |
| Edelstein | Fällt und rollt wie Fels; durch Betreten oder benachbarte Aktion einsammelbar |
| Mauer | Zerstörbar durch Explosion, flache Unterlage, nicht begehbar |
| Stahlwand | Unzerstörbar, flache Unterlage, äußerer Kartenrand |
| Ausgang | Nicht zerstörbar; begehbar erst bei erfüllter Quote; blockiert alle anderen Objekte |

Aktionstaste plus Richtung entfernt nur benachbarte Erde oder sammelt einen Edelstein.
Die Figur bleibt stehen; diese Aktion schiebt keine Felsen und betritt keinen Ausgang.
Auch ein fallender Edelstein kann vor der Physikphase eingesammelt werden.

Fels/Edelstein über freiem Feld bewegt sich eine Zelle nach unten und wird `falling`.
Ein bereits fallendes Objekt über der Figur tötet sie. Ein ruhendes Objekt über der Figur
bleibt dagegen liegen. Bewegung der Figur erfolgt vor der Fallphase, sodass rechtzeitiges Ausweichen möglich ist.
Liegt das Objekt auf Fels/Edelstein und sind seitliches sowie diagonal darunterliegendes Feld frei,
rollt es in einem Tick direkt diagonal ab; links hat Vorrang. Abrollen setzt ebenfalls `falling`.
Erde, Figur, Mauern, Ausgang und Umwandlungswand sind keine gerundeten Unterlagen.
Kann ein Objekt weder fallen noch abrollen, wird es ruhend.

## Gegner und Explosionen (S09)

Zwei eigene Figuren: Glutkäfer (linke Wandfolge, freies Explosionsergebnis) und Kristallfalter
(rechte Wandfolge, Edelsteinergebnis). Pro Tick prüfen sie relativ zur Blickrichtung:
Wandseite, geradeaus, Gegenseite, zurück. Erste freie Richtung wird betreten und zur Blickrichtung;
ohne freie Richtung bleiben Position und Orientierung erhalten.
Nur freie Felder sind begehbar. Orthogonaler Kontakt zur Figur ist tödlich, diagonal nicht.
Kontaktprüfung erfolgt nach Spieleraktion und nach jeder Gegnerbewegung.
Gegner bewegen sich nicht in Erde oder auf Edelsteine.

Fallende Felsen/Edelsteine auf einem Gegner sowie Gegnerkontakt mit der Figur lösen die Explosion
des Gegners aus. Ein explodierender Gegner wird sofort entfernt und darf keine weitere Aktion ausführen.
Explosionen belegen die 3×3-Umgebung um ihr Zentrum einschließlich Zentrum. Betroffene Figuren sterben,
Erde, Felsen, Edelsteine, Mauern und Amöben werden zerstört. Stahl, Ausgang und Umwandlungswand bleiben bestehen.
Stahl blockiert sein eigenes Feld; die übrigen acht Felder werden unabhängig davon betrachtet.
Erfasste Gegner lösen ihre eigene Explosion aus, geordnet nach Rasterindex. Jede Gegner-ID explodiert nur einmal.

Explosionszellen sind drei vollständige Ticks unpassierbar; danach entsteht freier Raum oder ein ruhender
Edelstein. Überlappungen verlängern nicht die Laufzeit; bei konkurrierenden Ergebnissen hat freier Raum Vorrang.
Neu explodierende Zellen werden frühestens im nächsten Tick gealtert.
Präzise Tickgrenzen: Entstehung bei Tick N mit `remainingTicks: 3`; bei N+1, N+2 und N+3
bleibt die Zelle mit Zähler 2, 1 bzw. 0 gesperrt. Auflösung erfolgt zu Beginn von N+4.
Neu entstandene Edelsteine sind ruhend und werden erst im nächsten Tick von der Fallphase verarbeitet.
Kontakt mit Amöbe löst keine zusätzliche Spezialexplosion aus (bewusste Vereinfachung).

## Amöbe (S10)

Alle Amöbenzellen eines Levels bilden einen gemeinsamen Wachstumsvorrat, auch wenn sie getrennt liegen.
Zulässige Zielzellen sind orthogonal angrenzende Erde oder freier Raum.
Die eindeutige sortierte Liste aller Ziele bildet die Wachstumsfront.
Ist die Zellenanzahl größer als `amoebaMaxCells`, wird die gesamte Masse zu ruhenden Felsen.
Andernfalls wird sie bei leerer Front zu ruhenden Edelsteinen.

Alle `amoebaGrowthTicks` Ticks wächst genau eine Zelle an einer seedbestimmt gewählten Frontposition.
Anschließend werden Übergröße/Einschließung erneut geprüft. Übergröße hat Vorrang.
Die Figur kann Amöbe weder betreten noch weggraben; Berührung allein ist nicht tödlich.
Wachstum überwächst die Figur niemals. Explosionen können die Masse verkleinern.
Kein Wachstum außerhalb gültiger Felder; vollständige Vernichtung erzeugt keine Edelsteine.

Zufall: LCG mit `state = (1664525 * state + 1013904223) mod 2^32`, per `Math.imul`.
Seed 0 ist erlaubt. Die neue Zahl modulo Frontlänge wählt das Zielfeld; kein Zufallsaufruf ohne Wachstum.

## Umwandlungswand (S10)

Alle Umwandlungswandfelder teilen einen Timer. Der erste von oben auftreffende fallende Fels/Edelstein
aktiviert ihn für `magicWallTicks` Ticks einschließlich Aktivierungstick.
Während dieser Zeit wird das Objekt verbraucht und als jeweils andere Art direkt eine Zelle unter
dem getroffenen Wandfeld ausgegeben, sofern diese frei ist. Das Ergebnis ist fallend, wird aber erst im
nächsten Tick weiterverarbeitet. Blockierte Ausgabe verbraucht das Objekt ohne Ausgabe; dies wird sichtbar animiert.
Auch ein erster Treffer mit blockierter Ausgabe aktiviert den Timer.

Ruhende Objekte auf der Wand aktivieren nichts. Ein fallendes Objekt auf einer abgelaufenen Wand
wird ruhend, nicht verbraucht. Die Wand bleibt nach Ablauf dauerhaft inaktiv.
Bei mehrschichtiger Wand ist nur die unmittelbare Ausgabeposition maßgeblich; kein Durchtunneln.

## Durchgesprochene Prüfsituationen

| Situation | Erwartetes Ergebnis |
|---|---|
| Fels fällt in zwei freie Zellen untereinander | Nur eine Zelle je Tick, unabhängig von Scanreihenfolge |
| Fels ruht direkt auf der Figur | Kein Treffer; nach Weggehen kann er fallen |
| Fallender Fels über Figur; Figur geht rechtzeitig zur Seite | Figur überlebt, Fels fällt auf das verlassene Feld |
| Zwei freie Abrollseiten | Links gewinnt; auf flacher Mauer kein Abrollen |
| Schieben, neutraler Tick, Schieben | Beide Versuche erst nach erneutem zweiten Halte-Tick erfolgreich |
| Offener Ausgang, ein Resttick | Zeit läuft ab; kein Sieg |
| Tod und Zeitablauf in gleichem Tick | Todesursache bleibt maßgeblich |
| Gegnerexplosion trifft anderen Gegnertyp | Beide Zentren explodieren einmal; freies Ergebnis gewinnt Überlappung |
| Amöbe gleichzeitig eingeschlossen und zu groß | Felsen statt Edelsteine |
| Wand wird bei blockierter Ausgabe getroffen | Aktivierung und Verbrauch, keine Ausgabe |

Grundregeln sowie Gegner-/Explosionsfälle sind seit S03 bzw. S09 automatisiert geprüft.
Die Amöben-/Umwandlungswand-Szenarien bleiben Prüfvorgaben für S10.
Historische Referenzen stehen in `PROMPT.md`. Scanfolge, deterministisches Schieben, Prioritäten und
Sonderregeln hier sind eigene Festlegungen; Fremdlevel-Kompatibilität wird nicht behauptet.
