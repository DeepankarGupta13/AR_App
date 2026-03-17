<template>
  <div class="stats-panel">
    <div class="row"><span class="lbl">FPS</span><span class="val">{{ fps }}</span></div>
    <div class="row"><span class="lbl">Draw Calls</span><span class="val">{{ drawCalls }}</span></div>
    <div class="row"><span class="lbl">Triangles</span><span class="val">{{ fmtNum(triangles) }}</span></div>
    <div class="row"><span class="lbl">Nodes</span><span class="val accent2">1 024</span></div>
  </div>
</template>

<script setup>
defineProps({
  fps:       { type: Number, default: 0 },
  drawCalls: { type: Number, default: 0 },
  triangles: { type: Number, default: 0 },
})

function fmtNum(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K'
  return String(n)
}
</script>

<style scoped>
.stats-panel {
  background: rgba(13,17,23,.82);
  border: 1px solid var(--border);
  backdrop-filter: blur(14px);
  border-radius: var(--radius);
  padding: 10px 14px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px 20px;
  min-width: 190px;
}
.row  { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.lbl  { font-family: var(--font-m); font-size: 9px; letter-spacing: .1em; color: var(--muted); text-transform: uppercase; }
.val  { font-family: var(--font-m); font-size: 11px; color: var(--accent); font-weight: 500; }
.accent2 { color: var(--accent2); }
</style>
