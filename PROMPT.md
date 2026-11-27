# Projektauftrag: Sturzstein – Boulder-Dash-inspiriertes Browser-Spiel

Entwickle ein vollständiges, lokal im Browser lauffähiges Action-Puzzlespiel im Stil klassischer Boulder-Dash-Spiele.
Die Spielfigur gräbt sich durch Höhlen, sammelt Edelsteine und erreicht den Ausgang, während sie herabfallenden Felsen,
Gegnern und Kettenreaktionen ausweicht. Gefordert ist ein eigenständiges Spiel, keine originalgetreue Kopie.
Das Spiel heißt „Sturzstein“; der Verzeichnis- und Repository-Name lautet `sturzstein`.
Entwickle eine eigene Hauptfigur und eine konsistente visuelle Identität.

## Rahmenbedingungen

- Das Spiel muss ohne Server lauffähig sein: HTML, CSS und JavaScript.
- Es muss direkt durch Öffnen der `index.html` funktionieren, alternativ über einen einfachen lokalen Webserver.
- Liefere ein vollständiges Projekt mit sinnvoller Verzeichnisstruktur, nicht nur einen Prototyp oder Codeausschnitte.
- Keine externen Frameworks, CDNs, Laufzeit-Downloads oder Netzwerkdienste.
- Alle zum Spielen benötigten Dateien müssen enthalten sein; zum Starten darf kein Build-Schritt notwendig sein.
- Falls TypeScript oder Entwicklungswerkzeuge verwendet werden, liefere zusätzlich das direkt ausführbare Ergebnis.
- Unter `file://` dürfen weder ES-Module noch `fetch()` für lokale Leveldaten vorausgesetzt werden.
- Zielplattformen sind aktuelle Desktop-Versionen von Chrome/Chromium, Edge und Firefox.
- Oberfläche, Spielhinweise und README sind auf Deutsch.

## Eigenständigkeit und Quellen

- Orientiere dich an den Spielprinzipien, nicht an einer Übernahme des Originalprogramms.
- Verwende keine Original-ROMs, disassemblierten Originalprogramme, Originalgrafiken oder Originalmusik.
- Liefere fremde Level nur mit, wenn ihre konkrete Lizenz oder eine ausdrückliche Erlaubnis dies gestattet.
  Eine Downloadmöglichkeit oder Aufnahme in ein anderes Repository genügt dafür nicht.
- Nutze den Namen „Boulder Dash“ nur zur Beschreibung der Inspiration, nicht als Titel oder Logo des neuen Spiels.
- Erstelle die mitgelieferte Hauptkampagne, Figuren, Grafiken und Sounds selbst.
  Zusätzliche Levelpacks dürfen aus nachweislich zur Weitergabe freigegebenen Quellen stammen.
- Recherchiere klassische Mechaniken anhand nachvollziehbarer Quellen und dokumentiere die verwendeten Referenzen.
- Öffentlich einsehbarer Quellcode ist nicht automatisch frei lizenziert. Prüfe vor jeder Übernahme die konkrete Lizenz.
- Bevorzuge eine eigenständige Implementierung. Übernimm keinen fremden Code oder Assets ohne geklärte Nutzungsrechte
  und erfüllte Lizenzpflichten; dies gilt auch für Code aus Open-Source-Nachbauten.

## Grafik und Atmosphäre

- Erstelle eine atmosphärische unterirdische Spielwelt mit klar lesbarer Pixel-Art im Stil klassischer Heimcomputer-Spiele.
- Keine ASCII-Art, Emojis, textbasierten Spielfelder oder Platzhaltergrafiken in der Darstellung.
  Zeichenraster als internes, menschenlesbares Dateiformat für Level sind ausdrücklich erlaubt.
