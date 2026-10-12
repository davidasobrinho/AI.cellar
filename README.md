# Cave Sobri

A private cellar app for Portuguese wine. It tracks the bottles you own, tells you when each one is good to drink, and shows what the cellar is worth.

## What works today

- Sign in with Google. Cellars are saved in Firebase and can be shared with other Google accounts.
- Add, edit and remove bottles, in one or more cellars.
- A drinking window for each bottle (wait, ready, at peak, drink soon, past best), as a list and as a timeline.
- "Don't miss these": the bottles whose window is closing.
- Open a bottle with a rating (liked, OK, disliked) and a note. Undo if it was a mistake.
- Price stickers: green below €10, blue €10 to €30, red above €30. Cellar value and average bottle price.
- Reading a bottle from photos of its labels with Gemini, once App Check is set up (see below). Not yet tested against a live project.

## Not built yet

- Price lookup, food and occasion pairing, restaurant menu help, deals.

## How the drinking window is estimated

A window read from the label photos, or typed in, is used as given. Without one, it comes from rules of thumb by wine type, Portuguese region and level (everyday, reserva, top), in `src/lib/windows.ts`. Both are estimates and assume good storage.

## Run it

```bash
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill it in to use Firebase. Without it, or with `npm run dev -- --mode offline`, the cellar is kept in the browser with no sign-in.

```bash
npm test
```
