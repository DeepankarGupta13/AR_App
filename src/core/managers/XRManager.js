/**
 * XRManager
 * ─────────
 * Manages the WebXR Device API for immersive-ar sessions with Hit Testing.
 *
 * Common error fixed:
 *   "Failed to execute requestReferenceSpace — device doesn't support
 *    requested reference space"
 *
 * Root causes & fixes:
 *   1. 'local' was in requiredFeatures — many Android devices only advertise
 *      'local-floor' or 'unbounded'. We now try reference spaces in order:
 *      local-floor → local → unbounded, picking the first one that works.
 *
 *   2. 'hit-test' must be in requiredFeatures for requestHitTestSource()
 *      to succeed — but if the device doesn't support it, we fall back to
 *      a viewer-pose tap-to-place mode automatically.
 *
 *   3. Some devices support AR but not hit-test at all. We fall back to
 *      placing the reticle 1.5m in front of the camera using viewer pose.
 *
 *   4. Sessions can end asynchronously (OS back button). All calls are
 *      guarded with try/catch and null-checks.
 */

import * as THREE from 'three'

// Try in this order — first one that works wins
const REF_SPACE_PRIORITY = ['local-floor', 'local', 'unbounded', 'viewer']

export class XRManager {
  _renderer  = null
  _scene     = null
  _targetObj = null
  _onEndCb   = null

  _session   = null
  _hitSrc    = null
  _refSpace  = null
  _reticle   = null
  _active    = false
  _hitTestAvailable = false

  // ── init ───────────────────────────────────────────────────────────────────