- Erstelle sämtliche Grafiken als eigene PNG-Dateien oder Sprite-Sheets und lege sie dem Projekt bei.
- Wenn Grafiken per Skript erzeugt werden, liefere Skript und fertige Bilder.
- Erde, freier Raum, Felsen, Edelsteine, zerstörbare Mauern, unzerstörbare Wände, Gegner und Ausgang müssen
  auch ohne reine Farbunterscheidung eindeutig erkennbar sein.
- Animiere mindestens Spielfigur, Edelsteine, Gegner, Explosionen und den geöffneten Ausgang.
- Nutze pixelgenaue Skalierung ohne unscharfe Filterung; berücksichtige unterschiedliche Fenstergrößen und Pixeldichten.
- Größere Höhlen dürfen über den Bildschirm hinausreichen. Die Kamera folgt der Figur ruhig und bleibt an den Kartenrändern.
- Die unmittelbare Gefahrenzone muss sichtbar bleiben. Effekte dürfen die Lesbarkeit nicht beeinträchtigen.

## Gameplay und verbindliche Kernmechaniken

Das Spiel läuft in Echtzeit auf einem orthogonalen Kachelraster. Die Welt entwickelt sich auch ohne Spielereingabe weiter.
Es ist weder rundenbasiert noch eine Sokoban-Variante.

- Die Spielfigur bewegt sich in vier Richtungen, gräbt Erde weg und sammelt Edelsteine durch Betreten ihrer Felder.
- Jedes Level besitzt eine Edelsteinquote und ein Zeitlimit. Erst nach Erreichen der Quote öffnet sich der Ausgang.
- Ein Level ist gewonnen, wenn die lebende Figur den geöffneten Ausgang vor Ablauf der Zeit erreicht.
- Felsen und Edelsteine fallen bei fehlender Unterstützung nach unten und können die Figur oder Gegner treffen.
- Auf geeigneten gerundeten Unterlagen können Felsen und Edelsteine seitlich abrollen, wenn Seitenfeld und
  darunterliegendes Diagonalfeld frei sind. Erde und flache Mauern sind keine gerundeten Unterlagen.
- Ein ruhender Fels darf horizontal in ein freies Nachbarfeld geschoben werden, niemals gezogen oder nach oben geschoben.
  Verwende eine kurze, feste Schubverzögerung statt zufälliger Erfolgschancen.
- Unterscheide ruhende und fallende Objekte ausdrücklich: Ein bereits ruhender Fels über der Figur ist nicht
  automatisch ein tödlicher Treffer; ein tatsächlich fallendes Objekt ist gefährlich.
- Eine Aktionstaste zusammen mit einer Richtung ermöglicht das Graben oder Einsammeln auf einem benachbarten Feld,
  ohne dass die Figur ihr eigenes Feld verlässt.
- Implementiere zwei klar unterscheidbare Gegnertypen mit deterministischem Wandfolge-Verhalten:
  einer folgt der linken Wand, der andere der rechten.
- Gegner sind bei Kontakt gefährlich. Getroffene Gegner lösen lokale Explosionen aus;
  ein Gegnertyp hinterlässt nach der Explosion freien Raum, der andere Edelsteine.
- Explosionen betreffen eine klar definierte 3×3-Umgebung, zerstören geeignete Objekte und zerstörbare Mauern,
  respektieren unzerstörbare Wände und können nachvollziehbare Kettenreaktionen auslösen.
- Ergänze eine wachsende Höhlenmasse nach dem Amöben-Prinzip: Sie wächst nur in geeignete Nachbarfelder,
  wird bei vollständiger Einschließung zu Edelsteinen und bei Überschreiten einer definierten Größe zu Felsen.
- Ergänze eine zeitlich begrenzt aktive Umwandlungswand: Von oben hineinfallende Felsen werden zu Edelsteinen,
  Edelsteine zu Felsen. Definiere Aktivierung, Laufzeit und Verhalten bei blockiertem Ausgabefeld eindeutig.
- Tod oder Zeitablauf führen zu einem klaren Niederlagenzustand mit unmittelbarer Neustartmöglichkeit.
- Es gibt keine begrenzten Leben und keinen Verlust bereits freigeschalteter Level.

