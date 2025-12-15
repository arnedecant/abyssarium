# Abyssarium

Abyssarium is a **small holographic creature habitat** designed to run on a Raspberry Pi 5 inside a Pepper’s Ghost–style dome.

Think: a tiny abyss full of low-poly creatures (fish, monsters, spirits, whatever you drop in) that reacts to **presence, motion, sound, and gestures** – all powered by a **web-first** stack.

---

## Concept

* 🌀 **WebGL “tank”** rendered with Three.js
* 🐙 **Low-poly creatures** (glTF) with skeletal animations
* 🌫️ **Stylized environments** (aquarium / void / eldritch biomes)
* 👋 **Interaction via browser APIs**:

  * `getUserMedia` webcam → basic gesture / motion detection
  * `getUserMedia` microphone → audio-reactive behavior
* 💻 **Same app runs**:

  * on a Raspberry Pi 5 in Chromium kiosk mode
  * hosted anywhere (desktop browser, laptop, etc.)

> **Note:** If browser-based gesture / pose detection ever becomes too heavy on the Pi, there is room for an **optional Python/OpenCV helper service** that offloads some of that work. But the primary architecture is **web-first and self-contained in the browser**.

---

## Tech Stack

**Core (web-first)**

* **TypeScript**
* **Vite** – dev server & bundler
* **Three.js** – WebGL rendering
* **Browser APIs**

  * `getUserMedia` (camera & microphone)
  * `requestAnimationFrame`, `WebGLRenderingContext` (via Three.js)
  * Optional: Web Workers for offloading some processing

**Target device**

* **Raspberry Pi 5 (8GB)** running Raspberry Pi OS
* **Chromium** in kiosk mode pointing to the built Abyssarium app

**Optional future helpers (non-core, experimental path)**

* **Python 3 + OpenCV + websockets** to:

  * handle heavier motion/pose detection on the Pi’s CPU
  * expose high-level events (`wave_left`, `user_near`, etc.) via WebSocket
* This is *not* required for the main design, but can be added later if performance demands it.

---

## Repository Layout (proposed)

```text
abyssarium/
  README.md

  apps/
    web/               # Web-first app (main focus)
      src/
        main.ts        # entrypoint
        app/
          classes/
            Scene.ts
            Creature.ts
            UserMedia.ts
          utils/
            helpers.ts
      public/
        index.html
        icons/
      vite.config.ts
      tsconfig.json

  assets/
    models/            # .glb/.gltf creatures
    textures/
    presets/           # JSON configs for different "biomes"

  services/         # Future/fallback 
    sensors/        # Python sensor + event service
      main.py
      requirements.txt
      abyssarium/   # modules for camera, audio, ToF, etc.

  pi/
    scripts/
      start-kiosk.sh   # Chromium kiosk launcher
    systemd/
      abyssarium-kiosk.service  # systemd unit for kiosk mode
```

---

## Web App – Getting Started (Desktop)

You can develop/test everything on your normal machine first.

### Prerequisites

* **Node.js** ≥ 18
* **npm** or **pnpm** (examples use npm)

### 1. Install frontend dependencies

```bash
git clone https://github.com/<you>/abyssarium.git
cd abyssarium/apps/web

npm install
```

### 2. Run in dev mode

```bash
npm run dev
```

Then open the printed URL (usually `http://localhost:5173`) in your browser.

You should eventually see:

* a basic Abyssarium scene (background + placeholder creature),
* camera/mic permission prompts once input is wired in.

---

## Building for Production

From `apps/web`:

```bash
npm run build
```

This produces a static bundle in:

```text
apps/web/dist/
```

You can:

* serve it from any static host (Netlify, GitHub Pages, nginx, …), or
* load it locally on the Pi via `file://` or a tiny local HTTP server.

---

## Raspberry Pi 5 Setup (Web-First)

### 1. Base setup

1. Flash **Raspberry Pi OS** to a microSD card.

2. Boot the Pi and run:

   ```bash
   sudo apt update && sudo apt full-upgrade -y
   ```

