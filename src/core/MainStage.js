/**
 * MainApp
 * ───────
 * Top-level orchestrator. Wires all managers together and owns the
 * application lifecycle (init → loop → dispose).
 *
 * Dependency graph:
 *
 *   RendererManager ──┐
 *   CameraManager   ──┤
 *   SceneManager    ──┼──► MainApp ──► LoopManager (RAF)
 *   AssetManager    ──┤
 *   NodeManager     ──┤
 *   PostProcessing  ──┤
 *   XRManager       ──┘
 *
 * Each manager has a single responsibility and exposes:
 *   init()    – set up resources
 *   update()  – called each frame
 *   dispose() – release GPU memory
 */

import rendererMgr  from './managers/RendererManager.js'
import cameraMgr    from './managers/CameraManager.js'
import sceneMgr     from './managers/SceneManager.js'
import assetMgr     from './managers/AssetManager.js'
import nodeMgr      from './managers/NodeManager.js'
import postMgr      from './managers/PostProcessingManager.js'
import xrMgr        from './managers/XRManager.js'
import loopMgr      from './managers/LoopManager.js'

export class MainApp {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ onStats: Function }} callbacks
   */
  init(canvas, { onStats } = {}) {
    // 1. Renderer — must come first (owns the GL context)
    rendererMgr.init(canvas)

    // 2. Camera — needs canvas for aspect ratio & input listeners
    cameraMgr.init(canvas)

    // 3. Register camera resize with renderer
    rendererMgr.onResize((w, h) => {
      cameraMgr.onResize(w, h)
      postMgr.setSize(w, h)
    })

    // 4. Scene — lights + ground
    sceneMgr.init()

    // 5. Primary asset mesh (custom ShaderMaterial)
    assetMgr.init(sceneMgr.scene)

    // 6. Node field (InstancedMesh + DataTexture)
    nodeMgr.init(sceneMgr.scene)

    // 7. Post-processing passes
    postMgr.init(rendererMgr.renderer, sceneMgr.scene, cameraMgr.camera)

    // 8. XR (AR mode)
    xrMgr.init(
      rendererMgr.renderer,
      sceneMgr.scene,
      assetMgr.mesh,
      () => { /* AR session ended — emit via onStats or Vue event bus */ }
    )

    // 9. Start RAF loop
    loopMgr.start((dt, elapsed) => this._frame(dt, elapsed, onStats))

    return this
  }

  // ── Per-frame update ───────────────────────────────────────────────────────

  _frame(dt, elapsed, onStats) {
    // Update all managers
    cameraMgr.update()
    sceneMgr.update(elapsed)
    assetMgr.update(elapsed)
    nodeMgr.update(elapsed, false)
    postMgr.update(elapsed)

    // XR frame (noop when not in AR session)
    if (xrMgr.isActive) {
      const frame = rendererMgr.renderer.xr.getFrame()
      xrMgr.updateFrame(frame)
    }

    // Reset render info so stats reflect THIS frame only
    rendererMgr.renderer.info.reset()

    // Render through EffectComposer
    postMgr.composer.render()

    // Emit stats to Vue UI
    onStats?.({
      render: rendererMgr.getRenderInfo(),
      memory: rendererMgr.getMemoryInfo(),
    })
  }

  // ── Public controls (called from Vue components) ───────────────────────────

  swapAsset(type)          { assetMgr.swapGeometry(type) }
  setShaderMode(modeInt)   { assetMgr.setShaderMode(modeInt) }
  setNodeAnimate(on)       { nodeMgr.setAnimating(on) }
  setChromaticAb(on)       { postMgr.setChromaticEnabled(on) }
  setScanlines(on)         { postMgr.setScanlineEnabled(on) }

  async startAR()  { return xrMgr.startAR() }
  async endAR()    { return xrMgr.endAR() }
  async arSupported() { return xrMgr.isSupported() }
  get   arActive()    { return xrMgr.isActive }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  dispose() {
    loopMgr.stop()
    xrMgr.dispose()
    nodeMgr.dispose()
    assetMgr.dispose()
    sceneMgr.dispose()
    postMgr.dispose()
    rendererMgr.dispose()

    // Verify: renderer.info.memory.{geometries,textures} === 0
    console.log('[Ctruh] GPU memory after dispose:', rendererMgr.getMemoryInfo?.() ?? 'renderer released')
  }
}

export default new MainApp()
