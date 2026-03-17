<template>
  <div class="hud">
    <!-- Top bar -->
    <div class="hud-top">
      <div class="logo">CTRUH <span>// XR Configurator</span></div>
      <StatsPanel :fps="fps" :draw-calls="drawCalls" :triangles="triangles" />
    </div>

    <!-- Bottom bar -->
    <div class="hud-bottom">
      <ControlPanel
        @shader-mode="onShaderMode"
        @chromatic="onChromatic"
        @scanlines="onScanlines"
        @asset="onAsset"
        @node-animate="onNodeAnimate"
      />

      <div class="right-col">
        <MemoryPanel :memory="memory" />
        <ARButton
          ref="arBtn"
          :ar-supported="arIsSupported"
          @start-ar="onStartAR"
          @end-ar="onEndAR"
          @unsupported="toast.show('AR not supported on this device', 3000)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import StatsPanel   from './StatsPanel.vue'
import MemoryPanel  from './MemoryPanel.vue'
import ControlPanel from './ControlPanel.vue'
import ARButton     from './ARButton.vue'

const props = defineProps({
  fps:        { type: Number,  default: 0 },
  drawCalls:  { type: Number,  default: 0 },
  triangles:  { type: Number,  default: 0 },
  memory:     { type: Object,  default: () => ({}) },
  toast:      { type: Object,  required: true },   // Toast component ref
})

const emit = defineEmits([
  'shader-mode', 'chromatic', 'scanlines',
  'asset', 'node-animate', 'start-ar', 'end-ar',
])

const arBtn         = ref(null)
const arIsSupported = ref(false)

onMounted(async () => {
  if ('xr' in navigator) {
    arIsSupported.value = await navigator.xr
      .isSessionSupported('immersive-ar')
      .catch(() => false)
  }
})

function onShaderMode(v)   { emit('shader-mode', v);     props.toast.show(['Tri-Planar + Fresnel', 'MatCap', 'Tri-Planar + MatCap'][v]) }
function onChromatic(v)    { emit('chromatic', v);        props.toast.show('Chromatic AB: ' + (v ? 'ON' : 'OFF')) }
function onScanlines(v)    { emit('scanlines', v);        props.toast.show('Scanlines: ' + (v ? 'ON' : 'OFF')) }
function onAsset(t)        { emit('asset', t);            props.toast.show('Asset: ' + t) }
function onNodeAnimate(v)  { emit('node-animate', v);     props.toast.show('Node Animation: ' + (v ? 'ON' : 'OFF')) }
function onStartAR()       { emit('start-ar');            props.toast.show('AR active — scan a surface & tap') }
function onEndAR()         { emit('end-ar');              props.toast.show('AR session ended') }
</script>

<style scoped>
.hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px;
  gap: 12px;
}

.hud-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.logo {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--accent);
}
.logo span { color: var(--muted); }

.hud-bottom {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  pointer-events: all;
  flex-wrap: wrap;
}

.right-col {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}
</style>
