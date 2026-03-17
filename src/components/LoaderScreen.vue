<template>
  <Transition name="loader">
    <div v-if="visible" class="loader">
      <div class="title">CTRUH</div>
      <div class="sub">Initialising Configurator Engine</div>
      <div class="bar-wrap"><div class="bar" /></div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const visible = ref(true)

onMounted(() => {
  setTimeout(() => { visible.value = false }, 900)
})
</script>

<style scoped>
.loader {
  position: fixed;
  inset: 0;
  background: var(--bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
  z-index: 300;
}
.title {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--accent);
}
.sub {
  font-family: var(--font-m);
  font-size: 11px;
  color: var(--muted);
  letter-spacing: .14em;
  text-transform: uppercase;
}
.bar-wrap {
  width: 220px;
  height: 2px;
  background: rgba(255,255,255,.08);
  border-radius: 2px;
  overflow: hidden;
}
.bar {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent2));
  border-radius: 2px;
  animation: sweep 1.1s ease-in-out infinite;
  width: 38%;
}
@keyframes sweep {
  0%   { transform: translateX(-100%) }
  100% { transform: translateX(380%) }
}

.loader-enter-active,
.loader-leave-active { transition: opacity .6s ease; }
.loader-enter-from,
.loader-leave-to     { opacity: 0; }
</style>