Lege die genauen Regeln vor der Implementierung in einer kurzen Mechanikübersicht fest.
Dokumentiere insbesondere Tick-Reihenfolge, Kollisionsregeln, Abrollpriorität, Gegnerkontakt,
Explosionsketten und gleichzeitig eintretende Ereignisse. Eine bitgenaue Emulation des Originals ist nicht erforderlich;
entscheidend sind konsistente, verständliche und faire Regeln.

## Komfort und Spielstand

- Level-Neustart, Pause-Menü, Levelauswahl und verständliche Einführung in neue Mechaniken.
- Rückspulen statt eines einzelnen Sokoban-Undo-Schritts: Eine gehaltene Taste spult mindestens die letzten
  zehn Sekunden aktiver Spielzeit zurück, sofern bereits so viel gespielt wurde.
- Rückspulen funktioniert auch im Niederlagenbildschirm. Es stellt den vollständigen Simulationszustand wieder her:
  Spielfeld, Objektzustände, Gegner, Explosionen, Höhlenmasse, Zufallszustand, Zeit, Edelsteinzähler und Punkte.
- Nach dem Loslassen geht das Spiel vom wiederhergestellten Zustand aus weiter; die verworfene Zukunft wird entfernt.
- Speicherverbrauch des Rückspulverlaufs bleibt begrenzt. Der Verlauf muss nicht dauerhaft gespeichert werden.
- Speichere freigeschaltete Level, Einstellungen und Bestwerte versioniert im LocalStorage.
- Speichere eine laufende Partie für „Fortsetzen“ einschließlich des nötigen Simulationszustands.
  Offline vergangene Zeit darf nicht vom Levelzeitlimit abgezogen werden.
- Kennzeichne Läufe mit Rückspulen und führe ihre Bestwerte getrennt von Läufen ohne Rückspulen.
- Bei nicht verfügbarem oder beschädigtem LocalStorage läuft das Spiel weiter und meldet die Einschränkung sichtbar.
- Beim Fokusverlust oder Wechsel in einen anderen Tab pausiert das Spiel automatisch; Fortsetzen erfolgt bewusst.

## Leveldesign

- Recherchiere die Prinzipien guter Boulder-Dash-artiger Action-Puzzles.
- Erstelle mindestens 20 eigene, handgestaltete Level mit steigender Schwierigkeit.
- Führe Mechaniken schrittweise ein: Graben und Sammeln, Schwerkraft, Abrollen, Schieben,
  kontrollierte Steinschläge, Gegner, Explosionen, Höhlenmasse und Umwandlungswände.
- Spätere Level kombinieren bekannte Mechaniken zu anspruchsvollen, aber nachvollziehbaren Aufgaben.
- Mische Planungsaufgaben und Geschicklichkeit; vermeide pixelgenaue Reflexanforderungen und blindes Auswendiglernen.
- Keine unvermeidbaren Treffer beim Start, unsichtbaren Fallen oder ausschließlich glücksabhängigen Lösungen.
- Zeitlimits müssen eine nachweislich erfolgreiche Route mit angemessener Reserve erlauben.
- Verwende pro Level einen festen Zufalls-Seed, damit Neustarts, Replays und Rückspulen reproduzierbar bleiben.
- Beschreibe für jedes Level Lernziel, Schwierigkeit, Edelsteinquote und Zeitlimit.
- Belege die Lösbarkeit jedes mitgelieferten Levels durch einen gespeicherten, zeitlich getakteten Eingabereplay,
  der mit derselben Simulation automatisiert bis zum Sieg abgespielt werden kann.
- Eine bloße Prüfung der Anzahl vorhandener Edelsteine genügt nicht als Lösbarkeitsnachweis.

## Erweiterbares Levelsystem