3. Install dependencies:

   ```bash
   # Chromium for kiosk
   sudo apt install -y chromium-browser

   # Node.js/npm if you want to build on the Pi
   sudo apt install -y nodejs npm
   ```

(You can also build on your dev machine and just copy `apps/web/dist` to the Pi.)

### 2. Deploy app to the Pi

Option A – build on your dev machine and copy:

```bash
# On your dev machine
npm run build

# Then rsync or scp apps/web/dist to the Pi, e.g.:
scp -r dist pi@raspberrypi:/home/pi/abyssarium/apps/web/dist
```

Option B – build directly on the Pi:

```bash
cd /home/pi/abyssarium/apps/web
npm install
npm run build
```

### 3. Kiosk script

Create `pi/scripts/start-kiosk.sh`:

```bash
#!/usr/bin/env bash

URL="file:///home/pi/abyssarium/apps/web/dist/index.html"

# Optional: wait for X session if using a desktop environment
sleep 5

chromium-browser \
  --kiosk \
  --incognito \
  --noerrdialogs \
  --disable-infobars \
  --check-for-update-interval=31536000 \
  "$URL"
```

Make it executable:

```bash
chmod +x /home/pi/abyssarium/pi/scripts/start-kiosk.sh
```

### 4. systemd unit for kiosk

Create `/etc/systemd/system/abyssarium-kiosk.service`:

```ini
[Unit]
Description=Abyssarium kiosk browser
After=graphical.target

[Service]
Environment=DISPLAY=:0
User=pi
ExecStart=/home/pi/abyssarium/pi/scripts/start-kiosk.sh
Restart=always

[Install]
WantedBy=graphical.target
```

Enable it:

```bash
sudo systemctl enable abyssarium-kiosk.service
```

On next boot, the Pi should launch Chromium in kiosk mode directly into Abyssarium.

---

## Input & Interaction (Web-First Design)

All interaction is driven by browser APIs:

### Camera (motion / simple gestures)

* Use `getUserMedia` to access webcam.
* Draw frames to an offscreen `<canvas>` at **low resolution**.
* Analyze frames in TS:

  * frame differencing,
  * per-region motion energy,
  * simple heuristics like “repeated right-side motion = wave”.

The result is normalized into a small event stream, e.g.:

```ts
type GestureEvent =
  | { type: 'wave'; side: 'left' | 'right' }
  | { type: 'presence'; level: number }   // 0–1
```

These events are fed into the state machine that controls creature behavior.

### Microphone (audio mood)

* Use `getUserMedia` (audio only) + Web Audio API.
* Compute:

  * overall loudness,
  * maybe basic low/mid/high band levels.
* Map to:

  * movement speed,
  * color/intensity of the environment,
  * “startled” reactions on spikes.

---

## Optional: Python / OpenCV Helper (Future Path)

If, at some point, browser-based gesture/pose detection proves too heavy or limiting on the Pi:

* You can add a **Python helper service** in `experimental/python-helper/` that:

  * handles webcam capture via OpenCV,
  * runs motion / gesture / pose detection,
  * exposes **high-level events** over WebSocket, e.g.:

    ```json
    { "event": "wave", "side": "right" }
    { "event": "user_near", "value": 0.8 }
    ```

* The web app then:

  * detects the presence of that WebSocket,
  * prefers its events when available,
  * falls back to pure browser-based detection otherwise.

This keeps the **core of Abyssarium web-first and hostable** (no backend required), while leaving a door open for more advanced/efficient processing on the Pi when and if you decide to go there.

---

## Roadmap (High-Level)

* [x] Minimal Three.js scene + placeholder creature
* [ ] Camera-based motion detection (web-only)
* [ ] Audio-reactive mood via Web Audio
* [ ] Creature behavior state machine (idle / curious / playful / startled)
* [ ] Preset “biomes” (Abyssarium, Void, etc.)
* [ ] Pi 5 kiosk setup docs polished
* [ ] (Optional) Python/OpenCV helper for heavier detection

---

> This README reflects the **web-first design**: everything runs in the browser by default. Native helpers (Python, GPIO, etc.) are considered **optional extensions**, not requirements.