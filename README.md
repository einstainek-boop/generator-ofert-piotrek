# Generator ofert Piotrek

Mobilna aplikacja statyczna do szybkiego przygotowania wyceny systemu alarmowego.

## Uruchomienie lokalnie

```bash
python3 -m http.server 8097
```

Następnie otwórz `http://localhost:8097`.

## Wdrożenie na Vercel

Projekt jest statyczny, więc można wdrożyć cały folder bez procesu build.

```bash
npx vercel
```

## Edycja cen

Stałe ceny central i czujników są w pliku `app.js` w tablicach `controlPanels` oraz `motionSensors`.
Cena klawiatury, sygnalizatorów, robocizna, VAT i rabat są edytowalne bezpośrednio w formularzu.

Zdjęcia produktów są zapisane lokalnie w folderze `assets`, a PDF jest generowany w przeglądarce przez lokalną kopię `html2pdf`.