Weitere Level müssen von Anfang an ohne Änderungen an Spiellogik, Renderer oder Menücode ergänzt werden können.
Trenne Leveldefinitionen strikt vom Programmcode. Die mitgelieferte Kampagne und später importierte Packs
verwenden dasselbe interne Datenmodell und dieselbe Validierung.

### Natives Textformat und Levelpacks

- Definiere ein dokumentiertes, versioniertes JSON-Format als UTF-8-Textdatei für Levelpacks.
  Ein Pack kann ein einzelnes Level oder eine geordnete Sammlung enthalten.
- Pack-Metadaten enthalten mindestens Formatversion, stabile Pack-ID, Titel, Autor, Revision und Herkunft/Lizenz.
- Jedes Level besitzt eine innerhalb des Packs eindeutige, stabile ID, eine Revision, Name, Beschreibung/Lernziel,
  Schwierigkeit, Breite, Höhe, Zeitlimit, Edelsteinquote und Zufalls-Seed.
- Speichere das Spielfeld als Array gleich langer Zeichenketten mit dokumentierter Symboltabelle.
  Alle geforderten Elemente einschließlich anfänglicher Gegnerrichtungen müssen eindeutig darstellbar sein.
- Trenne Metadaten, Kartenlayout und Mechanikparameter. Benötigte Werte für Höhlenmasse und Umwandlungswand
  müssen ausdrückliche Einheiten und dokumentierte Standardwerte besitzen.
- Gib die unterstützte Regelversion an: Ein formal korrektes Layout ist nicht automatisch mit jeder
  Boulder-Dash-Variante spielmechanisch kompatibel.
- Liefere eine kleine eigene Beispieldatei als Vorlage und eine vollständige Formatbeschreibung.
  Ein grafischer Leveleditor ist nicht erforderlich.

### Laden und nachträgliches Hinzufügen

- Die mitgelieferten Packs sind beim Doppelklick auf `index.html` sofort verfügbar.
  Nutze dafür ein mitgeliefertes Datenbundle als klassisches Skript, das aus den nativen Textdateien erzeugt wird;
  die Textdateien bleiben die maßgebliche Quelle und werden nicht parallel von Hand im Bundle gepflegt.
- Liefere das kleine Werkzeug zum Aktualisieren dieses Bundles mit. Es wird nur beim Bearbeiten der
  mitgelieferten Sammlung benötigt, niemals zum Starten des Spiels oder beim Import zusätzlicher Packs.
- Biete im Spiel „Levelpack importieren“ über eine Dateiauswahl an. Lies die vom Nutzer ausgewählten Dateien
  über die Browser File API; keine Serverpflicht, keine automatische Verzeichnissuche und kein `fetch()` unter `file://`.
- Importierte Dateien sind ausschließlich Daten: kein `eval()`, kein ausführbarer JavaScript-Import,
  kein HTML aus Metadaten und keine von Packs ausgelösten Netzwerkzugriffe.
- Validiere ein Pack vollständig, bevor es in die Sammlung aufgenommen wird.
  Fehler nennen Datei, Level-ID und möglichst Feld bzw. Kartenposition; keine stillen Ersetzungen unbekannter Elemente.
- Prüfe mindestens Format-/Regelversion, eindeutige IDs, rechteckige Raster, gültige Symbole, genau einen Start,
  genau einen Ausgang, zulässige Parameter und sichere Kartenränder.
  Lege begründete Grenzen für Dateigröße, Levelanzahl und Kartenabmessungen fest.
- Eine Edelsteinquote darf nicht allein deshalb abgelehnt werden, weil anfangs weniger Edelsteine auf der Karte liegen:
  Explosionen oder Umwandlungen können weitere erzeugen.
- Strukturell gültige, selbst importierte Level ohne erfolgreichen Lösungsreplay sind als „Lösbarkeit ungeprüft“
  spielbar. Behaupte für sie keine automatisch nachgewiesene Lösbarkeit.
