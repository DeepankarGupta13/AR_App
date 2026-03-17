<template>
  <div class="control-panel">

    <!-- Shader mode -->
    <div class="group">
      <span class="group-label">Shader Mode</span>
      <div class="select-wrap">
        <select :value="shaderMode" @change="e => emit('shader-mode', parseInt(e.target.value))">
          <option value="0">Tri-Planar + Fresnel</option>
          <option value="1">MatCap Reflection</option>
          <option value="2">Tri-Planar + MatCap</option>
        </select>
        <span class="arrow">▾</span>
      </div>
    </div>

    <!-- Post FX -->
    <div class="group">
      <span class="group-label">Post FX</span>
      <div class="btn-row">
        <button
          class="btn"
          :class="{ on: caOn }"
          @click="toggle('caOn'); emit('chromatic', caOn)"
        >Chromatic Ab.</button>
        <button
          class="btn"
          :class="{ on: slOn }"
          @click="toggle('slOn'); emit('scanlines', slOn)"
        >Scanlines</button>
      </div>
    </div>

    <!-- Asset -->
    <div class="group">
      <span class="group-label">Asset</span>
      <div class="btn-row">
        <button
          v-for="t in assets"
          :key="t"
          class="btn"
          :class="{ on: activeAsset === t }"
          @click="activeAsset = t; emit('asset', t)"
        >{{ capitalize(t) }}</button>
      </div>
    </div>

    <!-- Nodes -->
    <div class="group">
      <span class="group-label">Nodes</span>
      <div class="btn-row">
        <button
          class="btn"
          :class="{ on: animNodes }"
          @click="toggle('animNodes'); emit('node-animate', animNodes)"
        >Animate</button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits([
  'shader-mode', 'chromatic', 'scanlines',
  'asset', 'node-animate',
])

const assets      = ['sphere', 'torus', 'knot']
const shaderMode  = ref(0)
const activeAsset = ref('sphere')
const caOn        = ref(true)
const slOn        = ref(false)
const animNodes   = ref(false)

const states = { caOn, slOn, animNodes }
function toggle(key) { states[key].value = !states[key].value }
function capitalize(s) { return s[0].toUpperCase() + s.slice(1) }
</script>

<style scoped>
.control-panel {
  display: flex;
  gap: 14px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-label {
  font-family: var(--font-m);
  font-size: 9px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--muted);
  padding-left: 2px;
}

.btn-row { display: flex; gap: 6px; flex-wrap: wrap; }

.btn {
  font-family: var(--font-m);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: .05em;
  padding: 7px 13px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: rgba(13,17,23,.85);
  color: var(--text);
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: all var(--trans);
  white-space: nowrap;
}
.btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: rgba(0,229,255,.06);
}
.btn.on {
  border-color: var(--accent);
  background: rgba(0,229,255,.13);
  color: var(--accent);
}

.select-wrap {
  position: relative;
}
.select-wrap select {
  font-family: var(--font-m);
  font-size: 11px;
  padding: 7px 28px 7px 11px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  background: rgba(13,17,23,.85);
  color: var(--text);
  cursor: pointer;
  appearance: none;
  backdrop-filter: blur(8px);
  outline: none;
  transition: border-color var(--trans);
}
.select-wrap select:hover,
.select-wrap select:focus { border-color: var(--accent); }
.arrow {
  position: absolute;
  right: 9px; top: 50%;
  transform: translateY(-50%);
  color: var(--muted);
  pointer-events: none;
  font-size: 10px;
}
</style>
