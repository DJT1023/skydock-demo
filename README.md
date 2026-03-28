# SkyDock — UAV Rooftop Delivery System Demo

Interactive Three.js demo for US Patent 20220356019A1.
Two modes: cinematic auto-flight and manual game flight.

---

## Quick Start

```bash
cd three-demo
npm install
npm run dev
```

Then open http://localhost:5173 in your browser.

---

## File Structure

```
three-demo/
├── index.html              # Main HTML, HUD, mode select UI
├── vite.config.js          # Dev server config
├── package.json
├── public/
│   └── assets/             # ← YOUR GLB FILES GO HERE
│       ├── RotateDock_045deg.glb
│       ├── RotateDock_040deg.glb
│       │   ... (all Phase 1 rotation files)
│       ├── RotateDock_000deg.glb
│       ├── RD_Plat5in.glb
│       │   ... (all Phase 2 extension files)
│       ├── RD_Plat25in.glb
│       ├── LSPan01.glb
│       │   ... (all Phase 3 panel files)
│       └── LSPan07.glb
└── src/
    ├── main.js             # Entry: renderer, camera, loop
    ├── scene.js            # Sky, lighting, ground, warehouse, roads
    ├── neighborhood.js     # Procedural low-poly houses + trees
    ├── drone.js            # Drone mesh + propeller animation
    ├── receptacle.js       # GLB loader + 3-phase transition sequencer
    └── controls.js         # Cinema mode autopilot + game mode flight
```

---

## Your GLB Files

Place all GLB files in `public/assets/`. The expected filenames are:

**Phase 1 — Rotation (45° → 0°, 10 files)**
```
RotateDock_045deg.glb  RotateDock_040deg.glb  RotateDock_035deg.glb
RotateDock_030deg.glb  RotateDock_025deg.glb  RotateDock_020deg.glb
RotateDock_015deg.glb  RotateDock_010deg.glb  RotateDock_005deg.glb
RotateDock_000deg.glb
```

**Phase 2 — Platform Extension (5in–25in, 5 files)**
```
RD_Plat5in.glb   RD_Plat10in.glb  RD_Plat15in.glb
RD_Plat20in.glb  RD_Plat25in.glb
```

**Phase 3 — Panel Spread (7 files)**
```
LSPan01.glb  LSPan02.glb  LSPan03.glb  LSPan04.glb
LSPan05.glb  LSPan06.glb  LSPan07.glb
```

If any file is missing, the app uses an animated placeholder so you can
still run the demo while iterating in FreeCAD/Blender.

---

## Receptacle Scale & Position

Your GLB files are exported from FreeCAD in real-world units (likely mm or inches).
You may need to scale them to match the Three.js scene (1 unit = 1 meter).

In `receptacle.js`, after loading, add a scale line:
```js
model.scale.setScalar(0.01);  // if exported in mm
// or
model.scale.setScalar(0.0833);  // if exported in inches (1in = 0.0833m... ish)
```

Also adjust `receptacle.placeAt(x, y, z)` — the y value is the rooftop height.

---

## Animation Speed

In `receptacle.js`, change `this.frameDuration`:
```js
this.frameDuration = 0.18;  // seconds per frame  (lower = faster)
```

- `0.10` = snappy/fast
- `0.18` = smooth default
- `0.30` = slow/dramatic

---

## WordPress Embed

1. Run `npm run build` — creates `dist/` folder
2. Upload `dist/` to your web host or WordPress server
3. On any WordPress page, add a Custom HTML block:

```html
<iframe
  src="https://yourdomain.com/path-to/dist/index.html"
  width="100%"
  height="600px"
  frameborder="0"
  allowfullscreen
  style="border-radius: 12px;">
</iframe>
```

Or use the WP Iframe plugin for simpler embedding.

---

## Controls (Game Mode)

| Key | Action |
|-----|--------|
| W / S | Forward / Backward |
| A / D | Strafe Left / Right |
| ↑ / ↓ | Ascend / Descend |
| ← / → | Rotate (yaw) |
| SPACE | Trigger delivery (near house) |

---

## Next Steps / Enhancements

- Add `drone.glb` to `public/assets/` and load it in `drone.js`
- Add particle effects (prop wash, dust on landing)
- Add sound (prop hum, deployment click)
- Add a minimap HUD element
- Add mobile touch controls (joystick overlay)
- Add day/night cycle option
