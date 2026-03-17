/**
 * AssetManager
 * ────────────
 * Creates and manages the primary 3D mesh with a fully custom ShaderMaterial.
 *
 * Responsibilities:
 *  - Build the initial mesh with tri-planar / Fresnel / MatCap shader
 *  - Hot-swap geometry (sphere ↔ torus ↔ knot) with full GPU disposal of the old geo
 *  - Switch shader modes at runtime
 *  - Animate mesh rotation (Quaternion-based, no Euler gimbal lock)
 *  - dispose() clears all GPU resources
 *
 * Geometry rationale:
 *   BufferGeometry (used internally by all Three.js r125+ primitives) stores
 *   vertex data in typed arrays (Float32Array) that map directly to GPU VBOs,
 *   allowing zero-copy uploads. We favour high segment counts on the primary
 *   mesh so the custom fragment shader receives smooth interpolated normals.
 */

import * as THREE from 'three'
import { VERT_SHADER, FRAG_SHADER } from '../shaders/triplanar.glsl.js'
import { makeAlbedoTexture, makeMatcapTexture } from '../utils/textureUtils.js'

export const ASSET_TYPES   = ['sphere', 'torus', 'knot']
export const SHADER_MODES  = {
  triplanar:        0,
  matcap:           1,
  triplanar_matcap: 2,
}

export class AssetManager {
  /** @type {THREE.Mesh} */
  mesh = null

  /** @type {THREE.ShaderMaterial} */
  material = null

  /** @type {THREE.Scene} */
  _scene = null

  /** @type {THREE.Texture} */
  _albedoTex = null
  _matcapTex = null

  /**
   * @param {THREE.Scene} scene
   */
  init(scene) {
    this._scene    = scene
    this._albedoTex = makeAlbedoTexture(256)
    this._matcapTex = makeMatcapTexture(256)

    this._buildMaterial()
    this.load('sphere')
    return this
  }

  _buildMaterial() {
    this.material = new THREE.ShaderMaterial({
      vertexShader:   VERT_SHADER,
      fragmentShader: FRAG_SHADER,
      uniforms: {
        uTex:     { value: this._albedoTex },
        uMatcap:  { value: this._matcapTex },
        uScale:   { value: 0.34 },
        uTime:    { value: 0 },
        uMode:    { value: 0 },
        uColor:   { value: new THREE.Color(0.3, 0.6, 0.9) },
        uFresExp: { value: 3.5 },
      },
      side: THREE.FrontSide,
    })
  }

  /**
   * Build (or rebuild) the mesh for a given geometry type.
   * Old geometry is disposed from GPU before the new one is created.
   * @param {'sphere'|'torus'|'knot'} type
   */
  load(type) {
    if (this.mesh) {
      this._scene.remove(this.mesh)
      this.mesh.geometry.dispose()
      this.mesh = null
    }

    const geo = this._makeGeometry(type)
    this.mesh = new THREE.Mesh(geo, this.material)
    this.mesh.castShadow    = true
    this.mesh.receiveShadow = true
    this._scene.add(this.mesh)
    return this.mesh
  }

  /**
   * Swap only the geometry (material is reused).
   * @param {'sphere'|'torus'|'knot'} type
   */
  swapGeometry(type) {
    if (!this.mesh) return
    this.mesh.geometry.dispose()  // ← GPU buffer freed here
    this.mesh.geometry = this._makeGeometry(type)
  }

  /** @param {number} modeInt — 0|1|2 */
  setShaderMode(modeInt) {
    if (this.material) this.material.uniforms.uMode.value = modeInt
  }

  /** @param {number} elapsed — seconds since start */
  update(elapsed) {
    if (this.material) {
      this.material.uniforms.uTime.value = elapsed
    }
    if (this.mesh) {
      // Quaternion rotation — gimbal-lock-free
      this.mesh.quaternion.setFromEuler(
        new THREE.Euler(elapsed * 0.14, elapsed * 0.21, 0)
      )
    }
  }

  /** All geometry types use BufferGeometry (Three.js default since r125). */
  _makeGeometry(type) {
    switch (type) {
      case 'sphere': return new THREE.SphereGeometry(2.2, 128, 64)
      case 'torus':  return new THREE.TorusGeometry(1.8, 0.7, 64, 128)
      case 'knot':   return new THREE.TorusKnotGeometry(1.6, 0.5, 256, 64)
      default:       return new THREE.SphereGeometry(2.2, 128, 64)
    }
  }

  dispose() {
    if (this.mesh) {
      this._scene?.remove(this.mesh)
      this.mesh.geometry?.dispose()
      this.mesh = null
    }
    this.material?.dispose()
    this._albedoTex?.dispose()
    this._matcapTex?.dispose()
    this.material    = null
    this._albedoTex  = null
    this._matcapTex  = null
  }
}

export default new AssetManager()
