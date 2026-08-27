# Schaltpunkt

Fortschritts-Tracker für die Führerscheinausbildung, Klasse B197.
Installierbare PWA ohne Server, ohne Konto, ohne Framework. Alle Daten liegen im
localStorage des Geräts.

## Wichtig: flache Ordnerstruktur

Alle Dateien liegen **direkt im Repository-Wurzelverzeichnis**, ohne Unterordner.
Das ist Absicht: Beim Hochladen ueber die GitHub-Weboberfläche gehen Unterordner
sonst gern verloren, und ohne erreichbares 192er- und 512er-Icon bietet Chrome nur
eine Verknuepfung statt einer echten Installation an.

    index.html
    style.css
    logic.js
    app.js
    manifest.json
    sw.js
    icon-192.png
    icon-512.png
    icon-maskable-192.png
    icon-maskable-512.png
    apple-touch-icon.png

## Veröffentlichen

1. Alle Dateien in ein leeres Repository laden.
2. Settings, Pages, Source: Deploy from a branch, Branch main, Ordner / (root).
3. Nach ein bis zwei Minuten läuft die App unter https://NAME.github.io/REPO/

## Installation klemmt?

In der App: Mehr, Daten, Installation prüfen. Die Seite testet HTTPS, manifest.json,
beide Icons und den Service Worker und sagt genau, was fehlt.

## Nach einer Änderung

In sw.js die Zahl in CACHE erhöhen (schaltpunkt-v3 auf v4 und so weiter).
Sonst liefert der alte Service Worker weiter die alte Version aus.

## Aufbau

| Datei | Zweck |
|---|---|
| index.html | Gerüst: Kopfzeile, vier Ansichten, Unterseiten-Container, Sheet |
| style.css | Gestaltung, sechs Akzentfarben, hell und dunkel |
| logic.js | Rechenkern: Zähler, Fristen, Kosten, Prognose, Validierung |
| app.js | Oberfläche: Navigation, Formulare, Speichern, Backup |
| sw.js | Offline-Cache |

## Rechtsstand der Vorgaben

- 12 Sonderfahrten Klasse B: 5 Überland, 4 Autobahn, 3 Nacht, je 45 Minuten (Paragraf 5 FahrschAusbO)
- 14 Doppelstunden Theorie beim Ersterwerb: 12 Grundstoff, 2 Zusatzstoff
- B197: mindestens 10 Fahrstunden auf Schaltwagen plus Testfahrt ab 15 Minuten (Paragraf 5a FahrschAusbO)
- Praktische Prüfung innerhalb von 12 Monaten nach der Theorieprüfung, Wiederholung
  in der Regel frühestens nach 2 Wochen, Aushändigung spätestens 2 Jahre nach der
  Prüfung (Paragraf 18 FeV)

Alle Werte sind in den Einstellungen änderbar.
