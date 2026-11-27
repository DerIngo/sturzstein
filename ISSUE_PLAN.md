# Sturzstein: Issue-Plan

Grundlage: `PROMPT.md`. Dieser Plan zerlegt den vollständigen Auftrag in 16 umsetzbare Issues.
Die Kennungen S01 bis S16 sind Plan-IDs, noch keine GitHub-Issue-Nummern.
Der Plan reduziert den geforderten Umfang nicht; frühe Zwischenstände enthalten bewusst erst Teilfunktionen.

## Arbeitsweise und gemeinsame Abnahme

- Ein Issue liefert ein überprüfbares Ergebnis einschließlich seiner Tests und nötigen Dokumentation.
- Ein abhängiges Issue beginnt erst, wenn die benötigten Ergebnisse seiner Vorgänger abgenommen sind.
  In der Tabelle stehen direkte Voraussetzungen; deren Voraussetzungen gelten ebenfalls.
- Die Implementierung erfolgt zunächst nacheinander. Unabhängige Arbeiten dürfen später parallel laufen,
  wenn Schnittstellen und Dateiverantwortung geklärt sind; ein Multi-Agent-Setup ist nicht erforderlich.
- Neue Mechaniken müssen ab ihrer Einführung auch mit Replay, Rückspulen und Speichern kompatibel bleiben.
  Vorhandene Funktionen dürfen nicht erst beim Abschluss wieder repariert werden.
- Pro Issue: passende automatisierte Prüfungen, ein nachvollziehbarer manueller Prüfschritt bei UI-Änderungen
  und ein lokal vorführbarer Stand. Nicht ausgeführte Browser-/Hardwareprüfungen werden offen ausgewiesen.
- Der Nutzer prüft spielbare Zwischenstände lokal. Für `DerIngo/sturzstein` sind Issue-Anlage,
  Issue-Kommentare sowie Commit und Push vorab erlaubt; weitere schreibende GitHub-Aktionen benötigen Zustimmung.
  Maßgeblich für den genauen Freigabeumfang ist `.github/copilot-instructions.md`.
- Keine externen Laufzeitabhängigkeiten, keine fremden Originalassets oder ungeklärten Code-/Levelübernahmen.
  Oberfläche und Dokumentation sind deutsch; Name und visuelle Identität bleiben eigenständig.
- Änderungen an Regeln, Formaten oder Umfang werden ausdrücklich dokumentiert, nicht stillschweigend umgesetzt.
- Alle Abnahmekriterien eines Issues müssen erfüllt sein, bevor es geschlossen wird.

## Übersicht und Abhängigkeiten

| ID | Issue-Titel | Direkte Voraussetzungen | Meilenstein |
|---|---|---|---|
| S01 | Spielregeln und technische Verträge festlegen | keine | M1 |
| S02 | Projektgrundlage und natives Levelpack-Format implementieren | S01 | M1 |
| S03 | Deterministische Kernsimulation implementieren | S02 | M1 |
| S04 | Erstes Level im Browser durchgängig spielbar machen | S03 | M1 |
| S05 | Gamepad und vollständige Eingabeabstraktion integrieren | S04 | M2 |
| S06 | Tickgenaue Replays und Lösungsprüfung implementieren | S04 | M2 |
| S07 | Rückspulen mit vollständiger Zustandswiederherstellung implementieren | S04, S06 | M2 |
| S08 | Spielstände, Fortschritt und Einstellungen speichern | S07 | M2 |
| S09 | Gegner und Explosionsketten integrieren | S08 | M3 |
| S10 | Amöbe und Umwandlungswand integrieren | S08 | M3 |
| S11 | Levelpacks importieren und dauerhaft verwalten | S08 | M3 |
| S12 | Menüs, Levelauswahl und Spielrückmeldungen vervollständigen | S05, S11 | M3 |
| S13 | Pixel-Art, Animationen und Kamera vervollständigen | S09, S10, S12 | M4 |
| S14 | Eigene Soundeffekte und Audiosteuerung integrieren | S09, S10, S12 | M4 |
| S15 | Kampagne mit mindestens 20 geprüften Leveln erstellen | S09, S10, S12 | M4 |
| S16 | Gesamtspiel prüfen und Veröffentlichung vorbereiten | S13, S14, S15 | M5 |

