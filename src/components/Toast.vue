<template>
  <Transition name="toast">
    <div v-if="visible" class="toast">{{ message }}</div>
  </Transition>
</template>

<script setup>
import { ref } from 'vue'

const message = ref('')
const visible = ref(false)
let _timer = null

function show(msg, duration = 2400) {
  message.value = msg
  visible.value = true
  clearTimeout(_timer)
  _timer = setTimeout(() => { visible.value = false }, duration)
}

defineExpose({ show })
</script>

<style scoped>
.toast {
  position: fixed;
  bottom: 90px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,229,255,.1);
  border: 1px solid var(--accent);
  border-radius: var(--radius);
  padding: 9px 18px;
  font-family: var(--font-m);
  font-size: 12px;
  color: var(--accent);
  white-space: nowrap;
  pointer-events: none;
  z-index: 200;
}

.toast-enter-active,
.toast-leave-active { transition: opacity .28s ease, transform .28s ease; }
.toast-enter-from   { opacity: 0; transform: translateX(-50%) translateY(12px); }
.toast-leave-to     { opacity: 0; transform: translateX(-50%) translateY(12px); }
</style>
