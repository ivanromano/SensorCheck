<template>
  <section class="hero">
    <div class="hero-visual">
      <div class="phone-shape">
        <div class="phone-notch"></div>
      </div>
    </div>

    <div class="hero-copy">
      <p class="eyebrow">Sensores </p>
      <h1>SensorCheck</h1>
      <p class="hero-text">
        Revisa los sensores y hardware de tu celular. 
      </p>

      <div class="hero-meta">
        <span
          class="chip"
          :class="alertCount > 0 ? 'chip-warning' : 'chip-success'"
          data-alert-chip
        >
          {{ alertCount }} alertas activas
        </span>
        <span class="chip chip-neutral" data-last-updated>
          Hora {{ lastUpdatedAt || '--:--:--' }}
        </span>
      </div>

      <div class="hero-actions">
        <button type="button" class="vibration-button" data-vibration-button>
          Probar vibracion
        </button>
        <span class="vibration-feedback" data-vibration-feedback>Lista para vibrar</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  alertCount: number
  lastUpdatedAt: string
}>()
</script>

<style scoped>
.hero {
  display: grid;
  grid-template-columns: 112px 1fr;
  gap: 18px;
  align-items: center;
  padding: 24px 20px;
  border-radius: 28px;
  background: linear-gradient(145deg, #0f172a, #1d4ed8 68%, #60a5fa);
  color: #eff6ff;
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.24);
}

.hero-visual {
  display: grid;
  place-items: center;
  width: 112px;
  height: 112px;
  border-radius: 32px;
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(10px);
}

.phone-shape {
  position: relative;
  width: 50px;
  height: 84px;
  border: 3px solid #eff6ff;
  border-radius: 14px;
}

.phone-notch {
  position: absolute;
  top: 6px;
  left: 50%;
  width: 20px;
  height: 4px;
  border-radius: 999px;
  background: #eff6ff;
  transform: translateX(-50%);
}

.eyebrow {
  margin: 0 0 6px;
  font-size: 12px;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  opacity: 0.82;
}

h1 {
  margin: 0;
  font-size: 32px;
  line-height: 1.05;
}

.hero-text {
  margin: 10px 0 0;
  max-width: 34rem;
  line-height: 1.5;
  color: rgba(239, 246, 255, 0.9);
}

.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 16px;
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-top: 16px;
}

.vibration-button {
  min-height: 42px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  background: #eff6ff;
  color: #0f172a;
  font-size: 14px;
  font-weight: 700;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.vibration-feedback {
  font-size: 13px;
  color: rgba(239, 246, 255, 0.82);
}

.chip {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 600;
}

.chip-success {
  background: #dcfce7;
  color: #166534;
}

.chip-warning {
  background: #fef3c7;
  color: #92400e;
}

.chip-neutral {
  background: rgba(255, 255, 255, 0.16);
  color: #eff6ff;
}

@media (max-width: 640px) {
  .hero {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .hero-visual {
    margin: 0 auto;
  }

  .hero-meta {
    justify-content: center;
  }

  .hero-actions {
    justify-content: center;
  }
}
</style>
