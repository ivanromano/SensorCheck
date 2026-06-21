<template>
  <IonCard>
    <IonCardHeader>
      <IonCardTitle>Sensores</IonCardTitle>
      <IonCardSubtitle>Elige un sensor para ver su estado actual</IonCardSubtitle>
    </IonCardHeader>

    <IonCardContent>
      <div class="sensor-grid">
        <button
          v-for="sensor in sensors"
          :key="sensor.id"
          class="sensor-button"
          :class="{ active: sensor.id === selectedSensorId, alert: sensor.status === 'Alerta' }"
          type="button"
          @click="$emit('select', sensor.id)"
        >
          <IonIcon :icon="sensor.icon" />
          <span>{{ sensor.name }}</span>
          <IonBadge :color="sensor.status === 'Alerta' ? 'danger' : 'success'">
            {{ sensor.status }}
          </IonBadge>
        </button>
      </div>
    </IonCardContent>
  </IonCard>
</template>

<script setup lang="ts">
import { IonBadge, IonCard, IonCardContent, IonCardHeader, IonCardSubtitle, IonCardTitle, IonIcon } from '@ionic/vue'
import type { SensorId, SensorReading } from '../composables/useSensorCheck'

defineProps<{
  selectedSensorId: SensorId
  sensors: SensorReading[]
}>()

defineEmits<{
  select: [sensorId: SensorId]
}>()
</script>

<style scoped>
.sensor-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.sensor-button {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 16px;
  border: 1px solid #dbe4f0;
  border-radius: 20px;
  background: #fff;
  color: #0f172a;
  text-align: left;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.sensor-button.active {
  border-color: #2563eb;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.16);
  transform: translateY(-1px);
}

.sensor-button.alert {
  background: #fff7ed;
}

.sensor-button ion-icon {
  font-size: 22px;
  color: #2563eb;
}

.sensor-button span {
  font-weight: 600;
}

@media (max-width: 640px) {
  .sensor-grid {
    grid-template-columns: 1fr;
  }
}
</style>
