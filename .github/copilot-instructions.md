# Arbeitsregeln für Sturzstein

## Geltungsbereich und Freigaben

Diese Regeln gelten ausschließlich für `DerIngo/sturzstein`, nicht für andere Repositories.
Vor schreibenden GitHub-Aktionen und Pushes das tatsächliche Zielrepository prüfen.

Der Nutzer hat am 27. November 2026 für dieses Projekt ausdrücklich erlaubt:

- Issues selbstständig anlegen und kommentieren.
- Änderungen selbstständig committen und pushen.
- Issues pflegen: Titel/Beschreibungen und Abhängigkeiten aktualisieren, wieder öffnen und
  bei erfüllten Abnahmekriterien schließen. Ausstehende Nutzerabnahmen bleiben erforderlich.
- Labels anlegen, bearbeiten und zuweisen; vorhandene Labels nicht ungefragt löschen.
- Die fünf geplanten Meilensteine M1 bis M5 anlegen und verwalten sowie Issues zuordnen.
  Keine Termine erfinden.

Am 27. November 2026 wurde zusätzlich die Einrichtung von GitHub Pages für dieses Repository
freigegeben: Veröffentlichung aus `main`, Verzeichnis `/`, unter der GitHub-Standardadresse.
Pushes auf `main` aktualisieren damit automatisch die öffentliche Spielversion.
Diese Freigabe umfasst keine eigenen CI-Workflows, Domains oder weiteren Repository-Einstellungen.

Alle weiteren schreibenden GitHub-Aktionen benötigen vorherige Zustimmung, sofern sie nicht
später ausdrücklich vorab freigegeben werden. Dazu gehören insbesondere
Projects, Pull Requests und Merges, Actions-Konfiguration,
weitere Pages-Konfigurationsänderungen, Releases sowie Repository-Einstellungen.
Nur lesende Bestandsprüfungen sind davon nicht betroffen.
Keine destruktiven Aktionen oder History-Umschreibungen aus der Commit-/Push-Freigabe ableiten.
Issue-Löschungen, Repository-Löschung/-Übertragung, Änderungen an Sichtbarkeit, Zugriffsrechten,
Secrets oder Schutzregeln sowie kostenpflichtige Dienste sind nicht vorab freigegeben.
Weitere Freigaben hier mit genauem Umfang dokumentieren; keine globale Nutzerfreigabe daraus machen.

Commit-Nachrichten enthalten keinen Hinweis auf KI-Mitarbeit und keinen Co-authored-by-Trailer.
Wenn ein echtes GitHub-Issue bearbeitet wird, endet die Nachricht mit dessen ID, etwa `#47`,
ohne Klammern. Keine Ticketnummer für Arbeiten ohne Issue erfinden; S01 bis S16 sind Plan-IDs.

## Maßgebliche Informationsquellen

- `PROMPT.md`: verbindliche Produktanforderungen.
- `ISSUE_PLAN.md`: Arbeitspakete, Abnahmekriterien, Abhängigkeiten und Anforderungszuordnung.
- `docs/architecture.md`: aktueller technischer Entwurf; geplant und implementiert klar unterscheiden.
- `docs/decisions/`: wichtige Entscheidungen mit Begründung und Konsequenzen.
- GitHub-Issues: aktueller Bearbeitungsstand, Hindernisse, Prüfergebnisse und Übergaben,
  sobald die Issues angelegt sind.

Vor einer Aufgabe die relevanten Dokumente und vorhandenen Code lesen. Vor Issue-Arbeit auch
das Issue und seine Voraussetzungen prüfen. Keine doppelte Statusliste oder Chatprotokollsammlung führen.
Bei technischen Änderungen die betroffene Dokumentation im selben Arbeitsschritt aktualisieren.
Widersprüche zur Spezifikation offen klären, nicht durch stilles Umdeuten lösen.

## Arbeitsweise

- Issues zunächst nacheinander bearbeiten; Abhängigkeiten und Abnahmekriterien beachten.
- Kleine, prüfbare Änderungen; keine ungefragte Erweiterung des Produktumfangs.
- Neue Mechaniken direkt in Replay, Rückspulen und Speicherung integrieren, sobald diese vorhanden sind.
- Spielbare Zwischenstände zur lokalen Beurteilung bereitstellen. Commit-/Push-Erlaubnis ersetzt
  weder ausstehende Nutzerabnahmen noch fehlende Tests.
- Nutzerkommunikation, Oberfläche und Dokumentation sind deutsch.
- Keine Originalassets, kopierten Originallevel oder ungeklärten Code-/Inhaltsübernahmen.
- Geheimnisse, Zugangsdaten und personenbezogene Informationen nicht in die Projektdokumentation aufnehmen.

## Technische Leitplanken und Prüfungen

Browser-Spiel mit HTML, CSS, JavaScript und Canvas; offline per `index.html` sowie über HTTP.
Kein Build zum Spielen, keine externen Frameworks/CDNs oder Laufzeitdownloads.
Lokale Spieldaten nicht über ES-Module oder `fetch()` unter `file://` laden.
Deterministische Raster-Simulation mit festem Tick, explizitem Zufallszustand und ohne DOM-Abhängigkeit.
Darstellung, Eingabe, Audio, Levelverwaltung und Speicherung von der Simulation trennen.

Passende automatisierte Tests und erforderliche manuelle Prüfungen je Änderung ausführen.
Fehler und nicht ausgeführte Browser-/Hardwaretests ausdrücklich nennen; keine erfundenen Erfolge.
Verifizierte Entwicklungsbefehle (Node.js 24 LTS):

- `npm test`: DOM-unabhängige automatisierte Tests.
- `npm run check`: JavaScript-Syntax und Abgleich des Levelbundles mit den JSON-Quellen.
- `npm run bundle`: Levelbundle nach Änderungen an `levels/*.json` neu erzeugen.
- `node tools/sprites.cjs`: die eigenen PNG-Sprites reproduzierbar neu erzeugen.
- `npm run test:browser`: Playwright-Prüfungen in Chromium und Firefox, jeweils `file://` und HTTP.
  Zur Einrichtung ausschließlich der Entwicklungswerkzeuge: `npm ci` und
  `npx playwright install chromium firefox`.

Kein dieser Entwicklungsbefehle ist zum Spielen erforderlich.
Automatisierte Browserprüfungen nicht mit menschlicher Sicht-/Spielprüfung oder echtem Controller-Test gleichsetzen.