Die Voraussetzungen von S09 und S10 schließen bewusst Speicher- und Rückspulintegration ein:
Neue Objektzustände werden direkt gegen diese bereits vorhandenen Funktionen geprüft.
S11 nutzt die gemeinsame Speicherbehandlung und die vorhandene Browseroberfläche.

Empfohlene Bearbeitungsfolge:
S01 → S02 → S03 → S04 → S05 → S06 → S07 → S08 → S09 → S10 → S11 → S12 → S13 → S14 → S15 → S16.
Diese Reihenfolge ist eine Empfehlung, keine zusätzliche Abhängigkeit.

## M1: Ein vollständiger kleiner Spielablauf

### S01 – Spielregeln und technische Verträge festlegen

**Ziel:** Mehrdeutige Regeln vor der Implementierung klären und spätere Umbauten am gemeinsamen Zustand vermeiden.
**Voraussetzungen:** keine.

**Abnahmekriterien**

- [ ] Eine kurze Mechanikübersicht definiert feste Tickdauer, Verarbeitungsreihenfolge, Bewegungs-/Schubverzögerung,
  Abrollpriorität, Kollisionsregeln, Gegnerkontakt und das Verhalten bei gleichzeitigem Tod, Zeitablauf und Ausgangseintritt.
- [ ] Die Regeln aller geforderten Objekte sind beschrieben: Erde, freie Felder, Figur, Felsen, Edelsteine,
  zerstörbare/unzerstörbare Wände, Ausgang, beide Gegnertypen, Explosionen, Amöbe und Umwandlungswand.
- [ ] Insbesondere Explosionsketten, Amöbenwachstum/-umwandlung sowie Aktivierung, Laufzeit und blockierte Ausgabe
  der Umwandlungswand sind eindeutig; bewusste Abweichungen von klassischen Regeln sind dokumentiert.
- [ ] Punktesystem, Zeitreserve beim Leveldesign und Freischaltungsregel der Hauptkampagne sind festgelegt.
  Es gibt keine begrenzten Leben und keinen Verlust bereits freigeschalteter Level bei Niederlagen.
- [ ] Modulgrenzen und Schnittstellen für Simulation, Eingabe, Rendering, Audio, Levelverwaltung und Speicher stehen fest.
  Die Simulation benötigt weder DOM noch Canvas noch eine echte Uhr.
- [ ] Das Zustandsmodell umfasst von Anfang an Tick, Timer, Punkte, Objektzustände und Seed/Zufallsgeneratorzustand.
  Identitäten und Versionen für Packs, Level, Regeln, Replays und Speicherstände sind definiert.
- [ ] Die kleinste geeignete Entwicklungs-/Testwerkzeugauswahl ist dokumentiert; das ausgelieferte Spiel benötigt
  weder Installation noch Build noch Netzwerk. Quellen und offene Entscheidungen sind nachvollziehbar.

**Prüfung:** Regeltabelle anhand kleiner, selbst entworfener Beispielsituationen durchgehen; offene Entscheidungen
vor Beginn der jeweils betroffenen Implementierung klären.

### S02 – Projektgrundlage und natives Levelpack-Format implementieren

**Ziel:** Alle späteren Level nutzen bereits das endgültig erweiterbare Datenmodell.
**Voraussetzungen:** S01.

**Abnahmekriterien**

- [ ] Das Grundgerüst lädt unter `file://` und über HTTP ohne ES-Modul-/Fetch-Abhängigkeit für lokale Spieldaten.
  Ein dokumentierter Testaufruf führt die ersten DOM-unabhängigen Tests aus.
- [ ] Versionierte UTF-8-JSON-Packs enthalten alle im Prompt verlangten Pack-/Levelmetadaten, geordnete Level,
  Zeichenraster, Regelversion, Seed sowie Mechanikparameter mit Einheiten und Standardwerten.
- [ ] Die dokumentierte Symboltabelle deckt alle geplanten Objekte und anfänglichen Gegnerrichtungen ab.
  Bis zur jeweiligen Implementierung werden Level mit noch nicht unterstützten Mechaniken ausdrücklich abgewiesen.
