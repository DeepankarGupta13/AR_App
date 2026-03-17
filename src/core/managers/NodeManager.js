/**
 * NodeManager
 * ───────────
 * Renders 1,024 "Interactive Data Nodes" in a SINGLE draw call using
 * THREE.InstancedMesh. Each node's colour and scale are driven by a
 * 32×32 RGBA32F DataTexture (the stretch goal).
 *
 * DataTexture layout (32 cols × 32 rows = 1024 texels, one per node):
 *   R = hue (0..1)
 *   G = saturation (0..1)
 *   B = size multiplier
 *   A = phase offset (radians)
 *
 * Why DataTexture instead of uniforms?
 *   1024 individual gl.uniform* calls/frame vs. one gl.texSubImage2D upload.
 *   The texture approach is ~1000× fewer GPU commands.
 */

import * as THREE from 'three'

const N       = 1024
const TEX_SZ  = 32   // 32 × 32 = 1024

const NODE_VERT = /* glsl */`
  uniform sampler2D uData;
  uniform float     uTSz;
  uniform float     uTime;

  varying vec3 vCol;

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    float idx = float(gl_InstanceID);
    float col = mod(idx, uTSz);
    float row = floor(idx / uTSz);
    vec4  d   = texture2D(uData, (vec2(col, row) + 0.5) / uTSz);

    // d.r=hue  d.g=sat  d.b=size  d.a=phase
    float sc = d.b * (0.75 + 0.5 * sin(uTime * 1.8 + d.a));
    vCol     = hsv2rgb(vec3(d.r + uTime * 0.04, d.g, 0.88));

    vec4 wp  = instanceMatrix * vec4(position * sc, 1.0);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`

const NODE_FRAG = /* glsl */`
  varying vec3 vCol;
  void main() { gl_FragColor = vec4(vCol, 1.0); }
`

export class NodeManager {
  /** @type {THREE.InstancedMesh} */
  instancedMesh = null

  /** @type {THREE.ShaderMaterial} */
  _material = null

  /** @type {THREE.DataTexture} */
  _dataTex = null

  /** @type {Float32Array} */
  _nodeData = null

  _animating = true
  _scene     = null

  /** @param {THREE.Scene} scene */
  init(scene) {
    this._scene    = scene
    this._nodeData = new Float32Array(TEX_SZ * TEX_SZ * 4)
    this._fillData()

    this._dataTex = new THREE.DataTexture(
      this._nodeData, TEX_SZ, TEX_SZ,
      THREE.RGBAFormat, THREE.FloatType
    )
    this._dataTex.needsUpdate = true

    this._material = new THREE.ShaderMaterial({
      vertexShader:   NODE_VERT,
      fragmentShader: NODE_FRAG,
      uniforms: {
        uData: { value: this._dataTex },
        uTSz:  { value: TEX_SZ },
        uTime: { value: 0 },
      },
    })

    // Small icosahedron for each node (BufferGeometry internally)
    const geo = new THREE.IcosahedronGeometry(0.065, 1)
    this.instancedMesh = new THREE.InstancedMesh(geo, this._material, N)
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this._placeOnFibonacciSphere()

    scene.add(this.instancedMesh)
    return this
  }

  /** @param {number} elapsed  @param {boolean} animate */
  update(elapsed, animate) {
    
    if (this._animating) {
      this._material.uniforms.uTime.value = elapsed
      for (let i = 0; i < N; i++) {
        const b = i * 4
        this._nodeData[b]     = (this._nodeData[b] + 0.0006) % 1     // hue drift
        this._nodeData[b + 2] = 0.5 + Math.sin(elapsed + this._nodeData[b + 3]) * 1.1
      }
      this._dataTex.needsUpdate = true
    }
  }

  setAnimating(on) { this._animating = on }

  // ── private ────────────────────────────────────────────────────────────────

  _fillData() {
    for (let i = 0; i < N; i++) {
      const b = i * 4
      this._nodeData[b]     = Math.random()                    // hue
      this._nodeData[b + 1] = 0.55 + Math.random() * 0.45     // saturation
      this._nodeData[b + 2] = 0.5  + Math.random() * 1.5      // size
      this._nodeData[b + 3] = Math.random() * Math.PI * 2     // phase
    }
  }

  /**
   * Fibonacci sphere — distributes N points evenly on a sphere surface.
   * Uses Matrix4.compose for efficient instance placement.
   */
  _placeOnFibonacciSphere() {
    const dummy  = new THREE.Object3D()
    const golden = Math.PI * (3 - Math.sqrt(5))
    const R      = 4.6

    for (let i = 0; i < N; i++) {
      const y  = 1 - (i / (N - 1)) * 2
      const r  = Math.sqrt(Math.max(0, 1 - y * y))
      const th = golden * i

      dummy.position.set(Math.cos(th) * r * R, y * R, Math.sin(th) * r * R)
      dummy.quaternion.setFromEuler(
        new THREE.Euler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, 0)
      )
      dummy.scale.setScalar(1)
      dummy.updateMatrix()
      this.instancedMesh.setMatrixAt(i, dummy.matrix)
    }
    this.instancedMesh.instanceMatrix.needsUpdate = true
  }

  dispose() {
    this.instancedMesh?.geometry.dispose()
    this._material?.dispose()
    this._dataTex?.dispose()
    this._scene?.remove(this.instancedMesh)
    this.instancedMesh = null
    this._material     = null
    this._dataTex      = null
  }
}

export default new NodeManager()