- Speichere importierte Packs lokal, sodass sie nach einem Neustart weiter verfügbar sind.
  Bei Speicherfehlern bleibt ein ausdrücklich als temporär gekennzeichneter Import für die Sitzung nutzbar.
- Bei gleicher Pack-ID niemals still überschreiben: Biete Abbrechen oder bestätigtes Ersetzen an.
  Mitgelieferte Packs dürfen durch einen Import nicht überschrieben werden.
- Zusätzliche Packs sind separat auswählbar und sperren die Hauptkampagne nicht. Ihre Level sind direkt anwählbar.
  Die Auswahl muss mit beliebig vielen Einträgen innerhalb der dokumentierten Grenzen umgehen können,
  etwa durch Scrollen oder Seitenwechsel; keine fest verdrahtete Anzahl von 20 oder 40 Leveln.
- Ordne Fortschritt, Bestwerte und Spielstände stabil über Pack-ID und Level-ID zu, nicht über Listenpositionen.
  Binde Replays, Bestwerte und laufende Partien zusätzlich an Levelrevision und Regelversion.
  Eine geänderte Leveldefinition darf keine alten Bestwerte oder Spielstände als kompatibel ausgeben.
- Pack-Ergänzungen oder Umsortierungen dürfen bestehende Fortschritte unveränderter Level nicht verlieren.
  Biete das Entfernen importierter Packs mit Bestätigung und klarer Angabe der dabei entfernten lokalen Daten an.

### Externe Formate und Kompatibilität

- Halte Parser/Importer von Simulation und internem Datenmodell getrennt, sodass später weitere Eingabeformate
  über klar abgegrenzte Konverter ergänzt werden können. Baue dafür kein allgemeines Plugin-System.
- Berücksichtige als Referenzen das einfache Textformat von `aozmekik/boulder-dash-C-implementation`
  und das Community-Format BDCFF (Boulder Dash Common File Format).
- Die erste Version muss das native JSON-Format vollständig unterstützen; vollständige Fremdformat-Importer
  sind nicht Teil dieses Pflichtumfangs. Dokumentiere mögliche Zuordnungen und bekannte Kompatibilitätsgrenzen.
- Ein künftiger Importer muss nicht unterstützte Elemente, Regeln und Metadaten ausdrücklich melden.
  Beispielsweise dürfen Wasser oder verfolgende Gegner aus der C-Implementierung nicht still als
  Höhlenmasse oder Wandfolge-Gegner interpretiert werden.
- BDCFF kann neben Karten weitere Eigenschaften und Konstruktionsanweisungen enthalten.
  Behaupte keine vollständige BDCFF-Unterstützung für einen Parser, der nur ein Kartenraster versteht.
- Cave-Map-Bilder dienen der Recherche; automatisches Nachzeichnen, Scraping oder Mitliefern fremder
  Levelsammlungen ist nicht Bestandteil des Auftrags. Technische Importfähigkeit ersetzt keine Nutzungsrechte.

## Steuerung

Tastatur:

- Pfeiltasten oder WASD: Bewegen; in Menüs navigieren.
- Leertaste oder Umschalt zusammen mit einer Richtung: Graben/Sammeln ohne Bewegung.
- Z oder U halten: Rückspulen.
- R: Level-Neustart mit Bestätigung bei laufender Partie.
- Esc oder P: Pause; Esc außerdem zurück.
- Enter: Bestätigen.
- M: Ton ein/aus.

Gamepad mit Standard-Mapping:

- Linker Stick oder Steuerkreuz: Bewegen; in Menüs navigieren.
- A halten und Richtung: Graben/Sammeln ohne Bewegung; A in Menüs: Bestätigen.
- B halten: Rückspulen; B in Menüs: Zurück.
- Y: Level-Neustart mit Bestätigung.
- Start: Pause/Fortsetzen.

