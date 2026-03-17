# Ctruh — High-Fidelity Asset Configurator Engine

> SDE 3 XR Engineer Technical Assignment  
> A performant, modular 3D viewer built with Vue 3 + Three.js + raw GLSL shaders

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Features](#features)
4. [Prerequisites](#prerequisites)
5. [Running Locally](#running-locally)
6. [Project Structure](#project-structure)
7. [Architecture — Manager Pattern](#architecture--manager-pattern)
8. [Core Concepts Explained](#core-concepts-explained)
   - [Custom Shaders (Raw GLSL)](#1-custom-shaders-raw-glsl)
   - [Tri-Planar Mapping](#2-tri-planar-mapping)
   - [Fresnel Effect (Schlick Approximation)](#3-fresnel-effect-schlick-approximation)
   - [MatCap Reflection](#4-matcap-reflection)
   - [InstancedMesh + DataTexture](#5-instancedmesh--datatexture)
   - [Memory Management & dispose()](#6-memory-management--dispose)
   - [Post-Processing Pipeline](#7-post-processing-pipeline)
   - [WebXR & AR Mode](#8-webxr--ar-mode)
9. [UI Controls](#ui-controls)
10. [AR Support Matrix](#ar-support-matrix)
11. [Performance Notes](#performance-notes)
12. [Production Build & Deployment](#production-build--deployment)

---

## Overview

This project is a high-performance 3D asset configurator that renders a complex scene using:

- A **fully custom GLSL shader** on the primary mesh (no `MeshStandardMaterial`)
- **1,024 instanced data nodes** rendered in a single GPU draw call
- **DataTexture-driven** per-node colour and scale (the stretch goal)
- **Two custom post-processing passes** — chromatic aberration and scanlines
- **WebXR AR mode** with hit-test surface detection on supported Android devices, and a click-to-place desktop fallback everywhere else

---

## Tech Stack

| Technology | Version | Role |
|---|---|---|
| **Vue 3** | ^3.4 | Reactive UI layer, component system, composables |
| **Three.js** | ^0.165 | WebGL scene graph, renderer, geometry, materials |
| **Vite** | ^5.2 | Dev server, HMR, production bundler |
| **Raw GLSL** | WebGL 1 / GLSL 100 | Custom vertex + fragment shaders |
| **WebXR Device API** | W3C spec | Immersive AR sessions, hit-test, XRFrame |
| **Three.js EffectComposer** | (bundled) | Post-processing pipeline |
| **Canvas 2D API** | browser built-in | Procedural texture generation |

No TypeScript, no Pinia, no external UI library — intentionally lean.

---

## Features

| Feature | Detail |
|---|---|
| Custom ShaderMaterial | Tri-planar mapping, Fresnel rim, MatCap — switchable at runtime |
| 1024 InstancedMesh nodes | Fibonacci sphere distribution, single draw call |
| 32×32 DataTexture | Drives per-node hue / saturation / size / phase — no per-instance uniforms |
| Geometry hot-swap | Sphere ↔ Torus ↔ TorusKnot with zero VRAM leak |
| Chromatic aberration pass | Custom ShaderPass — radial RGB channel split |
| Scanline pass | Custom ShaderPass — sin-wave bands + vignette |
| Quaternion rotation | Gimbal-lock-free mesh animation on every frame |
| WebXR AR | Hit-test surface detection on Android Chrome + ARCore |
| Desktop AR fallback | Click-to-place in 3D space, works on Windows / macOS |
| HiDPI support | Pixel ratio capped at 2× via ResizeObserver |
| Full GPU disposal | `renderer.info.memory → {0, 0, 0}` after dispose() |
| Live stats HUD | FPS, draw calls, triangles, GPU memory — updated every frame |

---

## Prerequisites

Before running the project, make sure you have:

- **Node.js** v18 or higher — [download here](https://nodejs.org)
- **npm** v9+ (bundled with Node.js)
- A modern browser — Chrome 90+, Firefox 90+, or Edge 90+

Check your versions:

```bash
node --version   # should be v18+
npm --version    # should be v9+
```

---

## Running Locally

### 1. Clone or unzip the project

```bash
# If cloning from git
git clone <your-repo-url>
cd ctruh-configurator

# If you have the zip file
unzip ctruh-vue.zip
cd ctruh-vue
```

### 2. Install dependencies

```bash
npm install
```

This installs Three.js, Vue 3, Vite, and the Vue Vite plugin. No other dependencies needed.

### 3. Start the development server

```bash
npm run dev
```

Open your browser at **http://localhost:5173**

The dev server has Hot Module Replacement (HMR) — changes to `.vue` files and `.js` files reload instantly without losing state.

### 4. Other commands

```bash
# Production build (output → dist/)
npm run build

# Preview the production build locally
npm run preview

# The preview server runs at http://localhost:4173
# Use this to test the exact production bundle before deploying
```

---

## Project Structure

```
ctruh-vue/
│
├── index.html                    # HTML entry point — mounts #app
├── package.json                  # Dependencies and npm scripts
├── vite.config.js                # Vite config — @ alias, base path
│
└── src/
    │
    ├── main.js                   # Creates Vue app, mounts to #app
    ├── App.vue                   # Root component — owns canvas ref + wires events
    ├── MainApp.js                # Engine orchestrator — init / frame loop / dispose
    │
    ├── managers/                 # One class = one responsibility
    │   ├── RendererManager.js    # THREE.WebGLRenderer lifecycle
    │   ├── CameraManager.js      # PerspectiveCamera + orbit input
    │   ├── SceneManager.js       # Scene graph, lights, fog, ground
    │   ├── AssetManager.js       # Primary 3D mesh + ShaderMaterial
    │   ├── NodeManager.js        # 1024 nodes (InstancedMesh + DataTexture)
    │   ├── PostProcessingManager.js  # EffectComposer + 2 custom passes
    │   ├── XRManager.js          # WebXR AR session + desktop fallback
    │   └── LoopManager.js        # requestAnimationFrame loop
    │
    ├── shaders/
    │   └── triplanar.glsl.js     # Raw GLSL — vertex + fragment shader strings
    │
    ├── composables/
    │   └── useEngine.js          # Vue 3 bridge: reactive state ↔ imperative engine
    │
    ├── components/
    │   ├── HUD.vue               # Full screen overlay — assembles all panels
    │   ├── StatsPanel.vue        # FPS / draw calls / triangle count
    │   ├── MemoryPanel.vue       # renderer.info.memory live readout
    │   ├── ControlPanel.vue      # Shader / FX / asset / node controls
    │   ├── ARButton.vue          # AR toggle with mode badge
    │   ├── LoaderScreen.vue      # Animated boot splash screen
    │   └── Toast.vue             # Transient notification banner
    │
    ├── utils/
    │   └── textureUtils.js       # Procedural albedo + matcap texture generators
    │
    └── styles/
        └── global.css            # CSS custom properties, resets
```

---

## Architecture — Manager Pattern

The engine is split into **8 singleton manager classes**, each with a single responsibility. `MainApp.js` acts as the orchestrator — it imports all managers, calls them in dependency order, and runs the frame loop.

```
MainApp.init(canvas)
  │
  ├── RendererManager.init(canvas)     → creates WebGLRenderer
  │     └── registers CameraManager + PostProcessor as resize callbacks
  │
  ├── CameraManager.init(canvas)       → creates PerspectiveCamera, binds mouse/touch
  │
  ├── SceneManager.init()              → creates Scene, adds lights + ground
  │
  ├── AssetManager.init(scene)         → creates primary mesh with ShaderMaterial
  │
  ├── NodeManager.init(scene)          → creates 1024× InstancedMesh + DataTexture
  │
  ├── PostProcessingManager.init(...)  → creates EffectComposer with 2 passes
  │
  ├── XRManager.init(...)              → sets up AR reticle, binds session callbacks
  │
  └── LoopManager.start(onFrame)       → starts RAF loop
        │
        └── each frame:
              CameraManager.update()       smooth orbit damping
              SceneManager.update()        rim light orbit
              AssetManager.update()        shader time + quaternion rotation
              NodeManager.update()         DataTexture animation
              PostProcessingManager.update() scanline time uniform
              composer.render()            render through effect passes
              onStats(renderInfo, memInfo) emit stats to Vue HUD
```

### Why this pattern?

- **Single responsibility** — each manager owns exactly one concern and can be read/tested in isolation
- **No inter-manager imports** — managers never import each other; `MainApp` wires them at init time
- **Clean lifecycle** — every manager implements `init()`, `update()`, `dispose()` — predictable and symmetric
- **Vue stays thin** — `useEngine.js` is the only file that touches both Vue reactivity and the engine; components never import Three.js directly

---

## Core Concepts Explained

### 1. Custom Shaders (Raw GLSL)

The primary mesh uses `THREE.ShaderMaterial` with hand-written GLSL. `MeshStandardMaterial` is not used anywhere — the assignment requires full control over the fragment stage.

The shader is in `src/shaders/triplanar.glsl.js` and exported as two string constants:

```js
export const VERT_SHADER = `...`   // computes world position, world normal, view direction
export const FRAG_SHADER = `...`   // tri-planar + Fresnel + MatCap
```

Three runtime modes are switchable via the `uMode` uniform:

| uMode | Name | What it does |
|---|---|---|
| `0` | Tri-Planar + Fresnel | Texture projected in world space + rim glow |
| `1` | MatCap | Sphere-mapped studio reflection |
| `2` | Tri-Planar + MatCap | Both combined — richest look |

---

### 2. Tri-Planar Mapping

Standard UV mapping requires artists to manually unwrap a mesh. Tri-planar mapping removes this requirement entirely by projecting the texture from **three world-aligned directions** (X, Y, Z axes) and blending them using the surface normal.

```glsl
// Sample the texture from three axis-aligned world planes
vec4 xP = texture2D(uTex, worldPos.yz * scale);   // seen from ±X
vec4 yP = texture2D(uTex, worldPos.xz * scale);   // seen from ±Y
vec4 zP = texture2D(uTex, worldPos.xy * scale);   // seen from ±Z

// Blend weight = absolute normal component raised to a sharpening power
vec3 w = pow(abs(N), vec3(4.0));
w /= w.x + w.y + w.z;   // normalise so weights sum to 1

// Final colour is a weighted sum of the three projections
return xP * w.x + yP * w.y + zP * w.z;
```

The exponent `4.0` controls how sharply the projections transition at seams — higher = crisper blend, lower = softer.

---

### 3. Fresnel Effect (Schlick Approximation)

The Fresnel effect describes how surfaces become more reflective at **grazing angles** — think of a glass window looking straight on (clear) vs at a steep angle (mirror-like). It's a core part of physically-based rendering.

We use the Schlick approximation:

```
F(θ) = F0 + (1 − F0)(1 − cosθ)^n
```

- `F0 = 0.04` — reflectance at normal incidence for most dielectric materials (plastic, glass, skin)
- `cosθ = dot(viewDir, normal)` — angle between camera and surface
- `n = uFresExp` — exponent controlling the falloff (3–6 is typical)

```glsl
float cosT = max(dot(V, N), 0.0);
float fresnel = 0.04 + 0.96 * pow(1.0 - cosT, uFresExp);
```

The result drives a colour mix between cyan (`#00e5ff`) and magenta (`#ff3cac`), added as a rim highlight around the silhouette of the object.

---

### 4. MatCap Reflection

MatCap (Material Capture) is a technique that gives a convincing sphere-mapped reflection without needing a real environment map or IBL. You pre-render a lit sphere and use it as a lookup table.

The lookup UV is computed by projecting the view-space surface normal onto the unit sphere using a **stereographic projection**:

```glsl
// Transform normal to view space
vec3 vn = normalize(mat3(viewMatrix) * N);

// Compute reflected view direction
vec3 r = reflect(-V, vn);

// Stereographic projection to 2D
float m = 2.0 * sqrt(r.x*r.x + r.y*r.y + (r.z + 1.0)*(r.z + 1.0));
vec2 uv = vec2(r.x / m + 0.5, r.y / m + 0.5);
```

The result is a 2D UV that maps the view-space hemisphere to the unit disc, giving each surface point a consistent "reflection" regardless of scene lighting.

---

### 5. InstancedMesh + DataTexture

**The problem:** rendering 1,024 individual meshes = 1,024 draw calls. Each draw call has CPU overhead (state validation, buffer binding, uniform upload). At 60fps this is 61,440 draw calls per second — a serious bottleneck.

**InstancedMesh solution:** `THREE.InstancedMesh` uploads all 1,024 instance matrices in a single buffer, letting the GPU batch-render them in **one draw call**.

**DataTexture (stretch goal):** Per-node colour and scale could be stored as 1,024 individual uniforms — but that's 1,024 `gl.uniform*` API calls per frame. Instead, we pack all data into a **32×32 RGBA32F texture** (32 × 32 = 1,024 texels) and upload it in a single `gl.texSubImage2D` call.

```
DataTexture layout (one texel per node):
  R = hue (0..1)
  G = saturation (0..1)
  B = size multiplier
  A = phase offset (for animation)
```

The vertex shader reads per-node data by converting `gl_InstanceID` to a 2D texel coordinate:

```glsl
float col = mod(float(gl_InstanceID), uTSz);       // column in 32×32 grid
float row = floor(float(gl_InstanceID) / uTSz);    // row in 32×32 grid
vec4  d   = texture2D(uData, (vec2(col, row) + 0.5) / uTSz);
```

---

### 6. Memory Management & dispose()

**Why it matters:** WebGL contexts have a finite VRAM budget. Every geometry, material, and texture you create allocates GPU memory. If you swap assets without disposing the old ones, memory grows unbounded — a critical bug in production configurators.

The `dispose()` contract is enforced at every level:

**`SceneManager.dispose()`** — traverses the entire scene graph:
```js
scene.traverse(obj => {
  if (obj.isMesh || obj.isInstancedMesh) {
    obj.geometry?.dispose()           // frees GPU vertex buffer
    obj.material?.dispose()           // frees GLSL program
    // also disposes all texture slots on the material
  }
})
```

**`RendererManager.dispose()`** — releases the WebGL context itself:
```js
renderer.dispose()          // frees internal Three.js resources
renderer.forceContextLoss() // calls WEBGL_lose_context.loseContext()
```

**Verification** — after full dispose, open the browser console and check:
```
renderer.info.memory → { geometries: 0, textures: 0, programs: 0 }
```

**Geometry hot-swap** — when switching between Sphere / Torus / Knot, only the `BufferGeometry` is disposed and replaced. The `ShaderMaterial` (which contains an expensive compiled GLSL program) is reused to avoid a re-compilation stall.

---

### 7. Post-Processing Pipeline

The post-processing pipeline uses Three.js `EffectComposer` with three sequential passes:

```
Scene → RenderPass → ChromaticAberrationPass → ScanlinePass → Screen
```

Both effect passes are built from scratch using `ShaderPass` with raw GLSL — no pre-built effects library is used.

**Chromatic Aberration** — simulates camera lens colour fringing:
```glsl
vec2 dir = (vUv - 0.5) * uStr;   // direction from screen centre
float r = texture2D(tDiffuse, vUv + dir).r;   // R channel shifted outward
float g = texture2D(tDiffuse, vUv       ).g;  // G channel unchanged
float b = texture2D(tDiffuse, vUv - dir ).b;  // B channel shifted inward
```

**Scanlines** — adds horizontal CRT-style bands and vignette:
```glsl
float line = 1.0 - 0.16 * (sin(vUv.y * 420.0 + uTime * 2.0) * 0.5 + 0.5);
float vig  = 1.0 - dot(vUv - 0.5, vUv - 0.5) * 0.85;  // squared-distance darkening
gl_FragColor = vec4(col.rgb * line * vig, 1.0);
```

---

### 8. WebXR & AR Mode

The WebXR Device API is the W3C standard for immersive experiences in the browser. Our implementation has **three tiers**:

**Tier 1 — Full AR with hit-test (Android Chrome + ARCore)**
```
Session: immersive-ar
Features: hit-test
Reference space: local-floor (cascade: local → unbounded → viewer)
```
The device's depth sensors detect real-world surfaces. A ring reticle follows detected planes. Tap to place the 3D object on the surface.

**Tier 2 — AR without hit-test (limited Android devices)**
Some devices support `immersive-ar` but not `hit-test`. The reticle is placed 1.5m in front of the camera using `getViewerPose()`. Tap to place.

**Tier 3 — Desktop fallback (Windows, macOS, iOS)**
`immersive-ar` is a hardware-level feature — it requires camera passthrough and depth tracking from the OS. Windows and iOS do not expose this API. Our fallback activates a click handler on the canvas — clicking places the object 4 units in front of the camera in 3D space.

**Reference space cascade** — the most common source of the `requestReferenceSpace` error:
```js
// Try in order: first one that works wins
const REF_SPACE_PRIORITY = ['local-floor', 'local', 'unbounded', 'viewer']
```
Most ARCore Android devices only expose `local-floor`. The old code hard-coded `local` as a required feature, which caused an immediate crash on those devices.

---

## UI Controls

| Control | Description |
|---|---|
| **Shader Mode** dropdown | Switch between Tri-Planar+Fresnel, MatCap, or Combined |
| **Chromatic AB** button | Toggle chromatic aberration post-processing pass |
| **Scanlines** button | Toggle scanline + vignette post-processing pass |
| **Sphere / Torus / Knot** buttons | Hot-swap geometry — old GPU buffer disposed immediately |
| **Animate** button | Enable DataTexture per-frame hue drift and size pulse |
| **AR Mode** button | Start WebXR AR (Android) or click-to-place fallback (desktop) |
| **Drag canvas** | Orbit camera (mouse or touch) |
| **Scroll / pinch** | Zoom in / out |

The **GPU Memory** panel in the bottom-right updates every frame showing `geometries`, `textures`, and `programs` from `renderer.info.memory`. After a geometry swap you can watch the geometry count tick down to reflect the freed buffer.

---

## AR Support Matrix

| Platform | immersive-ar | hit-test | Behaviour |
|---|---|---|---|
| **Android + Chrome 81+ + ARCore** | ✅ | ✅ | Full surface detection, tap to place |
| **Android + Chrome (no ARCore)** | ❌ | ❌ | Desktop fallback (click-to-place) |
| **Windows (any browser)** | ❌ | ❌ | Desktop fallback (click-to-place) |
| **macOS (any browser)** | ❌ | ❌ | Desktop fallback (click-to-place) |
| **iOS / iPadOS** | ❌ | ❌ | Desktop fallback (click-to-place) |
| **Meta Quest Browser** | ❌ | ❌ | immersive-vr only; no passthrough AR via WebXR |

**To test AR on desktop during development**, install the [WebXR API Emulator](https://chrome.google.com/webstore/detail/webxr-api-emulator/mjddjgeghkdijejnciaefnkjmkafnnje) Chrome extension. It adds a fake AR device you can control from DevTools.

---

## Performance Notes

**Why 1 draw call for 1,024 nodes matters:**
Each draw call has a fixed CPU cost (~0.1–0.5ms on modern hardware) regardless of triangle count. 1,024 individual meshes = potentially 1,024 × 0.5ms = 512ms of CPU overhead per frame — impossible at 60fps. InstancedMesh collapses this to 1 draw call.

**Why DataTexture beats per-instance uniforms:**
Setting `gl.uniform*` 1,024 times per frame creates 1,024 synchronisation points between the CPU and GPU command queue. A single `gl.texSubImage2D` for the 32×32 texture is one upload — the GPU reads it in parallel across all 1,024 vertex shader invocations.

**Why pixel ratio is capped at 2×:**
A 3× device pixel ratio means 9× the fragment shader invocations vs a 1× display. The visual difference between 2× and 3× is nearly imperceptible at normal viewing distance, but the GPU cost is significant. `Math.min(devicePixelRatio, 2)` is standard practice.

**Shader branching:**
The `uMode` uniform is constant for all fragments in a draw call. Even though the shader has `if/else` branches, all fragments take the same path — no GPU warp divergence.

---

## Production Build & Deployment

```bash
npm run build
```

Output goes to `dist/`. The folder is self-contained — serve it with any static file host.

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

### Deploy to Netlify

Drag and drop the `dist/` folder to [app.netlify.com/drop](https://app.netlify.com/drop), or:

```bash
npm install -g netlify-cli
netlify deploy --prod --dir dist
```

### Deploy to GitHub Pages

```bash
# In vite.config.js, set base to your repo name:
# base: '/your-repo-name/'

npm run build
npx gh-pages -d dist
```

> **Important for AR:** WebXR requires HTTPS. All three deployment options above serve over HTTPS automatically. `localhost` (from `npm run dev`) is also considered secure by browsers, so AR testing works locally too.

---

## Acknowledgements

Built for the Ctruh SDE 3 XR Engineer technical assignment.  
Three.js by [mrdoob](https://github.com/mrdoob/three.js) and contributors.  
WebXR spec by the [W3C Immersive Web Working Group](https://www.w3.org/immersive-web/).
