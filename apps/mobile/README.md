# OurPlan Mobile

The OurPlan mobile app — **React Native** on **Expo SDK 54** with **Expo Router**, **Zustand** state, and an **axios** client that talks to the API at `/api/v1`.

> Part of the OurPlan monorepo — see the [root README](../../README.md) for architecture and the full feature set.

## Requirements

- Node.js ≥ 18 and pnpm ≥ 8
- The [Expo Go](https://expo.dev/go) app, or a custom dev build
- The OurPlan API running (see [`../api/README.md`](../api/README.md))

## Setup & Run

From the repo root:

```bash
pnpm install
pnpm mobile        # = expo start
```

Or inside `apps/mobile`:

```bash
pnpm start         # expo start
pnpm ios           # expo run:ios   (native build)
pnpm android       # expo run:android (native build)
pnpm web           # expo start --web
```

Scan the QR code with Expo Go, or press `i` / `a` to open a simulator.

## Environment

Create `apps/mobile/.env`:

```bash
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
```

`EXPO_PUBLIC_API_URL` is the base URL the axios client uses for every request. When testing on a physical device, replace `localhost` with your machine's LAN IP (e.g. `http://192.168.1.20:3000/api/v1`) so the phone can reach the API.

## Maps & native builds

The location picker (`app/location/picker.tsx`) uses **`react-native-maps`**, which does **not** run in the standard Expo Go client — you need a **native / custom dev build** (`pnpm ios` or `pnpm android`, or an EAS build).

A **Google Maps API key** is required for the map to render. It's configured in [`app.json`](./app.json) under `expo.ios.config.googleMapsApiKey` (set `GOOGLE_MAPS_API_KEY` to your own key before producing a build; add the equivalent Android config when targeting Android).

## Project layout

```
app/          # Expo Router routes — (auth), (tabs), event/, groups/, settings/, …
components/   # UI + feature components (schedule, quickShift, ui)
store/        # Zustand stores (auth, schedule, quickShift, theme, language, pro)
lib/          # api client, date utils, calendar export, purchases (demo stub)
constants/    # theme.ts (8 themes), quickShift.ts
```

> **Note:** in-app purchases in `lib/purchases.ts` are a **demo stub** — they ship with placeholder RevenueCat keys and short-circuit to success in development. See the root README's *Notes / Roadmap* section.
