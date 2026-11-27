# 0001: Kleines, versioniertes Projektgedächtnis

Datum: 2026-11-27
Status: angenommen

## Kontext

Sturzstein wird schrittweise anhand von Issues implementiert. Neue Sitzungen sollen Anforderungen,
Arbeitsregeln und technische Entscheidungen nachvollziehen können, ohne vollständige Chatverläufe
zu benötigen. Mehrere parallel gepflegte Statuslisten würden leicht auseinanderlaufen.

## Entscheidung

Wir verwenden eine zentrale `.github/copilot-instructions.md` für Arbeitsregeln und Verweise.
`PROMPT.md` bleibt die Produktanforderung, `ISSUE_PLAN.md` die Gesamtplanung.
GitHub-Issues sind nach ihrer Anlage der maßgebliche Ort für den Bearbeitungsstand.
`docs/architecture.md` beschreibt den gültigen technischen Entwurf.
Dieser Ordner enthält nur wichtige Entscheidungen, keine täglichen Arbeitsberichte.

Es gibt zunächst keine zusätzliche `AGENTS.md`, allgemeine `MEMORY.md` oder Chatarchiv-Struktur.
Die nur für Sturzstein erteilten Freigaben stehen ausschließlich in den Projekt-Instructions.

## Konsequenzen

Dokumentation wird zusammen mit betroffenen Änderungen gepflegt und unterscheidet Entwurf von Implementierung.
Eine Entscheidung erhält eine fortlaufend nummerierte Datei mit Titel, Datum, Status, Kontext,
Entscheidung und Konsequenzen. Ersetzte Entscheidungen bleiben nachvollziehbar und verweisen auf den Nachfolger.
Weitere Dokumente entstehen erst, wenn ein konkreter Bedarf besteht.