- [ ] Ein gemeinsamer Validator prüft Versionen, IDs, Raster, Symbole, Start/Ausgang, Randbedingungen und Parameter.
  Dokumentierte Größenlimits werden vor aufwendiger Verarbeitung angewendet.
- [ ] Fehler benennen Level/Feld oder Kartenposition; hohe Edelsteinquoten werden nicht allein anhand der
  anfänglichen Edelsteinanzahl abgewiesen.
- [ ] Ein Werkzeug erzeugt aus den Quelldateien ein mitgeliefertes klassisches Skript-Datenbundle.
  Eine automatisierte Prüfung erkennt veraltete Bundles; keine manuell gepflegte zweite Datenquelle.
- [ ] Eine kleine eigene Beispieldatei und Formatdokumentation liegen vor. Parser und internes Datenmodell sind getrennt.
  BDCFF/C-Textformat-Zuordnungen und Grenzen sind dokumentiert; Fremdformat-Importer werden nicht implementiert.

**Prüfung:** Gültige/ungültige Beispieldaten einschließlich unbekannter Versionen, doppelter IDs, fehlerhafter
Kartenränder und Limits; Bundle-Abgleich und Start in beiden Betriebsarten.

### S03 – Deterministische Kernsimulation implementieren

**Ziel:** Die grundlegenden Regeln sind unabhängig von der Darstellung korrekt.
**Voraussetzungen:** S02.

**Abnahmekriterien**

- [ ] Bewegung in vier Richtungen, Graben, Sammeln und benachbartes Graben/Sammeln ohne Bewegung funktionieren.
- [ ] Felsen und Edelsteine fallen und rollen regelkonform ab; ruhende Felsen lassen sich mit fester Verzögerung
  nur horizontal in freie Felder schieben.
- [ ] Ruhend/fallend ist eindeutig unterschieden; Erde und flache Mauern erlauben kein Abrollen.
  Kein Objekt wird durch die Scanreihenfolge innerhalb eines Ticks mehrfach bewegt.
- [ ] Quote, Ausgang, Punkte, Timer, Sieg, Tod und Neustart funktionieren gemäß S01.
  Die Welt läuft auch ohne Eingaben weiter; ein terminaler Zustand beendet die normale Simulation.
- [ ] Identischer Anfangszustand und identische Tick-Eingaben erzeugen identische Folgezustände.
  Zufall verwendet ausschließlich den expliziten Generatorzustand.

**Prüfung:** Kleine Rastertests für Fall-/Abrollkonflikte, Schubverzögerung, ruhende gegenüber fallenden Objekten,
Kartenränder und konkurrierende Sieg-/Niederlagenereignisse.

### S04 – Erstes Level im Browser durchgängig spielbar machen

**Ziel:** Früh Spielgefühl und grundlegende Technik mit einem echten Spielablauf beurteilen.
**Voraussetzungen:** S03.

**Abnahmekriterien**

- [ ] Eine eigene kleine Höhle lässt sich vom Start bis zum Sieg spielen; Niederlage und Neustart sind erreichbar.
  Das Level wird aus dem in S02 erzeugten Bundle geladen.
- [ ] Canvas zeichnet eigene PNG-Sprites für die bisher vorhandenen Objekte, keine ASCII-/Emoji-Darstellung.
  Ein Mindest-HUD zeigt Level, Edelsteine/Quote, Restzeit und Punkte.
- [ ] Simulation und Renderfrequenz sind getrennt; Rendering interpoliert nur visuell und strebt 60 FPS an.
  Fenstergrößen/Pixeldichten werden pixelgenau behandelt; übergroße Karten bleiben per begrenzter Kamera spielbar.
- [ ] Tastaturbewegung und Aktionstaste funktionieren; Pause, Neustartbestätigung, Sieg und Niederlage sind bedienbar.
  Relevante Spieltasten scrollen die Seite nicht, ohne normale Bedienelemente zu blockieren.
- [ ] Fokus-/Tabverlust pausiert sofort; Fortsetzen ist bewusst und verursacht weder Zeitsprung noch nachgeholte Physikticks.
- [ ] Das Level läuft offline per Doppelklick und über einen lokalen Webserver.

**Prüfung:** Manueller vollständiger Spielablauf einschließlich Tod, Pause und Fensteränderung;
Renderintervalle variieren und gleiche Simulationsresultate sicherstellen.

