/**
 * PostProcessingManager
 * ──────────────────────
 * Manages the THREE.EffectComposer pipeline with two custom ShaderPass effects:
 *
 *  1. ChromaticAberrationPass – radially splits R/G/B channels from the screen
 *     centre, simulating lens chromatic dispersion.
 *
 *  2. ScanlinePass – adds horizontal scan-line bands (sin-wave) plus a
 *     squared-distance vignette from the screen centre.
 *
 * Both passes use raw GLSL (not pre-built library effects), satisfying the
 * "custom EffectComposer pass" requirement.
 */

import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass }     from 'three/addons/postprocessing/ShaderPass.js'

// ── Shared pass vertex shader ─────────────────────────────────────────────────
const PASS_VERT = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// ── Chromatic Aberration ──────────────────────────────────────────────────────
const CA_FRAG = /* glsl */`
  uniform sampler2D tDiffuse;
  uniform float     uStr;
  varying vec2      vUv;

  void main() {
    vec2 dir = (vUv - 0.5) * uStr;
    float r  = texture2D(tDiffuse, vUv + dir * 1.0).r;
    float g  = texture2D(tDiffuse, vUv           ).g;
    float b  = texture2D(tDiffuse, vUv - dir * 1.0).b;
    gl_FragColor = vec4(r, g, b, 1.0);
  }
`

// ── Scanlines + Vignette ──────────────────────────────────────────────────────
const SL_FRAG = /* glsl */`
  uniform sampler2D tDiffuse;
  uniform float     uTime;
  uniform float     uIntensity;
  varying vec2      vUv;

  void main() {
    vec4  c    = texture2D(tDiffuse, vUv);
    float line = 1.0 - uIntensity * 0.16 * (sin(vUv.y * 420.0 + uTime * 2.0) * 0.5 + 0.5);
    float vig  = 1.0 - dot(vUv - 0.5, vUv - 0.5) * 0.85;
    gl_FragColor = vec4(c.rgb * line * vig, 1.0);
  }
`

export class PostProcessingManager {
  /** @type {EffectComposer} */
  composer = null

  _caPass  = null
  _slPass  = null

  /**
   * @param {THREE.WebGLRenderer} renderer
   * @param {THREE.Scene}         scene
   * @param {THREE.Camera}        camera
   */
  init(renderer, scene, camera) {
    this.composer = new EffectComposer(renderer)
    this.composer.addPass(new RenderPass(scene, camera))

    // ── Chromatic Aberration pass ─────────────────────────────────────────
    this._caPass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        uStr:     { value: 0.006 },
      },
      vertexShader:   PASS_VERT,
      fragmentShader: CA_FRAG,
    })
    this._caPass.enabled = true
    this.composer.addPass(this._caPass)

    // ── Scanline pass ─────────────────────────────────────────────────────
    this._slPass = new ShaderPass({
      uniforms: {
        tDiffuse:   { value: null },
        uTime:      { value: 0 },
        uIntensity: { value: 1.0 },
      },
      vertexShader:   PASS_VERT,
      fragmentShader: SL_FRAG,
    })
    this._slPass.enabled = false
    this.composer.addPass(this._slPass)

    return this
  }

  /** @param {number} elapsed */
  update(elapsed) {
    if (this._slPass) this._slPass.uniforms.uTime.value = elapsed
  }

  /** @param {number} w  @param {number} h */
  setSize(w, h) {
    this.composer?.setSize(w, h)
  }

  setChromaticEnabled(on)    { if (this._caPass) this._caPass.enabled = on }
  setScanlineEnabled(on)     { if (this._slPass) this._slPass.enabled  = on }
  setChromaticStrength(v)    { if (this._caPass) this._caPass.uniforms.uStr.value      = v }
  setScanlineIntensity(v)    { if (this._slPass) this._slPass.uniforms.uIntensity.value = v }

  dispose() {
    this.composer?.dispose()
    this.composer = null
  }
}

export default new PostProcessingManager()
