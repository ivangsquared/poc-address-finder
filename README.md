# POC Address Finder (Next.js)

A proof-of-concept integrating AddressFinder autocomplete with a map UI for NMI selection, built with Next.js and React. Users can select a point on the map, fetch the nearest NMI (mocked), and validate/confirm the address (mocked, editable).

## Tech Stack
- Next.js (React 18)
- TypeScript
- Leaflet & React-Leaflet

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Features
- Map UI with point selection
- Mocked NMI-to-geocoordinate mapping
- Mocked AddressFinder address validation
- Editable/confirmable address field

## Project Structure
- `src/pages/index.tsx` – Main app UI
- `src/pages/_app.tsx` – Global styles
- `next.config.js` – Next.js config

Preview:
![Preview](/public/preview1.png)