Gamepads werden nach der ersten erforderlichen Benutzereingabe automatisch erkannt.
Unterstütze Hotplugging, sinnvolle Stick-Deadzone und eindeutige Vier-Richtungs-Eingaben.
Beim Trennen eines aktiv verwendeten Controllers wird pausiert.
Falls die Gamepad-API im jeweiligen Browser oder unter `file://` eingeschränkt ist, erkläre dies sichtbar;
Tastatursteuerung bleibt nutzbar, und die README nennt den lokalen Webserver als Alternative.
Menüs sind zusätzlich mit der Maus bedienbar. Hinweise passen sich dem zuletzt verwendeten Eingabegerät an.
Verhindere das Scrollen der Seite durch Spieltasten, ohne normale Bedienelemente unnötig zu blockieren.

## Technische Anforderungen

- Nutze HTML5 Canvas mit flüssiger Darstellung bei angestrebten 60 FPS.
- Trenne Rendering, Simulation, Eingabe, Audio, Levelverwaltung, Speicher und Benutzeroberfläche.
- Die Simulation arbeitet mit einem festen Zeitschritt unabhängig von Bildwiederholrate und Rendering.
- Verwende eine diskrete, deterministische Rasterphysik, keine allgemeine Physik-Engine.
- Ein Objekt darf pro Simulationstick nicht versehentlich mehrfach bewegt oder verarbeitet werden.
- Definiere eine stabile Verarbeitungsreihenfolge und teste deren Auswirkungen ausdrücklich.
- Alle spielrelevanten Zufallsentscheidungen verwenden einen explizit gespeicherten Seed/Zufallsgeneratorzustand.
- Nutze zwischen Simulationsticks visuelle Interpolation, ohne die Kollisionslogik zu verändern.
- Verhindere große Simulationssprünge nach Tab-Wechseln oder längeren Unterbrechungen.
- Die Spiellogik ist ohne DOM, Canvas und echte Uhr testbar; Replays enthalten Eingaben pro Simulationstick.
- Verwende stabile Level-IDs und validiere Leveldaten sowie geladene Spielstände.
- Erzeuge passende eigene Soundeffekte per WebAudio oder liefere selbst erzeugte Audiodateien.
- Audio startet erst nach einer Benutzerinteraktion; Lautstärke und Stummschaltung sind einstellbar.

## Benutzeroberfläche

- Retro-inspirierter Titelbildschirm mit „Neues Spiel“, „Fortsetzen“, Levelauswahl, Hilfe und Einstellungen.
- HUD mit Levelnummer/-name, gesammelten und benötigten Edelsteinen, Restzeit und Punktestand.
- Klar erkennbarer Status des Ausgangs und Hinweis bei Erreichen der Edelsteinquote.
- Pause-Menü, Sieg-Bildschirm und Niederlagenbildschirm mit verständlicher Ursache.
- Beim Rückspulen eindeutige visuelle Rückmeldung und Anzeige der noch verfügbaren Rückspulzeit.
- Keine Sokoban-spezifischen Zug- oder Push-Zähler als zentrale Spielziele.

## Qualität und Abnahme

- Liefere wartbaren, sauber strukturierten Code; kommentiere nicht offensichtliche Regeln und Entscheidungen.
- Implementiere automatisierte Tests für Fallen, Abrollen, Schieben, Gegnerbewegung, Explosionen,
  Höhlenmasse, Umwandlungswand, Sieg/Niederlage und deterministische Tick-Verarbeitung.
- Prüfe Rückspulen inklusive Timer und Zufallszustand sowie Speichern/Fortsetzen durch Zustandsvergleiche.
- Teste Levelpack-Import mit gültigen und fehlerhaften Dateien, unbekannten Versionen/Symbolen, doppelten IDs,
  überschrittenen Größenlimits, Speicherfehlern und bestätigtem Ersetzen.
- Prüfe, dass ein neu importiertes Pack ohne Codeänderung auswählbar ist und nach Neuladen erhalten bleibt;
  das muss auch unter `file://` funktionieren, sofern der Browser lokalen Speicher zulässt.
