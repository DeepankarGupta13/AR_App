/**
 * XRManager
 * ─────────
 * Manages the WebXR Device API for immersive-ar sessions with Hit Testing.
 *
 * Flow:
 *  1. isSupported()  → check XR capability
 *  2. startAR()      → request immersive-ar session + hit-test source
 *  3. updateFrame()  → call each XR frame to update hit-test reticle
 *  4. endAR()        → end session
 *
 * On screen tap ("select" event), places the target object at the
 * hit-test surface position using matrix decomposition.
 */

import * as THREE from 'three'

export class XRManager {
  _renderer   = null
  _scene      = null
  _targetObj  = null
  _onEndCb    = null

  _session    = null
  _hitSrc     = null
  _refSpace   = null
  _reticle    = null
  _active     = false

  /**
   * @param {THREE.WebGLRenderer}  renderer
   * @param {THREE.Scene}          scene
   * @param {THREE.Object3D}       targetObject  – object to place on surface
   * @param {Function}             onEnd         – called when session ends
   */
  init(renderer, scene, targetObject, onEnd) {
    this._renderer  = renderer
    this._scene     = scene
    this._targetObj = targetObject
    this._onEndCb   = onEnd

    // Reticle shown on detected surfaces
    const ring = new THREE.RingGeometry(0.12, 0.15, 32)
    ring.rotateX(-Math.PI / 2)
    this._reticle = new THREE.Mesh(
      ring,
      new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide })
    )
    this._reticle.visible = false
    this._reticle.matrixAutoUpdate = false
    scene.add(this._reticle)

    return this
  }

  async isSupported() {
    if (!('xr' in navigator)) return false
    try {
      return await navigator.xr.isSessionSupported('immersive-ar')
    } catch {
      return false
    }
  }

  async startAR() {
    if (this._active) return

    const session = await navigator.xr.requestSession('immersive-ar', {
      requiredFeatures: ['local', 'hit-test'],
      optionalFeatures: ['dom-overlay'],
    })

    this._session = session
    this._renderer.xr.enabled = true
    await this._renderer.xr.setSession(session)

    this._refSpace = await session.requestReferenceSpace('local')
    const viewer   = await session.requestReferenceSpace('viewer')
    this._hitSrc   = await session.requestHitTestSource({ space: viewer })

    session.addEventListener('select', () => this._onSelect())
    session.addEventListener('end',    () => this._cleanup())

    this._active = true
  }

  async endAR() {
    await this._session?.end()
  }

  /**
   * Call once per XR frame inside the render loop.
   * @param {XRFrame|null} frame
   */
  updateFrame(frame) {
    if (!frame || !this._hitSrc || !this._refSpace) return

    const hits = frame.getHitTestResults(this._hitSrc)
    if (hits.length > 0) {
      const pose = hits[0].getPose(this._refSpace)
      if (pose) {
        this._reticle.visible = true
        this._reticle.matrix.fromArray(pose.transform.matrix)
      }
    } else {
      this._reticle.visible = false
    }
  }

  get isActive() { return this._active }

  _onSelect() {
    if (!this._reticle.visible || !this._targetObj) return
    this._reticle.matrix.decompose(
      this._targetObj.position,
      this._targetObj.quaternion,
      this._targetObj.scale,
    )
  }

  _cleanup() {
    this._hitSrc?.cancel()
    this._hitSrc    = null
    this._session   = null
    this._active    = false
    this._reticle.visible = false
    this._renderer.xr.enabled = false
    this._onEndCb?.()
  }

  dispose() {
    this._reticle?.geometry.dispose()
    this._reticle?.material.dispose()
    this._scene?.remove(this._reticle)
    this._reticle = null
  }
}

export default new XRManager()