## M2: Eingabe und Zustandsverwaltung sind belastbar

### S05 – Gamepad und vollständige Eingabeabstraktion integrieren

**Ziel:** Alle Geräte liefern dieselben abstrakten Aktionen.
**Voraussetzungen:** S04.

**Abnahmekriterien**

- [ ] Sämtliche im Prompt definierten Tastatur-/Gamepadbelegungen sind als kontextabhängige Aktionen abgebildet.
  Rückspulen und Tonaktionen werden vorbereitet und bei S07/S14 an die Funktionen angeschlossen.
- [ ] Standard-Mapping, Stick-Deadzone, eindeutige Vier-Richtungs-Auswahl und kontrollierte Wiederholung funktionieren.
- [ ] Controller werden nach der nötigen Interaktion erkannt; Hotplugging funktioniert.
  Das Trennen des aktiv benutzten Controllers pausiert das Spiel.
- [ ] API-/Browserbeschränkungen werden sichtbar erklärt, die Tastatur bleibt nutzbar.
- [ ] Die vorhandenen Menüs sind zusätzlich per Maus bedienbar; Gerätehinweise wechseln passend zur letzten Eingabe.

**Prüfung:** Automatisierte Eingabe-/Mappingtests plus echter Controller-Spieltest.
Nicht verfügbare Hardwaretests bleiben ausdrücklich offen, nicht als erfolgreich markiert.

### S06 – Tickgenaue Replays und Lösungsprüfung implementieren

**Ziel:** Verhalten reproduzieren und Level-Lösbarkeit durch tatsächliches Spielen der Simulation belegen.
**Voraussetzungen:** S04.

**Abnahmekriterien**

- [ ] Ein- und Ausgabe von Replays enthalten Tick-Eingaben, Anfangs-Seed und passende Pack-/Levelidentität,
  Levelrevision sowie Regelversion.
- [ ] Ein dokumentierter Kommandozeilenaufruf spielt Replays ohne Browser über dieselbe Simulation ab.
  Fehler, inkompatible Versionen, Zeitüberschreitung und ein ausbleibender Sieg führen zu einem Fehlerstatus.
- [ ] Aufzeichnung und Wiedergabe erzeugen identische Zustände; im Browser lässt sich ein Lösungsreplay aufzeichnen.
- [ ] Für die mitgelieferten spielbaren Beispiellevel liegen erfolgreiche Lösungsreplays vor.
  Der Prüfbericht enthält Ergebnis, benötigte Ticks und verbleibende Zeit.

**Prüfung:** Erfolgsreplay, absichtlich scheiternder Replay, Versionskonflikt und wiederholter Zustandsvergleich.

### S07 – Rückspulen mit vollständiger Zustandswiederherstellung implementieren

**Ziel:** Rückspulen ist eine echte Wiederherstellung, keine bloße Positionskorrektur.
**Voraussetzungen:** S04, S06.

**Abnahmekriterien**

- [ ] Gehaltenes Z/U bzw. die abstrakte Gamepad-B-Aktion spult mindestens zehn Sekunden zurück, soweit vorhanden.
  Der Verlauf ist speicherbegrenzt; seine Kapazität und Grenzen sind dokumentiert.
- [ ] Rückspulen funktioniert auch nach Tod/Zeitablauf; nach dem Loslassen geht es am wiederhergestellten Punkt weiter.
  Ein neuer Verlauf ersetzt die verworfene Zukunft.
- [ ] Spielfeld, Objektzustände, Tick, Timer, Punkte, Zähler und Zufallszustand werden vollständig wiederhergestellt.
  Ein gemeinsamer Zustandsvergleich kann später ergänzte Mechaniken erfassen.
- [ ] Anzeige und verbleibende Rückspulzeit sind sichtbar; Läufe werden dauerhaft als mit Rückspulen gekennzeichnet.
  Diese Kennzeichnung lässt sich nicht durch Rückspulen vor die erste Nutzung entfernen.
- [ ] Replays des resultierenden Verlaufs bleiben reproduzierbar; Neustart leert den alten Verlauf.

**Prüfung:** Vorwärts-/Rückwärts-/Vorwärts-Zustandsvergleich, verzweigter Verlauf, Niederlage,
leerer Verlauf und begrenzter Speicher bei langer Spielzeit.

