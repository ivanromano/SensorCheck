<template>
  <IonPage>
    <IonHeader translucent>
      <IonToolbar>
        <IonTitle>SensorCheck</IonTitle>
      </IonToolbar>
    </IonHeader>

    <IonContent fullscreen>
      <main class="page">
        <SensorHero :alert-count="alertCount" :last-updated-at="lastUpdatedAt" />

        <div class="content-grid">
          <SensorMenu
            :sensors="sensors"
            :selected-sensor-id="selectedSensorId"
            @select="selectSensor"
          />

          <SensorInfoPanel v-if="selectedSensor" :sensor="selectedSensor" />
        </div>
      </main>
    </IonContent>
  </IonPage>
</template>

<script setup lang="ts">
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar } from '@ionic/vue'
import SensorHero from '../components/SensorHero.vue'
import SensorInfoPanel from '../components/SensorInfoPanel.vue'
import SensorMenu from '../components/SensorMenu.vue'
import { useSensorCheck } from '../composables/useSensorCheck'

const { alertCount, lastUpdatedAt, selectedSensor, selectedSensorId, selectSensor, sensors } =
  useSensorCheck()
</script>

<style scoped>
.page {
  min-height: 100vh;
  padding: 20px;
  color: #0f172a;
  background:
    radial-gradient(circle at top, rgba(59, 130, 246, 0.18), transparent 28%),
    linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 18px;
  margin-top: 18px;
}

ion-content {
  --background: linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
}

@media (max-width: 860px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
