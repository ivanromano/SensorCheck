<template>
  <section class="info-panel panel">
    <div class="title-row">
      <div class="title-copy">
        <h2 data-selected-sensor-name>{{ sensor.name }}</h2>
        <p data-selected-sensor-description>{{ sensor.description }}</p>
      </div>

      <span class="status-badge" :class="getStatusTone(sensor.status)" data-selected-sensor-status>
        {{ sensor.status }}
      </span>
    </div>

    <div class="metric">
      <span class="metric-label">Valor actual</span>
      <strong data-selected-sensor-value>{{ sensor.value }}</strong>
    </div>

    <div class="detail-list">
      <article class="detail-item">
        <h3>Estado</h3>
        <p data-selected-sensor-state>{{ sensor.status }}</p>
      </article>

      <article class="detail-item">
        <h3>Descripcion</h3>
        <p data-selected-sensor-detail>{{ sensor.detail }}</p>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { getStatusTone, type SensorReading } from '../composables/useSensorCheck'

defineProps<{
  sensor: SensorReading
}>()
</script>

<style scoped>
.info-panel {
  height: 100%;
}

.panel {
  padding: 18px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.88);
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.08);
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

.title-copy h2 {
  margin: 0;
  font-size: 22px;
}

.title-copy p {
  margin: 6px 0 0;
  color: #64748b;
  line-height: 1.5;
}

.metric {
  margin-top: 18px;
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

.detail-list {
  display: grid;
  gap: 12px;
  margin-top: 18px;
}

.detail-item {
  padding: 16px 18px;
  border-radius: 18px;
  background: #f8fafc;
}

.detail-item h3 {
  margin: 0 0 6px;
  font-size: 15px;
}

.detail-item p {
  margin: 0;
  color: #475569;
  line-height: 1.5;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  min-height: 30px;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
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
</style>
