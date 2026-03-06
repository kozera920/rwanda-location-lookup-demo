# Rwanda Location Lookup Demo

Minimal React + Tailwind demo showing how to use [rwanda-location-lookup](https://github.com/kozera920):

- Forward lookup: `latitude/longitude -> province/district/sector/cell/village`
- Reverse lookup: `province/district/sector/cell/village -> center coordinates`
- Device geolocation support (browser API)

This demo currently references the local package using:
`"rwanda-location-lookup": "^1.1.1"`.
After publishing `1.1.0+`, you can switch it to a normal npm version.

## Run locally

```bash
cd demo
npm install
npm run dev
```

## Package APIs used

- `loadData`
- `lookupByCoords`
- `centerBy`
