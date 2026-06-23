<template>
  <div class="shell">
    <header class="topbar">
      <div>
        <p class="topbar-kicker">Monitor movil</p>
        <h1>SensorCheck</h1>
      </div>
    </header>

    <main class="page">
      <SensorHero :alert-count="0" last-updated-at="" />

      <div class="content-grid">
        <SensorMenu :sensors="sensors" :selected-sensor-id="selectedSensorId" />

        <SensorInfoPanel :sensor="selectedSensor" />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import SensorHero from '../components/SensorHero.vue'
import SensorInfoPanel from '../components/SensorInfoPanel.vue'
import SensorMenu from '../components/SensorMenu.vue'
import type { SensorId, SensorReading } from '../composables/useSensorCheck'

const selectedSensorId: SensorId = 'light'

const sensors: SensorReading[] = [
  {
    id: 'accelerometer',
    name: 'Acelerometro',
    icon: 'A',
    description: 'Detecta movimientos rapidos y cambios de orientacion del celular.',
    value: 'Esperando movimiento',
    status: 'Normal',
    detail: 'Mueve el telefono para iniciar la lectura del acelerometro.'
  },
  {
    id: 'proximity',
    name: 'Proximidad',
    icon: 'P',
    description: 'Avisa si hay un objeto demasiado cerca del sensor frontal.',
    value: 'Esperando lectura',
    status: 'Normal',
    detail: 'Acerca tu mano al sensor para comprobar la proximidad.'
  },
  {
    id: 'light',
    name: 'Sensor de Luz',
    icon: 'L',
    description: 'Mide la luz de ambiente para reconocer niveles muy bajos o demasiado altos.',
    value: 'Esperando lectura',
    status: 'Normal',
    detail: 'Cambia la iluminacion del ambiente para actualizar el valor.'
  },
  {
    id: 'battery',
    name: 'Bateria',
    icon: 'B',
    description: 'Muestra el nivel de bateria. Muestra una alerta cuando baja del 15%.',
    value: 'Consultando...',
    status: 'Normal',
    detail: 'Intentando obtener el nivel de bateria del dispositivo.'
  },
  {
    id: 'internet',
    name: 'Internet',
    icon: 'I',
    description: 'Muestra si el celular tiene internet.',
    value: 'Consultando...',
    status: 'Normal',
    detail: 'Comprobando la conectividad de red actual.'
  },
  {
    id: 'gps',
    name: 'GPS',
    icon: 'G',
    description: 'Verifica si la ubicacion esta activada.',
    value: 'Verificando estado',
    status: 'Normal',
    detail: 'Comprueba si la ubicacion del sistema esta activa y, si das permiso, muestra coordenadas.'
  }
]

const selectedSensor = sensors.find((sensor) => sensor.id === selectedSensorId) ?? sensors[0]

useHead({
  script: [
    {
      defer: true,
      src: '/sensorcheck-runtime.js'
    }
  ]
})
</script>

<style scoped>
.shell {
  min-height: 100vh;
  background:
    radial-gradient(circle at top, rgba(59, 130, 246, 0.18), transparent 28%),
    linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  padding: 20px 20px 8px;
  background: rgba(248, 251, 255, 0.9);
  backdrop-filter: blur(10px);
}

.topbar-kicker {
  margin: 0 0 4px;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: #64748b;
}

.topbar h1 {
  margin: 0;
  font-size: 22px;
  color: #0f172a;
}

.page {
  padding: 20px;
  color: #0f172a;
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
  gap: 18px;
  margin-top: 18px;
}

@media (max-width: 860px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
