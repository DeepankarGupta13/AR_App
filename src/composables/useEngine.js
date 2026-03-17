/**
 * src/composables/useEngine.js
 * ─────────────────────────────
 * Vue 3 composable that bridges reactive UI state with the imperative
 * 3D engine (MainApp + all managers).
 *
 * Usage in a component:
 *   const { stats, memory, initEngine, swapAsset, ... } = useEngine()
 */

import { ref, reactive, onUnmounted } from 'vue'
import app from '../core/MainStage'

export function useEngine() {
  // ── Reactive stats (updated each frame via onStats callback) ───────────────
  const fps    = ref(0)
  const drawCalls = ref(0)
  const triangles = ref(0)
  const memory = reactive({ geometries: 0, textures: 0, programs: 0 })

  let _frameCount = 0
  let _fpsAccum   = 0
  let _lastFpsUpdate = performance.now()

  function _onStats({ render, memory: mem }) {
    drawCalls.value = render.calls
    triangles.value = render.triangles

    memory.geometries = mem.geometries
    memory.textures   = mem.textures
    memory.programs   = mem.programs ?? 0

    // FPS: average over 0.5s
    _frameCount++
    const now = performance.now()
    _fpsAccum = (now - _lastFpsUpdate) / 1000
    if (_fpsAccum >= 0.5) {
      fps.value = Math.round(_frameCount / _fpsAccum)
      _frameCount = 0
      _lastFpsUpdate = now
    }
  }

  // ── Init ───────────────────────────────────────────────────────────────────

  function initEngine(canvas) {
    app.init(canvas, { onStats: _onStats })
  }

  // ── Controls ───────────────────────────────────────────────────────────────

  function swapAsset(type)        { app.swapAsset(type) }
  function setShaderMode(mode)    { app.setShaderMode(mode) }
  function setNodeAnimate(on)     { app.setNodeAnimate(on) }
  function setChromaticAb(on)     { app.setChromaticAb(on) }
  function setScanlines(on)       { app.setScanlines(on) }
  async function startAR()        { return app.startAR() }
  async function endAR()          { return app.endAR() }
  async function arSupported()    { return app.arSupported() }

  // ── Cleanup ────────────────────────────────────────────────────────────────

  onUnmounted(() => app.dispose())

  return {
    fps, drawCalls, triangles, memory,
    initEngine,
    swapAsset, setShaderMode,
    setNodeAnimate, setChromaticAb, setScanlines,
    startAR, endAR, arSupported,
  }
}