- Prüfe, dass die Daten im mitgelieferten Bundle den nativen Quelldateien entsprechen und dass Umsortieren,
  Ergänzen und Revisionswechsel keine Fortschritte falsch zuordnen oder inkompatible Partien fortsetzen.
- Führe die Lösungsreplays aller mitgelieferten Level automatisiert aus. Dokumentiere den Prüfaufruf und tatsächliche Ergebnisse.
- Prüfe Start über `file://` und lokalen Webserver sowie Tastatur, Gamepad, Pause, Fokusverlust und Skalierung.
- Behaupte keine durchgeführten Browser- oder Hardwaretests, die tatsächlich nicht ausgeführt wurden;
  kennzeichne verbleibende manuelle Prüfschritte.
- Erstelle eine README mit Startanleitung, Steuerung, Mechanikübersicht, Architekturentscheidungen,
  Projektstruktur, Testaufrufen und einer Schritt-für-Schritt-Anleitung zum Erstellen, Importieren und
  dauerhaften Mitliefern neuer Levelpacks einschließlich Formatbeispiel und Lizenzangaben.
- Dokumentiere Quellen, etwaige Fremdlizenzen und bewusst gewählte Abweichungen von klassischen Regeln.
- Liefere ein vollständig spielbares Ergebnis ohne TODO-Platzhalter für geforderte Kernfunktionen.

## Recherchehinweis zur Vorlage

Stand der Recherche: 27. November 2026.

Das Alter von Boulder Dash bedeutet nicht, dass der Originalquellcode gemeinfrei oder Open Source ist.
Eine offizielle Open-Source-Freigabe des ursprünglichen C64-Quellcodes wurde bei dieser Recherche nicht belegt.
BBG Entertainment meldete 2017 die Übernahme der Boulder-Dash-Rechte von First Star Software:
https://bbg-entertainment.com/boulder-dash-is-now-owned-by-bbg-entertainment/

Rocks'n'Diamonds ist eine separat entwickelte, quelloffene Alternative, nicht der Originalquellcode von Boulder Dash.
Sein Repository weist die GPL-2.0 aus; vor einer Codeübernahme sind die konkreten Lizenzpflichten zu prüfen.
Eine solche Übernahme ist für diesen Projektauftrag nicht erforderlich:
https://github.com/ArtsoftEntertainment/rocksndiamonds
https://github.com/ArtsoftEntertainment/rocksndiamonds/blob/master/COPYING

Weitere Referenzen für Leveldaten und spätere Importer:

- https://github.com/aozmekik/boulder-dash-C-implementation
  Beschreibt zehn Level in Plain-Text-Dateien mit Kopfzeilen und Zeichenraster. Die Regeln unterscheiden sich
  teilweise vom hier geforderten Spiel. Zum Recherchezeitpunkt ist keine Lizenz ausgewiesen;
  die README weist außerdem auf fremde Grafik-/Soundassets ohne dokumentierte Herkunft hin.
- https://github.com/rossberg/boulder-dash
  Beschreibt eine OCaml-Neuimplementierung mit 40 Leveln und fünf Schwierigkeitsstufen aus Boulder Dash 1 & 2.
  Laut README steht der Quellcode unter CC BY-NC 4.0 (Namensnennung, nicht kommerziell).
  Diese Angabe ist keine pauschale Freigabe der übernommenen Originallevel, Grafiken oder Sounds.
- https://www.boulder-dash.nl/maps.php?lang=en
  Kartenansichten offizieller und von Fans erstellter Höhlen, laut Seite aus BDCFF erzeugt.
- https://www.boulder-dash.nl/bdcff.php?lang=en
  Erläuterung des Boulder Dash Common File Format mit Verweisen auf Formatdokumentation und Levelsammlungen.
  Die Verfügbarkeit dieser Downloads ist kein Nachweis einer Weitergabelizenz für jedes enthaltene Level.
