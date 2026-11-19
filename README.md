# Vice Sunset Split

![Status](https://img.shields.io/badge/status-offline--ready-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Sizes](https://img.shields.io/badge/exports-1080x1080%20%C2%B7%201080x1350%20%C2%B7%201920x1080-orange)
![Panels](https://img.shields.io/badge/layouts-4-ff2e88)
![Grades](https://img.shields.io/badge/grades-5-7b2ff7)

**Vice Sunset Split** is an offline web app that turns any photo and a caption into GTA-style cover art — the multi-panel poster look with bold caption lettering and a Vice City sunset or neon colour grade — and exports it as a PNG to share.

## How to use

1. **Load a photo** — upload your own photo, or press *Load sample photo* to try one of the bundled samples.
2. **Pick a layout** — Split Hero, Triple Strip, Quad Grid, or Full Bleed.
3. **Pick a grade** — Vice Sunset, Neon Nights, Golden Hour, Palm Teal, or Mono Noir.
4. **Edit the caption** — title, subtitle and badge text, all live in the preview.
5. **Crop and position** — drag any panel to pan its photo, use the zoom slider to crop in, or tick *Same photo in all panels*.
6. **Export** — one click for 1080 &times; 1080, 1080 &times; 1350 or 1920 &times; 1080, or *Export all three* at once.

## What it makes

- **4 layouts**: Split Hero (big left panel + 2 stacked right), Triple Strip (3 vertical panels), Quad Grid (2&times;2), Full Bleed (single photo + title band).
- **5 sunset / neon grades**: gradient-map colour grades with saturation and contrast, applied per panel.
- **Bold lettering**: heavy system-font title with a sunset gradient fill and dark outline, plus subtitle and badge.
- **Polish**: film grain, vignette, and white panel gutters.
- **3 export sizes**: 1080 &times; 1080 (square), 1080 &times; 1350 (portrait), 1920 &times; 1080 (wide).

## Offline, private by design

The app is plain static files under `app/` with no build step and no network requests. Photos are read on your own machine and never uploaded anywhere.

## Run it

Serve `app/` with any static server, for example:

```sh
cd app && python3 -m http.server 8123
```

then open <http://localhost:8123/> in desktop Chrome.

## Screenshot modes

- `?shot=editor` — the editor with the sample photo loaded.
- `?shot=cover&size=wide|square|portrait` — the exported cover drawn full-frame.

## License

MIT — see `LICENSE`. All lettering uses system fonts; no Rockstar Games logo, artwork or font is used anywhere.
