<template>
  <section class="panel">
    <div class="panel-head">
      <h2>Sensores</h2>
      <p>Elige un sensor para ver su estado actual</p>
    </div>

    <div class="sensor-grid">
      <button
        v-for="sensor in sensors"
        :key="sensor.id"
        class="sensor-button"
        :class="{ active: sensor.id === selectedSensorId, alert: sensor.status === 'Alerta' }"
        type="button"
        :data-sensor-id="sensor.id"
        data-sensor-button
        :aria-pressed="sensor.id === selectedSensorId"
      >
        <span class="sensor-icon">{{ sensor.icon }}</span>
        <span data-sensor-name>{{ sensor.name }}</span>
        <span class="status-badge" :class="getStatusTone(sensor.status)" data-sensor-status>
          {{ sensor.status }}
        </span>
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { getStatusTone, type SensorId, type SensorReading } from '../composables/useSensorCheck'

defineProps<{
  selectedSensorId: SensorId
  sensors: SensorReading[]
}>()
</script>

<style scoped>
.panel {
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.08);
}

.panel-head h2 {
  margin: 0;
  font-size: 20px;
}

.panel-head p {
  margin: 6px 0 18px;
  color: #64748b;
}

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
  touch-action: manipulation;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}

.sensor-button.active {
  border-color: #2563eb;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.16);
  transform: translateY(-1px);
}

.sensor-button.alert {
  background: #fff7ed;
}

.sensor-icon {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: #dbeafe;
  color: #1d4ed8;
  font-weight: 800;
}

.sensor-button span {
  font-weight: 600;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
}

.status-badge.success {
  background: #dcfce7;
  color: #166534;
}

.status-badge.danger {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.neutral {
  background: #e2e8f0;
  color: #334155;
}

@media (max-width: 640px) {
  .sensor-grid {
    grid-template-columns: 1fr;
  }
}
</style>