  init(renderer, scene, targetObject, onEnd) {
    this._renderer  = renderer
    this._scene     = scene
    this._targetObj = targetObject
    this._onEndCb   = onEnd

    const ring = new THREE.RingGeometry(0.12, 0.15, 32)
    ring.rotateX(-Math.PI / 2)
    this._reticle = new THREE.Mesh(
      ring,
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide, depthWrite: false })
    )
    this._reticle.visible = false
    this._reticle.matrixAutoUpdate = false
    scene.add(this._reticle)

    return this
  }

  // ── capability check ───────────────────────────────────────────────────────

  async isSupported() {
    if (!('xr' in navigator)) return false
    try {
      return await navigator.xr.isSessionSupported('immersive-ar')
    } catch {
      return false
    }
  }

  // ── session start ──────────────────────────────────────────────────────────

  /**
   * Starts AR with two-stage fallback:
   *   Stage 1 — request with hit-test required
   *   Stage 2 — request without hit-test (viewer-pose placement fallback)
   *
   * @returns {{ hitTestAvailable: boolean }}
   */
  async startAR() {
    if (this._active) return

    let session = null

    // Stage 1: Full hit-test AR
    try {
      session = await navigator.xr.requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['local-floor', 'local', 'unbounded', 'dom-overlay', 'anchors'],
      })
      this._hitTestAvailable = true
      console.log('[XRManager] Session started with hit-test')
    } catch (e1) {
      console.warn('[XRManager] hit-test unavailable, trying basic AR:', e1.message)

      // Stage 2: AR without hit-test
      try {
        session = await navigator.xr.requestSession('immersive-ar', {
          requiredFeatures: [],
          optionalFeatures: ['local-floor', 'local', 'unbounded', 'dom-overlay'],
        })
        this._hitTestAvailable = false
        console.log('[XRManager] Session started without hit-test (viewer-pose mode)')
      } catch (e2) {
        throw new Error(
          'AR could not start on this device.\n' +
          'Checklist:\n' +
          '  • Must be served over HTTPS\n' +
          '  • Requires Chrome 81+ on Android\n' +
          '  • ARCore must be installed (Play Store)\n' +
          '  • Device: ' + navigator.userAgent.match(/Android.*?;/)?.[0] + '\n' +
          '  • Error: ' + e2.message
        )
      }
    }

    // Attach session to Three.js renderer
    this._session = session
    this._renderer.xr.enabled = true
    try {
      await this._renderer.xr.setSession(session)
    } catch (e) {
      await session.end().catch(() => {})
      this._renderer.xr.enabled = false
      throw new Error('Renderer failed to attach XR session: ' + e.message)
    }

    // Resolve best available reference space with cascade
    this._refSpace = await this._resolveReferenceSpace(session)

    // Set up hit-test source if supported
    if (this._hitTestAvailable) {
      try {
        const viewerSpace = await session.requestReferenceSpace('viewer')
        this._hitSrc = await session.requestHitTestSource({ space: viewerSpace })
      } catch (e) {
        console.warn('[XRManager] Hit-test source failed after session start:', e.message)
        this._hitTestAvailable = false
        this._hitSrc = null
      }
    }

    session.addEventListener('select', () => this._onSelect())
    session.addEventListener('end',    () => this._cleanup())
    this._active = true

    return { hitTestAvailable: this._hitTestAvailable }
  }

  // ── per-frame ──────────────────────────────────────────────────────────────

  updateFrame(frame) {
    if (!frame || !this._refSpace) return

    if (this._hitTestAvailable && this._hitSrc) {
      // ── Hit-test mode: reticle follows real-world surfaces ─────────────────
      try {
        const hits = frame.getHitTestResults(this._hitSrc)
        if (hits.length > 0) {
          const pose = hits[0].getPose(this._refSpace)
          if (pose) {
            this._reticle.visible = true
            this._reticle.matrixAutoUpdate = false
            this._reticle.matrix.fromArray(pose.transform.matrix)
          }
        } else {
          this._reticle.visible = false
        }
      } catch {
        this._reticle.visible = false
      }

    } else {
      // ── Viewer-pose fallback: reticle 1.5m in front of camera ─────────────
      try {
        const viewerPose = frame.getViewerPose(this._refSpace)
        if (viewerPose?.views?.length > 0) {
          const { position: p, orientation: o } = viewerPose.views[0].transform
          const quat = new THREE.Quaternion(o.x, o.y, o.z, o.w)
          const fwd  = new THREE.Vector3(0, 0, -1.5).applyQuaternion(quat)

          this._reticle.matrixAutoUpdate = true
          this._reticle.position.set(p.x + fwd.x, p.y + fwd.y - 0.1, p.z + fwd.z)
          this._reticle.rotation.set(-Math.PI / 2, 0, 0)
          this._reticle.visible = true
        }
      } catch {
        this._reticle.visible = false
      }
    }
  }

  async endAR() {
    try {
      await this._session?.end()
    } catch {
      this._cleanup()
    }
  }

  get isActive()   { return this._active }
  get hasHitTest() { return this._hitTestAvailable }

  // ── private ────────────────────────────────────────────────────────────────

  /**
   * Try each reference space type in REF_SPACE_PRIORITY order.
   * Returns the first supported space.
   *
   * Why this order:
   *  'local-floor' — most common on ARCore Android; Y=0 at floor level
   *  'local'       — standard WebXR space; not always available on Android
   *  'unbounded'   — large-scale AR (Hololens, Magic Leap)
   *  'viewer'      — always works; not ideal for world placement but beats crashing
   */
  async _resolveReferenceSpace(session) {
    for (const type of REF_SPACE_PRIORITY) {
      try {
        const space = await session.requestReferenceSpace(type)
        console.log('[XRManager] Reference space resolved:', type)
        return space
      } catch {
        console.warn('[XRManager] Skipping unsupported reference space:', type)
      }
    }
    throw new Error(
      'Device supports immersive-ar but no usable reference space was found. ' +
      'Tried: ' + REF_SPACE_PRIORITY.join(', ')
    )
  }

  _onSelect() {
    if (!this._reticle.visible || !this._targetObj) return

    if (this._reticle.matrixAutoUpdate) {
      // Viewer-pose mode — position is already set directly
      this._targetObj.position.copy(this._reticle.position)
    } else {
      // Hit-test mode — decompose the pose matrix
      const pos  = new THREE.Vector3()
      const quat = new THREE.Quaternion()
      const scl  = new THREE.Vector3()
      this._reticle.matrix.decompose(pos, quat, scl)
      this._targetObj.position.copy(pos)
      this._targetObj.quaternion.copy(quat)
      // Intentionally do NOT copy scale — keep the object's own scale
    }
  }

  _cleanup() {
    try { this._hitSrc?.cancel() } catch { /* already gone */ }
    this._hitSrc              = null
    this._session             = null
    this._refSpace            = null
    this._active              = false
    this._hitTestAvailable    = false
    if (this._reticle) {
      this._reticle.visible         = false
      this._reticle.matrixAutoUpdate = false
    }
    this._renderer.xr.enabled = false
    this._onEndCb?.()
  }

  dispose() {
    if (this._active) {
      this._session?.end().catch(() => {})
    }
    this._reticle?.geometry.dispose()
    this._reticle?.material.dispose()
    this._scene?.remove(this._reticle)
    this._reticle  = null
    this._hitSrc   = null
    this._session  = null
    this._refSpace = null
  }
}

export default new XRManager()
