/**
 * SceneManager
 * ────────────
 * Owns the THREE.Scene, environment lighting, and ground plane.
 * Responsible for:
 *  - Creating and configuring the scene (fog, background)
 *  - Adding / removing lights
 *  - Animating the rim light orbital position each frame
 *  - dispose() clears every object and releases GPU memory
 *
 * NOTE: SceneManager does NOT own the renderer — that is RendererManager's job.
 */

import * as THREE from 'three'

export class SceneManager {
  /** @type {THREE.Scene} */
  scene = null

  /** @type {THREE.PointLight} */
  _rimLight = null

  init() {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x060810)
    this.scene.fog = new THREE.FogExp2(0x060810, 0.011)

    this._addLights()
    this._addGround()
    return this
  }

  _addLights() {
    // Ambient fill
    this.scene.add(new THREE.AmbientLight(0x1e2540, 2.0))

    // Key light with shadow
    const key = new THREE.DirectionalLight(0x88ccff, 3.5)
    key.position.set(5, 8, 5)
    key.castShadow = true
    key.shadow.mapSize.set(1024, 1024)
    key.shadow.camera.near = 0.5
    key.shadow.camera.far  = 40
    this.scene.add(key)

    // Fill / back light
    const fill = new THREE.DirectionalLight(0xff3cac, 1.4)
    fill.position.set(-4, 2, -3)
    this.scene.add(fill)

    // Animated rim / accent point light
    this._rimLight = new THREE.PointLight(0x00e5ff, 3.2, 22)
    this._rimLight.position.set(0, 4, -5)
    this.scene.add(this._rimLight)
  }

  _addGround() {
    const geo = new THREE.PlaneGeometry(50, 50)
    const mat = new THREE.ShadowMaterial({ opacity: 0.3 })
    const ground = new THREE.Mesh(geo, mat)
    ground.rotation.x  = -Math.PI / 2
    ground.position.y  = -3
    ground.receiveShadow = true
    ground.name = 'ground'
    this.scene.add(ground)
  }

  /** Animate rim light orbit — call each frame */
  update(elapsed) {
    if (this._rimLight) {
      this._rimLight.position.set(
        Math.sin(elapsed * 0.38) * 6,
        4,
        Math.cos(elapsed * 0.38) * 6,
      )
    }
  }

  /**
   * dispose()
   * ─────────
   * Traverses scene graph and disposes all geometries, materials, textures.
   * After this, renderer.info.memory.{geometries,textures} should read 0.
   */
  dispose() {
    if (!this.scene) return

    this.scene.traverse(obj => {
      if (obj.isMesh || obj.isInstancedMesh) {
        obj.geometry?.dispose()
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        mats.forEach(m => {
          if (!m) return
          // Dispose all texture slots
          ;['map','normalMap','roughnessMap','metalnessMap','aoMap',
            'emissiveMap','envMap','alphaMap'].forEach(key => {
            m[key]?.dispose?.()
          })
          // Dispose ShaderMaterial uniform textures
          if (m.uniforms) {
            Object.values(m.uniforms).forEach(u => {
              if (u?.value instanceof THREE.Texture) u.value.dispose()
            })
          }
          m.dispose()
        })
      }
    })

    this.scene.clear()
    this.scene = null
  }
}

export default new SceneManager()
