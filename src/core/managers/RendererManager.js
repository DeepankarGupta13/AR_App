/**
 * RendererManager
 * ───────────────
 * Single owner of the THREE.WebGLRenderer instance.
 * Responsibilities:
 *  - Create & configure the renderer (pixel ratio, tone mapping, shadows)
 *  - Handle canvas resize via ResizeObserver (HiDPI-safe)
 *  - Expose renderer.info for GPU stats
 *  - dispose() clears the WebGL context
 */

import * as THREE from 'three'

export class RendererManager {
  /** @type {THREE.WebGLRenderer} */
  renderer = null

  /** @type {ResizeObserver} */
  _ro = null

  /** @type {Function[]} */
  _resizeCallbacks = []

  /**
   * @param {HTMLCanvasElement} canvas
   */
  init(canvas) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    })

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)

    // Shadows
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap

    // Color & tone
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.15

    // Responsive resize
    this._ro = new ResizeObserver(() => this._onResize())
    this._ro.observe(canvas)

    return this
  }

  /** Register a callback to run on every resize (e.g. CameraManager.onResize) */
  onResize(cb) {
    this._resizeCallbacks.push(cb)
    return this
  }

  _onResize() {
    const canvas = this.renderer.domElement
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (!w || !h) return

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(w, h, false)
    this._resizeCallbacks.forEach(cb => cb(w, h))
  }

  /** Returns a snapshot of renderer.info.memory */
  getMemoryInfo() {
    return { ...this.renderer.info.memory }
  }

  /** Returns a snapshot of renderer.info.render */
  getRenderInfo() {
    return { ...this.renderer.info.render }
  }

  /**
   * Full WebGL context teardown.
   * After this call renderer.info.memory.{geometries,textures} === 0.
   */
  dispose() {
    this._ro?.disconnect()
    this.renderer?.dispose()
    this.renderer?.forceContextLoss()
    this.renderer = null
  }
}

export default new RendererManager()
