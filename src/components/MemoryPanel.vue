<template>
  <div class="mem-panel">
    <strong>GPU Memory</strong>
    <div class="row"><span>Geometries</span><span>{{ memory.geometries }}</span></div>
    <div class="row"><span>Textures</span><span>{{ memory.textures }}</span></div>
    <div class="row"><span>Programs</span><span>{{ memory.programs }}</span></div>
  </div>
</template>

<script setup>
defineProps({
  memory: { type: Object, default: () => ({ geometries: 0, textures: 0, programs: 0 }) },
})
</script>

<style scoped>
.mem-panel {
  background: rgba(13,17,23,.82);
  border: 1px solid var(--border);
  backdrop-filter: blur(14px);
  border-radius: var(--radius);
  padding: 10px 14px;
  font-family: var(--font-m);
  font-size: 10px;
  color: var(--muted);
  min-width: 175px;
}
strong {
  display: block;
  color: var(--accent2);
  margin-bottom: 5px;
  font-size: 9px;
  letter-spacing: .1em;
  text-transform: uppercase;
}
.row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 3px;
}
.row span:last-child { color: var(--text); }
</style>
