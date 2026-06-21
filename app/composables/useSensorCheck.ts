import {
  batteryChargingOutline,
  phonePortraitOutline,
  speedometerOutline,
  sunnyOutline,
  wifiOutline,
  locationOutline
} from 'ionicons/icons'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export type SensorId =
  | 'accelerometer'
  | 'proximity'
  | 'light'
  | 'battery'
  | 'internet'
  | 'gps'

export type SensorStatus = 'Normal' | 'Alerta'

export interface SensorDefinition {
  id: SensorId
  name: string
  icon: string
  description: string
}

export interface SensorReading extends SensorDefinition {
  value: string
  status: SensorStatus
  detail: string
}

const sensorDefinitions: SensorDefinition[] = [
  {
    id: 'accelerometer',
    name: 'Acelerometro',
    icon: speedometerOutline,
    description: 'Detecta movimientos rapidos y cambios de orientacion del celular.'
  },
  {
    id: 'proximity',
    name: 'Proximidad',
    icon: phonePortraitOutline,
    description: 'Avisa si hay un objeto demasiado cerca del sensor frontal.'
  },
  {
    id: 'light',
    name: 'Sensor de Luz',
    icon: sunnyOutline,
    description: 'Mide la luz de ambiente para reconocer niveles muy bajos o demasiado altos.'
  },
  {
    id: 'battery',
    name: 'Bateria',
    icon: batteryChargingOutline,
    description: 'Muestra el nivel de bateria. Muestra una alerta cuando baja del 15%.'
  },
  {
    id: 'internet',
    name: 'Internet',
    icon: wifiOutline,
    description: 'Muestra si el celular tiene internet'
  },
  {
    id: 'gps',
    name: 'GPS',
    icon: locationOutline,
    description: 'Verifica si la ubicacion esta activada.'
  }
]

function randomBetween(min: number, max: number): number {
  return Math.round(Math.random() * (max - min) + min)
}

function buildReading(sensor: SensorDefinition): SensorReading {
  switch (sensor.id) {
    case 'accelerometer': {
      const motion = randomBetween(0, 28)
      const status: SensorStatus = motion >= 20 ? 'Alerta' : 'Normal'

      return {
        ...sensor,
        value: `${motion} m/s2`,
        status,
        detail:
          status === 'Alerta'
            ? 'Movimiento brusco detectado por el acelerometro.'
            : 'Movimiento dentro de los rangos esperados.'
      }
    }

    case 'proximity': {
      const distance = randomBetween(0, 12)
      const status: SensorStatus = distance <= 2 ? 'Alerta' : 'Normal'

      return {
        ...sensor,
        value: `${distance} cm`,
        status,
        detail:
          status === 'Alerta'
            ? 'Objeto demasiado cercano al sensor de proximidad.'
            : 'No se detectan objetos cercanos de riesgo.'
      }
    }

    case 'light': {
      const lux = randomBetween(10, 1200)
      const status: SensorStatus = lux < 80 || lux > 900 ? 'Alerta' : 'Normal'

      return {
        ...sensor,
        value: `${lux} lux`,
        status,
        detail:
          status === 'Alerta'
            ? 'Nivel de luz extremadamente bajo o alto.'
            : 'Nivel de iluminacion adecuado.'
      }
    }

    case 'battery': {
      const level = randomBetween(5, 100)
      const status: SensorStatus = level < 15 ? 'Alerta' : 'Normal'

      return {
        ...sensor,
        value: `${level}%`,
        status,
        detail:
          status === 'Alerta'
            ? 'La bateria esta por debajo del 15%.'
            : 'La bateria tiene un nivel saludable.'
      }
    }

    case 'internet': {
      const connected = Math.random() > 0.2
      const status: SensorStatus = connected ? 'Normal' : 'Alerta'

      return {
        ...sensor,
        value: connected ? 'Conectado' : 'Sin conexion',
        status,
        detail:
          status === 'Alerta'
            ? 'No hay conexion a Internet.'
            : 'La conectividad de red esta disponible.'
      }
    }

    case 'gps': {
      const enabled = Math.random() > 0.25
      const status: SensorStatus = enabled ? 'Normal' : 'Alerta'

      return {
        ...sensor,
        value: enabled ? 'Activo' : 'Desactivado',
        status,
        detail:
          status === 'Alerta'
            ? 'El GPS se encuentra desactivado.'
            : 'El servicio de ubicacion esta activo.'
      }
    }
  }
}

export function useSensorCheck() {
  const sensors = ref<SensorReading[]>(sensorDefinitions.map(buildReading))
  const selectedSensorId = ref<SensorId>('light')
  const lastUpdatedAt = ref('')

  let refreshTimer: ReturnType<typeof setInterval> | null = null

  const selectedSensor = computed(() => {
    return sensors.value.find((sensor) => sensor.id === selectedSensorId.value) ?? sensors.value[0]
  })

  const alertCount = computed(() => {
    return sensors.value.filter((sensor) => sensor.status === 'Alerta').length
  })

  function refreshSensors() {
    sensors.value = sensorDefinitions.map(buildReading)
    lastUpdatedAt.value = new Date().toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  function selectSensor(sensorId: SensorId) {
    selectedSensorId.value = sensorId
  }

  onMounted(() => {
    refreshSensors()
    refreshTimer = setInterval(refreshSensors, 4000)
  })

  onBeforeUnmount(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer)
    }
  })

  return {
    alertCount,
    lastUpdatedAt,
    selectedSensor,
    selectedSensorId,
    selectSensor,
    sensors
  }
}