### S08 – Spielstände, Fortschritt und Einstellungen speichern

**Ziel:** Zuverlässiges Fortsetzen ohne Verlust oder Verwechslung von Spielständen.
**Voraussetzungen:** S07.

**Abnahmekriterien**

- [ ] Versionierte, validierte LocalStorage-Daten speichern freigeschaltete Level, Einstellungen, Bestwerte
  und eine laufende Partie mit vollständigem Simulationszustand.
- [ ] Fortsetzen stellt denselben Zustand wieder her, zieht keine Offlinezeit ab und erfordert kein persistiertes
  Rückspularchiv. Die Kennzeichnung eines Rückspullaufs bleibt erhalten.
- [ ] Bestwerte mit und ohne Rückspulen sind getrennt; Fortschritt ist an Pack-/Level-IDs gebunden.
  Laufende Partien, Replays und Bestwerte berücksichtigen zusätzlich Levelrevision und Regelversion.
- [ ] Ergänzen/Umsortieren unveränderter Level erhält Fortschritte; inkompatible oder beschädigte Partien
  werden erklärt statt still geladen oder gelöscht.
- [ ] Verweigerter Speicherzugriff, beschädigte Daten und ausgeschöpfter Speicher werden sichtbar gemeldet.
  Das Spiel bleibt nutzbar und behauptet nicht, erfolgreich gespeichert zu haben.

**Prüfung:** Speichern/Laden mit vollständigem Zustandsvergleich, Offlinepause, Varianten der IDs/Revisionen,
defekte Daten und simulierte Speicherfehler.

## M3: Alle Mechaniken und das erweiterbare Levelsystem

### S09 – Gegner und Explosionsketten integrieren

**Ziel:** Zwei unterscheidbare Gegnertypen mit konsistenter Interaktion zur Physik.
**Voraussetzungen:** S08.

**Abnahmekriterien**

- [ ] Linke/rechte Wandfolge, Startorientierung, blockierte Bewegung und gefährlicher Kontakt entsprechen S01.
- [ ] Fallende Objekte lösen bei Treffern die vorgesehenen Explosionen aus.
  Ein Gegnertyp hinterlässt freie Felder, der andere Edelsteine.
- [ ] 3×3-Explosionen, zerstörbare Mauern, unzerstörbare Wände und überlappende Kettenreaktionen verhalten sich
  deterministisch, auch an Kartenrändern und bei gleichzeitigen Treffern.
- [ ] Eigene unterscheidbare Sprites und Testhöhlen machen beide Gegner und Explosionen im Browser erkennbar.
- [ ] Alle neuen Zustände werden durch Replay, Rückspulen und Speichern/Fortsetzen vollständig erfasst.
  Elementunterstützung in Parser/Validator ist freigeschaltet.

**Prüfung:** Wandfolge-/Kontakt-/Explosionsfälle und Zustandsvergleiche mitten in einer Explosionskette;
erfolgreiche Replays der neuen spielbaren Beispielhöhlen.

### S10 – Amöbe und Umwandlungswand integrieren

**Ziel:** Die beiden besonderen Höhlenmechaniken sind vollständig und reproduzierbar.
**Voraussetzungen:** S08.

**Abnahmekriterien**

- [ ] Amöben wachsen seedgesteuert nur in erlaubte Felder, werden eingeschlossen zu Edelsteinen
  und bei Überschreiten der definierten Größe zu Felsen.
- [ ] Die Umwandlungswand aktiviert sich regelkonform, läuft zeitlich begrenzt und wandelt beide Objektrichtungen
  korrekt um; blockierte Ausgabe und Ablaufzeit sind eindeutig behandelt.
- [ ] Parameter aus Leveldaten werden verwendet; Grafiken zeigen beide Elemente und ihren relevanten Zustand.
- [ ] Timer, Wachstum und Zufallszustand bleiben beim Replay, Rückspulen und Speichern/Fortsetzen identisch.
  Beide Mechaniken sind im nativen Format nutzbar.
- [ ] Eigene Beispielhöhlen zeigen die Mechaniken mit erfolgreichen Lösungsreplays.

