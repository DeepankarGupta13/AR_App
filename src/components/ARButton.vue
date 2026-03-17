<template>
  <div class="ar-wrap">
    <button
      class="btn-ar"
      :class="{ active: isActive, loading: isLoading }"
      :disabled="isLoading"
      @click="handleClick"
    >
      <span class="icon">⬡</span>
      <span v-if="isLoading">Starting AR…</span>
      <span v-else-if="isActive">Exit AR</span>
      <span v-else>AR Mode</span>
    </button>

    <!-- shows which mode is running -->
    <div v-if="isActive" class="ar-badge" :class="hitTestMode ? 'badge-full' : 'badge-fallback'">
      {{ hitTestMode ? 'Surface detection active' : 'Tap-to-place mode' }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  arSupported: { type: Boolean, default: false },
})
const emit = defineEmits(['start-ar', 'end-ar', 'unsupported', 'error'])

const isActive   = ref(false)
const isLoading  = ref(false)
const hitTestMode = ref(false)

async function handleClick() {
  if (!props.arSupported) {
    emit('unsupported')
    return
  }

  if (isActive.value) {
    isActive.value = false
    hitTestMode.value = false
    emit('end-ar')
    return
  }

  isLoading.value = true
  try {
    emit('start-ar', {
      onSuccess: ({ hitTestAvailable }) => {
        isActive.value  = true
        hitTestMode.value = hitTestAvailable
        isLoading.value = false
      },
      onError: (msg) => {
        isLoading.value = false
        emit('error', msg)
      },
    })
  } catch {
    isLoading.value = false
  }
}

// Called by parent when session ends externally (OS back button)
function reset() {
  isActive.value   = false
  isLoading.value  = false
  hitTestMode.value = false
}

defineExpose({ reset })
</script>

<style scoped>
.ar-wrap {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
}

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
.btn-ar.loading {
  opacity: .6;
  cursor: wait;
}
.btn-ar:disabled { cursor: not-allowed; opacity: .5; }

.icon { font-size: 13px; }

.ar-badge {
  font-family: var(--font-m);
  font-size: 9px;
  letter-spacing: .08em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 10px;
}
.badge-full {
  background: rgba(0,229,255,.1);
  color: var(--accent);
  border: 1px solid rgba(0,229,255,.25);
}
.badge-fallback {
  background: rgba(255,180,0,.1);
  color: #ffb400;
  border: 1px solid rgba(255,180,0,.25);
}
</style>
