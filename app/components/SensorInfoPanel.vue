<template>
  <IonCard class="info-panel">
    <IonCardHeader>
      <div class="title-row">
        <div class="title-copy">
          <IonCardTitle>{{ sensor.name }}</IonCardTitle>
          <IonCardSubtitle>{{ sensor.description }}</IonCardSubtitle>
        </div>

        <IonBadge :color="sensor.status === 'Alerta' ? 'danger' : 'success'">
          {{ sensor.status }}
        </IonBadge>
      </div>
    </IonCardHeader>

    <IonCardContent>
      <div class="metric">
        <span class="metric-label">Valor actual</span>
        <strong>{{ sensor.value }}</strong>
      </div>

      <IonList inset>
        <IonItem>
          <IonLabel>
            <h3>Estado</h3>
            <p>{{ sensor.status }}</p>
          </IonLabel>
        </IonItem>

        <IonItem>
          <IonLabel>
            <h3>Descripcion</h3>
            <p>{{ sensor.detail }}</p>
          </IonLabel>
        </IonItem>
      </IonList>
    </IonCardContent>
  </IonCard>
</template>

<script setup lang="ts">
import {
  IonBadge,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonList
} from '@ionic/vue'
import type { SensorReading } from '../composables/useSensorCheck'

defineProps<{
  sensor: SensorReading
}>()
</script>

<style scoped>
.info-panel {
  height: 100%;
}

.title-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.title-copy {
  min-width: 0;
}

.metric {
  padding: 16px 18px;
  border-radius: 22px;
  background: linear-gradient(180deg, #eff6ff, #dbeafe);
}

.metric-label {
  display: block;
  margin-bottom: 8px;
  color: #475569;
  font-size: 14px;
}

.metric strong {
  font-size: 32px;
  color: #0f172a;
}
</style>
