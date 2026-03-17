<template>
  <button class="btn-ar" :class="{ active: isActive }" @click="handleClick">
    <span class="icon">⬡</span>
    {{ isActive ? 'Exit AR' : 'AR Mode' }}
  </button>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  arSupported: { type: Boolean, default: false },
})
const emit = defineEmits(['start-ar', 'end-ar', 'unsupported'])

const isActive = ref(false)

async function handleClick() {
  if (!props.arSupported) {
    emit('unsupported')
    return
  }
  if (isActive.value) {
    isActive.value = false
    emit('end-ar')
  } else {
    isActive.value = true
    emit('start-ar')
  }
}

// Allow parent to reset state when session ends externally
defineExpose({ reset: () => { isActive.value = false } })
</script>

<style scoped>
.btn-ar {
  font-family: var(--font-m);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: .06em;
  padding: 8px 14px;
  border-radius: var(--radius);
  border: 1px solid rgba(255,60,172,.3);
  background: rgba(13,17,23,.85);
  color: var(--accent2);
  cursor: pointer;
  backdrop-filter: blur(8px);
  transition: all var(--trans);
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.btn-ar:hover,
.btn-ar.active {
  border-color: var(--accent2);
  background: rgba(255,60,172,.09);
}
.icon { font-size: 13px; }
</style>
