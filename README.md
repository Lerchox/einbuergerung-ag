# Einbürgerung Aargau – Lerntrainer

Mit diesem Lerntrainer übst du für den **staatsbürgerlichen Test des Kantons Aargau** und für das **Einbürgerungsgespräch in Strengelbach**. Zu jeder Frage gibt es einen Knopf, der Frage und Antworten auf **Spanisch (Venezuela)** umschaltet.

> Das ist ein inoffizielles Lernwerkzeug für den privaten Gebrauch. Die App sammelt keine persönlichen Daten. Der Lernfortschritt bleibt nur im eigenen Browser gespeichert.

## Starten

**Online / Handy:** https://lerchox.github.io/einbuergerung-ag/

- **iPhone (Safari):** Teilen-Symbol → «Zum Home-Bildschirm»
- **Android (Chrome):** Menü ⋮ → «App installieren» bzw. «Zum Startbildschirm hinzufügen»

Nach dem ersten Öffnen funktioniert die App auch offline.

**Am Computer ohne Internet:** Doppelklick auf **`app/index.html`**.

Jede Änderung im Ordner `app/` wird über GitHub Actions automatisch veröffentlicht.

## Inhalt

| Kapitel | Inhalt | Quelle |
|---|---|---|
| 1 · Offizieller Übungstest | 326 Fragen inkl. Lösungen und 7 Bildfragen | Übungstest der Gemeindefachverbände Aargau, gültig ab 29.09.2025 |
| 2 · Strengelbach & Alltag | 65 Zusatzfragen zu Gemeinde, Abfall, Notfall, ÖV und Bräuchen | strengelbach.ch, Wikipedia, kantonales Handbuch Anhang 4 (Stand Nov. 2026) |

**Prüfungssimulation nach dem offiziellen Schlüssel**
- 45 Fragen, 40 Minuten, **bestanden ab 34 richtigen Antworten**
- Fragen pro Kategorie: Demokratie/Föderalismus 11, Sozialstaat 5, Rechtsstaat 10, Geschichte 13, Zivilgesellschaft 6
- Quellen: Kanton Aargau, Handbuch ordentliche Einbürgerungen, Anhang 2 (Version 30.06.2026), und KBüV § 3

## Daten aktualisieren (bei einem neuen Übungstest-PDF)

Voraussetzung: Python mit `pymupdf`.

```bash
python tools/parse.py <übungstest.pdf> tools/quellen/raw.json
python tools/build.py tools/quellen app/data.js
```

Die spanischen Übersetzungen liegen in `tools/quellen/es_*.txt`, eine Zeile pro Frage. Die Fragen von Kapitel 2 stehen in `tools/quellen/ch2.txt`. Neue oder geänderte Fragen musst du dort von Hand ergänzen.
