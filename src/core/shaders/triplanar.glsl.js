/**
 * src/shaders/triplanar.glsl.js
 * ─────────────────────────────
 * Raw GLSL for the primary mesh ShaderMaterial.
 *
 * VERTEX SHADER
 *   Computes world-space position, world-space normal, and view direction —
 *   all required by the tri-planar mapping and Fresnel calculations.
 *
 * FRAGMENT SHADER
 *   Implements:
 *   1. Tri-planar mapping   – UV-free texture projection from 3 world axes
 *   2. Fresnel (Schlick)    – PBR-Lite rim effect at grazing angles
 *   3. MatCap               – cheap sphere-mapped environment reflection
 *   4. Shader mode blend    – runtime-switchable via uMode uniform
 */

// ── Vertex ────────────────────────────────────────────────────────────────────

export const VERT_SHADER = /* glsl */`
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;

  void main() {
    vec4 wp      = modelMatrix * vec4(position, 1.0);
    vWorldPos    = wp.xyz;
    // mat3(modelMatrix) handles non-uniform scale correctly for normals
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vViewDir     = normalize(cameraPosition - wp.xyz);
    gl_Position  = projectionMatrix * viewMatrix * wp;
  }
`

// ── Fragment ──────────────────────────────────────────────────────────────────

export const FRAG_SHADER = /* glsl */`
  precision highp float;

  uniform sampler2D uTex;      // albedo / pattern (procedural)
  uniform sampler2D uMatcap;   // matcap sphere texture (procedural)
  uniform float     uScale;    // tri-planar tiling scale
  uniform float     uTime;     // animation time (seconds)
  uniform int       uMode;     // 0=triplanar+fresnel  1=matcap  2=combined
  uniform vec3      uColor;    // albedo tint
  uniform float     uFresExp;  // Fresnel exponent (3–6 typical)

  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;
  varying vec3 vViewDir;

  // ──────────────────────────────────────────────────────────────────────────
  // Tri-planar projection
  //
  // Projects the texture onto three world-aligned planes (YZ, XZ, XY),
  // then blends by the absolute world normal raised to a power.
  // Higher power = sharper transitions between planes, fewer seam artifacts.
  // This technique requires NO UV maps.
  // ──────────────────────────────────────────────────────────────────────────
  vec4 triplanar(sampler2D t, vec3 p, vec3 n, float s) {
    vec4 xP = texture2D(t, p.yz * s);   // seen from ±X axis
    vec4 yP = texture2D(t, p.xz * s);   // seen from ±Y axis
    vec4 zP = texture2D(t, p.xy * s);   // seen from ±Z axis

    vec3 w = pow(abs(n), vec3(4.0));    // sharpness exponent
    w /= w.x + w.y + w.z;              // normalise to sum = 1

    return xP * w.x + yP * w.y + zP * w.z;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Schlick Fresnel approximation
  //
  // F(θ) = F0 + (1 - F0)(1 - cosθ)^n
  // F0 = 0.04 for most dielectrics (glass, plastic, skin).
  // ──────────────────────────────────────────────────────────────────────────
  float fresnel(vec3 v, vec3 n, float pw) {
    float cosT = max(dot(v, n), 0.0);
    return 0.04 + 0.96 * pow(1.0 - cosT, pw);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MatCap UV — stereographic projection
  //
  // Transforms the world normal into view space, then maps it to a 2D
  // UV coordinate on the matcap sphere texture.  The formula is a
  // stereographic projection from the unit sphere to the unit disc.
  // ──────────────────────────────────────────────────────────────────────────
  vec2 matcapUV(vec3 v, vec3 n) {
    vec3 vn = normalize(mat3(viewMatrix) * n);   // normal in view space
    vec3 r  = reflect(-v, vn);                   // reflection direction
    float m = 2.0 * sqrt(r.x*r.x + r.y*r.y + (r.z + 1.0)*(r.z + 1.0));
    return vec2(r.x / m + 0.5, r.y / m + 0.5);
  }

  void main() {
    vec3  N   = normalize(vWorldNormal);
    vec3  V   = normalize(vViewDir);
    float sc  = uScale + sin(uTime * 0.5) * 0.015;  // subtle animated tiling

    vec3  albedo = triplanar(uTex, vWorldPos, N, sc).rgb * uColor;
    float fr     = fresnel(V, N, uFresExp);
    vec3  rim    = mix(vec3(0.0, 0.9, 1.0), vec3(1.0, 0.24, 0.67), fr);
    vec3  mc     = texture2D(uMatcap, matcapUV(V, N)).rgb;

    vec3 col;
    if      (uMode == 0) col = albedo + rim * fr * 1.5;
    else if (uMode == 1) col = mc;
    else                 col = albedo * mc * 1.9 + rim * fr;

    // Exponential depth fog
    float fog = clamp(gl_FragCoord.z / gl_FragCoord.w / 80.0, 0.0, 0.55);
    col = mix(col, vec3(0.04, 0.06, 0.10), fog);

    gl_FragColor = vec4(col, 1.0);
  }
`
