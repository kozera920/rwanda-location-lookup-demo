# Rwanda Location Lookup Demo

Minimal React + Tailwind demo showing how to use `rwanda-location-lookup`:

- Forward lookup: `latitude/longitude -> province/district/sector/cell/village`
- Reverse lookup: `province/district/sector/cell/village -> center coordinates`
- Device geolocation support (browser API)

This demo currently references the local package using:
`"rwanda-location-lookup": "file:../packages/rwanda-location-lookup"`.
After publishing `1.1.0+`, you can switch it to a normal npm version.

## Run locally

```bash
cd demo
npm install
npm run dev
```

## Deploy on Vercel

1. Import the repo in Vercel.
2. Set **Root Directory** to `demo`.
3. Build command: `npm run build`
4. Output directory: `dist`

## Package APIs used

- `loadData`
- `lookupByCoords`
- `centerBy`