**Prüfung:** Einschließung, Wachstumsgrenze, gleicher Seed, Wandaktivierung/-ablauf,
blockierte Ausgabe und Zustandsvergleiche kurz vor einer Umwandlung.

### S11 – Levelpacks importieren und dauerhaft verwalten

**Ziel:** Weitere Level werden ohne Codeänderungen hinzugefügt.
**Voraussetzungen:** S08.

**Abnahmekriterien**

- [ ] Dateiauswahl und Browser File API laden native JSON-Packs unter `file://` und HTTP.
  Mitgelieferte und importierte Packs nutzen dasselbe Modell und denselben Validator.
- [ ] Vor Übernahme wird das gesamte Pack validiert; Fehler nennen Datei und betroffene Stelle.
  Unbekannte Symbole/Regeln werden nicht still ersetzt.
- [ ] Importierte Daten führen keinen Code, HTML oder Netzwerkzugriff aus.
  Dateigröße wird vor dem Einlesen geprüft, Struktur-/Rasterlimits vor der Simulation.
- [ ] Neue Packs sind separat auswählbar und alle enthaltenen Level direkt zugänglich.
  Level ohne nachgewiesenen Lösungsreplay sind als „Lösbarkeit ungeprüft“ gekennzeichnet.
- [ ] Lokale Persistenz überlebt Neuladen; bei Speicherfehlern ist der nutzbare Import sichtbar temporär.
- [ ] Gleiche Pack-ID bietet Abbrechen oder bestätigtes Ersetzen; integrierte Packs bleiben geschützt.
  Ersetzen berücksichtigt Revisionen und erhält nur kompatible Fortschritte/Partien.
- [ ] Entfernen erfordert Bestätigung und benennt die betroffenen lokalen Daten.
  Die Hauptkampagne bleibt von Zusatzpacks unabhängig.

**Prüfung:** Vollständiger Import-/Neulade-/Ersetzen-/Entfernen-Ablauf, manipulierte Metadaten,
Limits, unbekannte Versionen, doppelte IDs und Speicherfehler.

### S12 – Menüs, Levelauswahl und Spielrückmeldungen vervollständigen

**Ziel:** Alle vorhandenen Funktionen sind ohne Entwicklerwissen zugänglich.
**Voraussetzungen:** S05, S11.

**Abnahmekriterien**

- [ ] Titelmenü bietet Neues Spiel, Fortsetzen, Levelauswahl, Hilfe und Einstellungen;
  Pause, Sieg und Niederlage besitzen sinnvolle Navigation und eine verständliche Ursache.
- [ ] Levelauswahl verarbeitet variable Pack-/Levelzahlen durch Scrollen oder Seitenwechsel bis zu den Limits.
  Keine fest verdrahtete Grenze von 20/40 Einträgen; Hauptkampagnen-Freischaltung folgt S01.
- [ ] HUD, Ausgangsöffnung, Quotenmeldung und Rückspulanzeige sind vollständig; neue Mechaniken
  lassen sich durch levelbezogene Hinweise erklären.
- [ ] Neustartbestätigung und Menüs sind mit Tastatur, Gamepad und Maus nutzbar.
  Hinweise wechseln nach Eingabegerät; kontextabhängige Aktionen lösen keine doppelten Befehle aus.
- [ ] Fokusverlust/Controllertrennung, bewusste Wiederaufnahme und Fehlermeldungen funktionieren
  auch in Importdialogen und Overlays ohne unbeabsichtigtes Weiterlaufen.

**Prüfung:** Navigationsdurchlauf mit allen verfügbaren Eingabegeräten; viele Beispiel-Einträge,
lange Namen, fehlender Spielstand und API-/Speicherfehler.

## M4: Eigenständiges, vollständiges Spiel

### S13 – Pixel-Art, Animationen und Kamera vervollständigen

**Ziel:** Konsistente, lesbare Sturzstein-Spielwelt statt einer technischen Demonstration.
**Voraussetzungen:** S09, S10, S12.

**Abnahmekriterien**

- [ ] Eigene Figur, Titelgestaltung und vollständige PNG-/Sprite-Sheets bilden eine konsistente Höhlenwelt.
  Erzeugungsskripte werden, soweit verwendet, zusammen mit den fertigen Bildern geliefert.
