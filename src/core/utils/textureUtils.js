/**
 * src/utils/textureUtils.js
 * ──────────────────────────
 * Procedural texture generators using the Canvas 2D API.
 * Produces THREE.CanvasTexture instances without any external HTTP requests,
 * keeping the project fully self-contained.
 *
 * In a production pipeline these would be replaced with:
 *   - KTX2 / BasisUniversal compressed textures (GPU-native BC7/ASTC)
 *   - Loaded via THREE.KTX2Loader for minimal VRAM and bandwidth
 */

import * as THREE from 'three'

/**
 * Generate a tileable dark-tech albedo pattern.
 * Used as the tri-planar colour texture.
 * @param {number} size – power of 2 (e.g. 256)
 * @returns {THREE.CanvasTexture}
 */
export function makeAlbedoTexture(size) {
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const x = cv.getContext('2d')

  // Base
  x.fillStyle = '#080c18'
  x.fillRect(0, 0, size, size)

  // Grid lines
  const step = size / 8
  x.strokeStyle = 'rgba(0,229,255,0.13)'
  x.lineWidth   = 0.5
  for (let i = 0; i <= size; i += step) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i, size); x.stroke()
    x.beginPath(); x.moveTo(0, i); x.lineTo(size, i); x.stroke()
  }

  // Glowing dots at grid intersections
  for (let gy = step / 2; gy < size; gy += step) {
    for (let gx = step / 2; gx < size; gx += step) {
      const r = 1 + Math.random() * 2
      x.beginPath()
      x.arc(gx, gy, r, 0, Math.PI * 2)
      x.fillStyle = `rgba(0,229,255,${(0.08 + Math.random() * 0.28).toFixed(2)})`
      x.fill()
    }
  }

  // Diagonal accent lines
  x.strokeStyle = 'rgba(255,60,172,0.07)'
  x.lineWidth   = 1
  for (let i = -size; i < size * 2; i += step * 2) {
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i + size, size); x.stroke()
  }

  const tex = new THREE.CanvasTexture(cv)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  return tex
}

/**
 * Generate a synthetic MatCap sphere texture.
 * Approximates a studio-lit reflective sphere for the MatCap shader model.
 * @param {number} size
 * @returns {THREE.CanvasTexture}
 */
export function makeMatcapTexture(size) {
  const cv = document.createElement('canvas')
  cv.width = cv.height = size
  const x  = cv.getContext('2d')
  const c  = size / 2
  const r  = size / 2

  // Sphere gradient: dark edge → bright off-centre highlight
  const base = x.createRadialGradient(c * 0.58, c * 0.46, 0, c, c, r)
  base.addColorStop(0,    '#ffffff')
  base.addColorStop(0.18, '#8ecfee')
  base.addColorStop(0.50, '#163468')
  base.addColorStop(0.82, '#0c0f1e')
  base.addColorStop(1,    '#040609')
  x.beginPath(); x.arc(c, c, r, 0, Math.PI * 2)
  x.fillStyle = base; x.fill()

  // Specular hotspot
  const spec = x.createRadialGradient(c * 0.53, c * 0.43, 0, c * 0.53, c * 0.43, r * 0.32)
  spec.addColorStop(0,   'rgba(255,255,255,0.92)')
  spec.addColorStop(0.5, 'rgba(90,200,255,0.30)')
  spec.addColorStop(1,   'rgba(0,0,0,0)')
  x.beginPath(); x.arc(c, c, r, 0, Math.PI * 2)
  x.fillStyle = spec; x.fill()

  // Complementary rim light (opposite side)
  const rim = x.createRadialGradient(c * 1.4, c * 1.42, 0, c, c, r)
  rim.addColorStop(0.72, 'rgba(0,0,0,0)')
  rim.addColorStop(0.87, 'rgba(255,60,172,0.42)')
  rim.addColorStop(1,    'rgba(0,0,0,0)')
  x.beginPath(); x.arc(c, c, r, 0, Math.PI * 2)
  x.fillStyle = rim; x.fill()

  return new THREE.CanvasTexture(cv)
}
