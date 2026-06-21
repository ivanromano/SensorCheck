<template>
  <section class="hero">
    <div class="hero-visual">
      <IonIcon :icon="phonePortraitOutline" class="hero-icon" />
    </div>

    <div class="hero-copy">
      <p class="eyebrow">Sensores </p>
      <h1>SensorCheck</h1>
      <p class="hero-text">
        Revisa los sensores y hardware de tu celular. 
      </p>

      <div class="hero-meta">
        <IonChip :color="alertCount > 0 ? 'warning' : 'success'">
          <IonLabel>{{ alertCount }} alertas activas</IonLabel>
        </IonChip>

        <!-- <IonChip color="warning">
          <IonLabel>Actualizado {{ lastUpdatedAt }}</IonLabel>
        </IonChip> -->
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { IonChip, IonIcon, IonLabel } from '@ionic/vue'
import { phonePortraitOutline } from 'ionicons/icons'

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

.hero-icon {
  font-size: 60px;
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
}
</style>