- [ ] Alle Objekte sind nicht nur anhand ihrer Farbe unterscheidbar; keine Platzhalter oder Originalassets.
- [ ] Figur, Edelsteine, Gegner, Explosionen und offener Ausgang sind animiert.
  Visuelle Übergänge ändern keine Kollisionen oder Simulationsergebnisse.
- [ ] Die Kamera folgt ruhig, bleibt an Kartenrändern und erhält eine sinnvolle Sicht auf Gefahren.
  Kleine/große Höhlen, Resize und unterschiedliche Pixeldichten bleiben scharf und bedienbar.
- [ ] Effekte verdecken weder Gefahren noch HUD; Pausieren und Rückspulen hinterlassen keine falschen Animationen.

**Prüfung:** Sichtprüfung aller Objekte/Zustände, mehrere Fenstergrößen/Pixeldichten,
Randpositionen und Kamerawechsel; Verhalten bei Rückspulen und Pause.

### S14 – Eigene Soundeffekte und Audiosteuerung integrieren

**Ziel:** Passende akustische Rückmeldung ohne externe Assets oder Laufzeitdownloads.
**Voraussetzungen:** S09, S10, S12.

**Abnahmekriterien**

- [ ] Eigene synthetisierte oder selbst erzeugte Sounds begleiten relevante Aktionen und Spielereignisse.
  Es gibt keine Übernahme originaler Samples oder Musik.
- [ ] Audio startet erst nach Nutzerinteraktion; Lautstärke, Stummschaltung und Taste M funktionieren
  und werden über die gemeinsame Einstellungsverwaltung gespeichert.
- [ ] Pause, Rückspulen, Neustart und Fokusverlust erzeugen weder Soundstau noch verspätetes Nachspielen alter Ereignisse.
- [ ] Audioausgabe beeinflusst weder Simulation noch Replay-Ergebnisse; Einschränkungen werden verständlich behandelt.

**Prüfung:** Erster Start ohne Interaktion, Aktivierung, Stummschaltung/Lautstärke, Neuladen
und ereignisreiche Szenen einschließlich Pause/Rückspulen.

### S15 – Kampagne mit mindestens 20 geprüften Leveln erstellen

**Ziel:** Eine eigene, abwechslungsreiche Kampagne mit nachgewiesener Lösbarkeit.
**Voraussetzungen:** S09, S10, S12.

**Abnahmekriterien**

- [ ] Mindestens 20 eigene handgestaltete Level mit stabilen IDs, Metadaten und festen Seeds sind enthalten.
  Kleine Beispielhöhlen zählen nur mit, wenn sie die Qualitätsanforderungen der Kampagne erfüllen.
- [ ] Eine dokumentierte Schwierigkeitsfolge führt alle Mechaniken schrittweise ein und kombiniert sie später.
  Jedes Level besitzt Lernziel, Schwierigkeit, Edelsteinquote und ein begründet bemessenes Zeitlimit.
- [ ] Die Kampagne enthält Planungs- und Geschicklichkeitsaufgaben, keine unvermeidbaren Starttreffer,
  blinden Fallen oder ausschließlich glücksabhängigen Lösungen.
- [ ] Für jedes mitgelieferte spielbare Level existiert ein versionspassender erfolgreicher Lösungsreplay.
  Die gesamte Sammlung besteht die automatisierte Prüfung mit angemessener Zeitreserve.
- [ ] Ein menschlicher Spieltest bewertet Verständlichkeit, Schwierigkeit und Fairness;
  erfolgreiche Replays allein gelten nicht als Nachweis eines guten Spielgefühls.
- [ ] Level hinzufügen und neu bündeln erfordert keine Änderung von Engine, Renderer oder Menücode.

**Prüfung:** Gesamter Replay-Lauf, Metadaten-/Bundle-Prüfung und protokollierte Spieltests;
gezielter Versuch mit einem zusätzlichen eigenen Pack ohne Quellcodeänderung.

## M5: Abschluss und Freigabe

### S16 – Gesamtspiel prüfen und Veröffentlichung vorbereiten

**Ziel:** Vollständige Abnahme gegen `PROMPT.md`, keine bloße Ansammlung einzeln fertiger Funktionen.
**Voraussetzungen:** S13, S14, S15.

**Abnahmekriterien**

