# DCS WWII SFM Studio

Web tool for DCS World modders that compiles ready-to-use **Standard Flight Model (SFM)** `.lua` files for WWII aircraft.

**Live site:** https://saelind76.github.io/dcs-sfm-studio/

## What it does

- **Catalog mode (PRESET):** pick one of the 64 catalog aircraft (filter by theater: PTO / ETO), see its installed engine, and optionally apply quick overrides (`M_nominal`, `cx_brk`, `V_stall`, `Vmax_SL`, `Vy_max`).
- **Modder mode (CUSTOM):** enter your own aircraft geometry, weights, speeds and coefficients, and either use one of the 34 catalog engines or define a CUSTOM engine (displacement, stroke, RPM, manifold pressures, propeller, firing order and more).
- **My Hangar:** save your CUSTOM aircraft and engines in your browser (`localStorage`) and export or import them as a personal `.json` file. Nothing is sent to or stored on the server.
- **Results:** summary metrics (wing loading, aspect ratio, Cy0, CyMax, Cx0, B4 at M0.24, Mzalfa, Mzalfadt, M_CR, M_DD, Ny limits, static thrust), an interactive drag polar (Chart.js), the 10-point Mach aerodynamic table, and the generated Lua with **Copy Clean Lua** and **Download `<Aircraft>_SFM.lua`** (plain UTF-8).

## Architecture

This repository is a static front end (`index.html`, `styles.css`, `app.js`) served by GitHub Pages. It contains **no aerodynamic formulas and no aircraft or engine databases**. Every calculation is requested from a private backend through `POST /api/compile`; the catalog (names, theater, role, installed engine) comes from `GET /api/catalog`, and the server status indicator uses `GET /api/health`.

The backend runs on a free hosting tier, so the first request after a period of inactivity can take up to a minute while the server wakes up. The header shows `Online` or `Waking up free tier server...`.

## Configuration

The API address is the `API_BASE_URL` constant at the top of `app.js`. The backend only accepts requests from `https://saelind76.github.io` and from `localhost` / `127.0.0.1` on ports 5500 and 8000, and limits `/api/compile` to 25 requests per minute per IP.

To run locally, serve this folder on port 5500 or 8000 (for example `python -m http.server 5500`) and open `http://localhost:5500`.

## Notes

Unofficial community tool, not affiliated with or endorsed by Eagle Dynamics SA. The generated values are modeling starting points; always validate the result in DCS World.
