<template>
  <div id="scene-root">
    <!-- WebGL canvas -->
    <canvas ref="canvasRef" class="webgl-canvas" />

    <!-- Loader -->
    <LoaderScreen />

    <!-- HUD overlay -->
    <HUD
      :fps="fps"
      :draw-calls="drawCalls"
      :triangles="triangles"
      :memory="memory"
      :toast="toastRef"
      @shader-mode="setShaderMode"
      @chromatic="setChromaticAb"
      @scanlines="setScanlines"
      @asset="swapAsset"
      @node-animate="setNodeAnimate"
      @start-ar="handleStartAR"
      @end-ar="handleEndAR"
    />

    <!-- Toast notifications -->
    <Toast ref="toastRef" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import LoaderScreen from './components/LoaderScreen.vue'
import HUD          from './components/HUD.vue'
import Toast        from './components/Toast.vue'
import { useEngine } from './composables/useEngine.js'

const canvasRef = ref(null)
const toastRef  = ref(null)

const {
  fps, drawCalls, triangles, memory,
  initEngine,
  swapAsset, setShaderMode,
  setNodeAnimate, setChromaticAb, setScanlines,
  startAR, endAR,
} = useEngine()

onMounted(() => {
  initEngine(canvasRef.value)
})

async function handleStartAR() {
  try {
    await startAR()
  } catch (e) {
    toastRef.value?.show('Failed to start AR: ' + e.message, 3500)
  }
}

async function handleEndAR() {
  await endAR()
}
</script>

<style scoped>
#scene-root {
  position: relative;
  width: 100%;
  height: 100%;
}

.webgl-canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}
</style>
