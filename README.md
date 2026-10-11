# Private Sommelier

A private cellar app for Portuguese wine. It tracks the bottles you own, tells you when each one is good to drink, and shows what the cellar is worth.

## What works today

- Add, edit and remove bottles by hand, in one or more cellars.
- Drinking window for each bottle: too young, approaching, prime, declining or past prime, with the years behind it.
- "Open tonight": the bottles worth opening now, most time-sensitive first.
- Mark a bottle as opened, with a rating (liked, OK, disliked) and a note. Undo if it was a mistake.
- Price stickers: green below €10, blue €10 to €30, red above €30.
- Cellar value and average bottle price.

Data is stored in the browser for now, on one device.

## Not built yet

- Adding a bottle from a photo of the label.
- Sync between devices and family members.
- Price lookup, food and occasion pairing, restaurant menu help, deals.

## How the drinking window is estimated

From rules of thumb by wine type, Portuguese region and level (everyday, reserva, top). See `src/lib/windows.ts`. It is an estimate of the style, not of one producer or one year, and it assumes good storage.

## Run it

```bash
npm install
npm run dev
```

```bash
npm test
```