- [ ] Alle automatisierten Mechanik-, Replay-, Rückspul-, Speicher- und Importprüfungen bestehen.
  Quelldateien und mitgelieferte Datenbundles stimmen überein.
- [ ] Eine Browsermatrix deckt aktuelle Chrome/Chromium-, Edge- und Firefox-Versionen unter `file://` und HTTP ab.
  Offlinebetrieb, Tastatur, Gamepad, Fokuswechsel, Skalierung und Import werden geprüft.
- [ ] Tatsächlich getestete Browser/Controller/Umgebungen und Ergebnisse sind angegeben.
  Nicht verfügbare manuelle Prüfungen bleiben offen; eine vollständige Abnahme wird dann nicht behauptet.
- [ ] Repräsentative große/ereignisreiche Höhlen werden auf flüssige Darstellung, begrenzten Rückspulspeicher
  und stabile Simulation geprüft; Messumgebung und Abweichungen vom 60-FPS-Ziel sind dokumentiert.
- [ ] Die deutsche README enthält Startanleitung, Steuerung, Regeln, Architektur, Struktur, Prüfaufrufe und
  eine Anleitung zum Erstellen, Importieren und dauerhaften Mitliefern von Levelpacks.
- [ ] Formatbeispiel, Parameter, Versionsregeln, Speicherfehlerverhalten und Gamepad-Webserveralternative sind erklärt.
- [ ] Quellen, eigene Asset-Erzeugung, etwaige Fremdlizenzen und bewusste Regelabweichungen sind dokumentiert.
  Keine ungeklärten Originalinhalte und keine TODO-Platzhalter für Pflichtfunktionen.
- [ ] Alle Prompt-Anforderungen sind gegen das Ergebnis geprüft; verbleibende Abweichungen werden als
  offene Arbeit behandelt oder vom Nutzer ausdrücklich als Umfangsänderung bestätigt.

**Prüfung:** Zusammenhängender Ablauf vom frischen Start über Kampagne, Rückspulen und Fortsetzen
bis zum Import eines zusätzlichen Packs; abschließende lokale Nutzerabnahme.
Die projektspezifische Commit-/Push-Freigabe gilt weiterhin. Ein Release oder das Schließen des Issues
benötigt eine zusätzliche Freigabe gemäß `.github/copilot-instructions.md`.

## Zuordnung der Prompt-Anforderungen

| Abschnitt aus `PROMPT.md` | Zuständige Issues |
|---|---|
| Spielname, Rahmenbedingungen, Browser-/Offlinebetrieb | S01, S02, S04, S16 |
| Eigenständigkeit, Quellen und Nutzungsrechte | S01, S02, S13, S14, S15, S16 |
| Grafik, Atmosphäre, Animationen und Kamera | S04, S09, S10, S13 |
| Grundregeln, Echtzeitphysik, Quote und Zeitlimit | S01, S03, S04 |
| Gegner und Explosionen | S01, S09 |
| Amöbe und Umwandlungswand | S01, S10 |
| Rückspulen und Niederlagenkomfort | S04, S07, S09, S10, S12 |
| Spielstände, Einstellungen, Bestwerte und Fortschritt | S08, S11, S12, S14 |
| Leveldesign und mindestens 20 Level | S06, S15 |
| Natives Textformat, Bundle und Validierung | S02 |
| Laden, Importieren, Verwalten und Versionieren | S08, S11, S12 |
| Externe Formate und Kompatibilitätsgrenzen | S02, S11, S16 |
| Tastatur, Gamepad, Maus und Fokusverlust | S04, S05, S12 |
| Determinismus, Modularität, Interpolation und Tests | S01, S02, S03, S04, S06, S16 |
| Audio | S14 |
| Benutzeroberfläche | S04, S07, S11, S12, S13 |
| Qualität, Dokumentation und Gesamtprüfung | alle Issues, abschließend S16 |

## Bewusst nicht im Umfang

Vollständige BDCFF-/Fremdformat-Importer, grafischer Leveleditor, zusätzliche Mechaniken anderer Ableger,
Übernahme fremder Levelsammlungen, Onlinefunktionen und ein automatisiertes Multi-Agent-System.
Diese können später eigene Vorschläge erhalten, blockieren aber nicht die hier geplante Umsetzung.
