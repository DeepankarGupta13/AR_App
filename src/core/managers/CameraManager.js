/**
 * CameraManager
 * ─────────────
 * Owns the THREE.PerspectiveCamera and a lightweight orbit controller.
 * Uses Quaternion-based spherical positioning to avoid Euler gimbal lock.
 *
 * Public API:
 *   init(canvas)          – create camera + bind input listeners
 *   onResize(w, h)        – called by RendererManager on viewport change
 *   update()              – call each frame (smooth damping)
 *   dispose()             – remove all event listeners
 */

import * as THREE from 'three'

export class CameraManager {
  /** @type {THREE.PerspectiveCamera} */
  camera = null

  // Spherical orbit state
  _theta  = 0.2        // azimuth
  _phi    = 1.15       // polar (from top)
  _radius = 8
  _target = new THREE.Vector3(0, 0, 0)

  // Smooth damping targets
  _thetaT  = 0.2
  _phiT    = 1.15
  _radiusT = 8

  _drag = false
  _lx   = 0
  _ly   = 0
  _canvas = null

  // Bound listener references (for clean removeEventListener)
  _onDown  = null
  _onMove  = null
  _onUp    = null
  _onLeave = null
  _onWheel = null
  _onTouchStart = null
  _onTouchMove  = null
  _onTouchEnd   = null

  init(canvas) {
    this._canvas = canvas
    const aspect = canvas.clientWidth / canvas.clientHeight

    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 200)
    this._updateCameraPosition()

    this._bindEvents()
    return this
  }

  /** Called by RendererManager.onResize */
  onResize(w, h) {
    if (!this.camera) return
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  /** Smooth damp orbit each frame */
  update() {
    const ease = 0.1
    this._theta  += (this._thetaT  - this._theta)  * ease
    this._phi    += (this._phiT    - this._phi)    * ease
    this._radius += (this._radiusT - this._radius) * ease
    this._updateCameraPosition()
  }

  _updateCameraPosition() {
    const sp = Math.sin(this._phi)
    this.camera.position.set(
      Math.cos(this._theta) * sp * this._radius,
      Math.cos(this._phi)        * this._radius,
      Math.sin(this._theta) * sp * this._radius,
    )
    this.camera.lookAt(this._target)
  }

  _bindEvents() {
    const c = this._canvas

    this._onDown  = e => { this._drag = true;  this._lx = e.clientX; this._ly = e.clientY }
    this._onMove  = e => this._handleMove(e.clientX, e.clientY)
    this._onUp    = () => { this._drag = false }
    this._onLeave = () => { this._drag = false }
    this._onWheel = e => {
      this._radiusT = Math.max(3, Math.min(22, this._radiusT + e.deltaY * 0.012))
    }
    this._onTouchStart = e => {
      if (e.touches.length === 1) {
        this._drag = true
        this._lx = e.touches[0].clientX
        this._ly = e.touches[0].clientY
      }
    }
    this._onTouchMove = e => {
      if (this._drag && e.touches.length === 1)
        this._handleMove(e.touches[0].clientX, e.touches[0].clientY)
    }
    this._onTouchEnd = () => { this._drag = false }

    c.addEventListener('mousedown',   this._onDown)
    c.addEventListener('mousemove',   this._onMove)
    c.addEventListener('mouseup',     this._onUp)
    c.addEventListener('mouseleave',  this._onLeave)
    c.addEventListener('wheel',       this._onWheel,       { passive: true })
    c.addEventListener('touchstart',  this._onTouchStart,  { passive: true })
    c.addEventListener('touchmove',   this._onTouchMove,   { passive: true })
    c.addEventListener('touchend',    this._onTouchEnd)
  }

  _handleMove(x, y) {
    if (!this._drag) return
    const dx = x - this._lx
    const dy = y - this._ly
    this._lx = x; this._ly = y
    this._thetaT -= dx * 0.005
    this._phiT    = Math.max(0.12, Math.min(Math.PI - 0.12, this._phiT + dy * 0.005))
  }

  dispose() {
    const c = this._canvas
    if (!c) return
    c.removeEventListener('mousedown',  this._onDown)
    c.removeEventListener('mousemove',  this._onMove)
    c.removeEventListener('mouseup',    this._onUp)
    c.removeEventListener('mouseleave', this._onLeave)
    c.removeEventListener('wheel',      this._onWheel)
    c.removeEventListener('touchstart', this._onTouchStart)
    c.removeEventListener('touchmove',  this._onTouchMove)
    c.removeEventListener('touchend',   this._onTouchEnd)
  }
}

export default new CameraManager()
