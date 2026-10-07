# Tech Layoffs: Animated Data Video

A 30-second animated chart video about tech-industry layoffs, generated entirely from code and data.

The rendered videos are in [`out/`](out/).

## How it works

1. `prep.mjs` reads the CSV files in `data/` and writes `src/data.json`, so every number on screen comes from the data files.
2. `src/Layoffs.jsx` is a React component that draws and animates the charts frame by frame with [Remotion](https://www.remotion.dev).
3. Remotion renders the composition to a 1920×1080, 30 fps MP4.

## Tech

React, Remotion, Node.js.

## Data

A Kaggle dataset compiled from [Layoffs.fyi](https://layoffs.fyi). Each event row carries its original source link.

## Running it

```bash
npm install
```

```bash
npm run preview
```

```bash
npm run render
```

`preview` opens Remotion Studio; `render` writes the MP4 to `out/`.
