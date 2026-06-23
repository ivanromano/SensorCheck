import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export type SensorId =
  | 'accelerometer'
  | 'proximity'
  | 'light'
  | 'battery'
  | 'internet'
  | 'gps'

export type SensorStatus = 'Normal' | 'Alerta' | 'Sin soporte'

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

interface SensorStateUpdate {
  detail: string
  status: SensorStatus
  value: string
}

interface BatteryManagerLike extends EventTarget {
  charging: boolean
  level: number
}

interface SensorCheckNativePlugin {
  requestLocationPermission: (
    onSuccess: (result: string) => void,
    onError: (error: string) => void
  ) => void
  getLocationPermissionStatus: (
    onSuccess: (result: string) => void,
    onError: (error: string) => void
  ) => void
  startLightUpdates: (
    onSuccess: (illuminance: { illuminance: number }) => void,
    onError: (error: string) => void
  ) => void
  stopLightUpdates: (
    onSuccess: () => void,
    onError: (error: string) => void
  ) => void
}

type WindowWithSensorPlugin = Window & {
  SensorCheckNative?: SensorCheckNativePlugin
}

const getNativePluginIfAvailable = (): SensorCheckNativePlugin | null => {
  const w = window as WindowWithSensorPlugin
  if (w.SensorCheckNative) {
    console.log('[SensorCheck] Plugin nativo SensorCheckNative disponible')
    return w.SensorCheckNative
  }
  return null
}

type NavigatorWithBattery = Navigator & {
  getBattery?: () => Promise<BatteryManagerLike>
}

type SensorWindow = Window & {
  ProximitySensor?: new (options?: { frequency?: number }) => {
    distance?: number
    near?: boolean
    start: () => void
    stop?: () => void
    addEventListener: EventTarget['addEventListener']
    removeEventListener: EventTarget['removeEventListener']
  }
}

const sensorDefinitions: SensorDefinition[] = [
  {
    id: 'accelerometer',
    name: 'Acelerometro',
    icon: 'A',
    description: 'Detecta movimientos rapidos y cambios de orientacion del celular.'
  },
  {
    id: 'proximity',
    name: 'Proximidad',
    icon: 'P',
    description: 'Avisa si hay un objeto demasiado cerca del sensor frontal.'
  },
  {
    id: 'light',
    name: 'Sensor de Luz',
    icon: 'L',
    description: 'Mide la luz de ambiente para reconocer niveles muy bajos o demasiado altos.'
  },
  {
    id: 'battery',
    name: 'Bateria',
    icon: 'B',
    description: 'Muestra el nivel de bateria. Muestra una alerta cuando baja del 15%.'
  },
  {
    id: 'internet',
    name: 'Internet',
    icon: 'I',
    description: 'Muestra si el celular tiene internet.'
  },
  {
    id: 'gps',
    name: 'GPS',
    icon: 'G',
    description: 'Verifica si la ubicacion esta activada.'
  }
]

const initialSensorState: Record<SensorId, SensorStateUpdate> = {
  accelerometer: {
    value: 'Esperando movimiento',
    status: 'Normal',
    detail: 'Mueve el telefono para iniciar la lectura del acelerometro.'
  },
  proximity: {
    value: 'Esperando lectura',
    status: 'Normal',
    detail: 'Acerca tu mano al sensor para comprobar la proximidad.'
  },
  light: {
    value: 'Esperando lectura',
    status: 'Normal',
    detail: 'Cambia la iluminacion del ambiente para actualizar el valor.'
  },
  battery: {
    value: 'Consultando...',
    status: 'Normal',
    detail: 'Intentando obtener el nivel de bateria del dispositivo.'
  },
  internet: {
    value: 'Consultando...',
    status: 'Normal',
    detail: 'Comprobando la conectividad de red actual.'
  },
  gps: {
    value: 'Solicitando acceso',
    status: 'Normal',
    detail: 'Esperando permisos o una lectura de ubicacion.'
  }
}

export function getStatusTone(status: SensorStatus) {
  switch (status) {
    case 'Alerta':
      return 'danger'
    case 'Sin soporte':
      return 'neutral'
    default:
      return 'success'
  }
}

function buildInitialReadings(): SensorReading[] {
  return sensorDefinitions.map((sensor) => ({
    ...sensor,
    ...initialSensorState[sensor.id]
  }))
}

function formatClockTime() {
  return new Date().toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function describeGpsError(error: GeolocationPositionError) {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'Permiso de ubicacion denegado.'
    case error.POSITION_UNAVAILABLE:
      return 'No se pudo obtener la ubicacion actual.'
    case error.TIMEOUT:
      return 'La lectura del GPS tardo demasiado.'
    default:
      return 'No fue posible acceder a la ubicacion.'
  }
}

export function useSensorCheck() {
  const sensors = ref<SensorReading[]>(buildInitialReadings())
  const selectedSensorId = ref<SensorId>('light')
  const lastUpdatedAt = ref('')

  const cleanupTasks: Array<() => void> = []
  const lastSensorUpdateAt = new Map<SensorId, number>()

  const selectedSensor = computed(() => {
    return sensors.value.find((sensor) => sensor.id === selectedSensorId.value) ?? sensors.value[0]
  })

  const alertCount = computed(() => {
    return sensors.value.filter((sensor) => sensor.status === 'Alerta').length
  })

  function syncLastUpdatedAt() {
    lastUpdatedAt.value = formatClockTime()
  }

  function updateSensor(sensorId: SensorId, next: SensorStateUpdate, minIntervalMs = 0) {
    const now = Date.now()
    const lastUpdate = lastSensorUpdateAt.get(sensorId) ?? 0

    if (minIntervalMs > 0 && now - lastUpdate < minIntervalMs) {
      return
    }

    lastSensorUpdateAt.set(sensorId, now)
    sensors.value = sensors.value.map((sensor) =>
      sensor.id === sensorId ? { ...sensor, ...next } : sensor
    )
    syncLastUpdatedAt()
  }

  function markUnsupported(sensorId: SensorId, detail: string) {
    updateSensor(sensorId, {
      value: 'No disponible',
      status: 'Sin soporte',
      detail
    })
  }

  function selectSensor(sensorId: SensorId) {
    selectedSensorId.value = sensorId
  }

  function registerCleanup(cleanup: () => void) {
    cleanupTasks.push(cleanup)
  }

  function startConnectivityTracking() {
    const syncConnectivity = () => {
      const connected = navigator.onLine

      updateSensor('internet', {
        value: connected ? 'Conectado' : 'Sin conexion',
        status: connected ? 'Normal' : 'Alerta',
        detail: connected
          ? 'La conectividad de red esta disponible.'
          : 'No hay conexion a Internet.'
      })
    }

    syncConnectivity()
    window.addEventListener('online', syncConnectivity)
    window.addEventListener('offline', syncConnectivity)
    registerCleanup(() => {
      window.removeEventListener('online', syncConnectivity)
      window.removeEventListener('offline', syncConnectivity)
    })
  }

  function startBatteryTracking() {
    const navigatorWithBattery = navigator as NavigatorWithBattery

    if (!navigatorWithBattery.getBattery) {
      markUnsupported(
        'battery',
        'El navegador del dispositivo no expone la API de bateria en este WebView.'
      )
      return
    }

    void navigatorWithBattery
      .getBattery()
      .then((battery) => {
        const syncBattery = () => {
          const level = Math.round(battery.level * 100)
          const chargingLabel = battery.charging ? ' cargando' : ''

          updateSensor('battery', {
            value: `${level}%${chargingLabel}`,
            status: level < 15 ? 'Alerta' : 'Normal',
            detail:
              level < 15
                ? 'La bateria esta por debajo del 15%.'
                : battery.charging
                  ? 'La bateria tiene un nivel saludable y se esta cargando.'
                  : 'La bateria tiene un nivel saludable.'
          })
        }

        syncBattery()
        battery.addEventListener('levelchange', syncBattery)
        battery.addEventListener('chargingchange', syncBattery)
        registerCleanup(() => {
          battery.removeEventListener('levelchange', syncBattery)
          battery.removeEventListener('chargingchange', syncBattery)
        })
      })
      .catch(() => {
        markUnsupported('battery', 'No se pudo leer el estado de la bateria del dispositivo.')
      })
  }

  function startGpsTracking() {
    if (!navigator.geolocation) {
      markUnsupported('gps', 'La ubicacion no esta disponible en este dispositivo o WebView.')
      return
    }

    const plugin = getNativePluginIfAvailable()

    // En Android 6+, necesitamos solicitar permisos de runtime
    if (plugin) {
      console.log('[SensorCheck-GPS] Solicitando permiso de ubicación con plugin nativo...')
      plugin.requestLocationPermission(
        (result) => {
          console.log('[SensorCheck-GPS] Respuesta del plugin:', result)
          if (result !== 'granted') {
            updateSensor('gps', {
              value: 'Permiso pendiente',
              status: 'Alerta',
              detail: 'El permiso de ubicacion fue denegado. Actívalo en la configuración del dispositivo.'
            })
            return
          }

          // Los permisos fueron otorgados, ahora usar geolocation
          console.log('[SensorCheck-GPS] Permiso otorgado, iniciando geolocation...')
          startGeolocationTracking()
        },
        (error) => {
          console.error('[SensorCheck-GPS] Error solicitando permiso:', error)
          updateSensor('gps', {
            value: 'Error',
            status: 'Alerta',
            detail: `No se pudo solicitar el permiso de ubicacion: ${error}`
          })
        }
      )
      return
    }

    // Si no hay plugin nativo, usar geolocation directamente
    console.log('[SensorCheck-GPS] Plugin nativo no disponible, usando geolocation directamente...')
    startGeolocationTracking()
  }

  function startGeolocationTracking() {
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { accuracy, latitude, longitude } = position.coords
        const accuracyLabel = Math.round(accuracy)

        updateSensor('gps', {
          value: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          status: 'Normal',
          detail: `Ubicacion activa con una precision aproximada de ${accuracyLabel} m.`
        })
      },
      (error) => {
        updateSensor('gps', {
          value: 'Desactivado',
          status: 'Alerta',
          detail: describeGpsError(error)
        })
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 15000
      }
    )

    registerCleanup(() => {
      navigator.geolocation.clearWatch(watchId)
    })
  }

  function startAccelerometerTracking() {
    if (!('DeviceMotionEvent' in window)) {
      markUnsupported('accelerometer', 'El acelerometro no esta disponible en este dispositivo.')
      return
    }

    let receivedReading = false

    const syncMotion = (event: DeviceMotionEvent) => {
      receivedReading = true

      const sample = event.acceleration ?? event.accelerationIncludingGravity
      const x = sample?.x ?? 0
      const y = sample?.y ?? 0
      const z = sample?.z ?? 0
      const magnitude = Math.sqrt(x * x + y * y + z * z)
      const status: SensorStatus = magnitude >= 18 ? 'Alerta' : 'Normal'

      updateSensor(
        'accelerometer',
        {
          value: `${magnitude.toFixed(1)} m/s2`,
          status,
          detail:
            status === 'Alerta'
              ? 'Movimiento brusco detectado por el acelerometro.'
              : 'Movimiento dentro de los rangos esperados.'
        },
        250
      )
    }

    const missingReadingTimer = window.setTimeout(() => {
      if (!receivedReading) {
        markUnsupported(
          'accelerometer',
          'No se recibieron eventos de movimiento desde el acelerometro.'
        )
      }
    }, 5000)

    window.addEventListener('devicemotion', syncMotion)
    registerCleanup(() => {
      window.clearTimeout(missingReadingTimer)
      window.removeEventListener('devicemotion', syncMotion)
    })
  }

  function startLightTracking() {
    const plugin = getNativePluginIfAvailable()

    // Usar el plugin nativo de Android primero
    if (plugin) {
      console.log('[SensorCheck-Light] Iniciando sensor de luz con plugin nativo...')
      plugin.startLightUpdates(
        (data) => {
          console.log('[SensorCheck-Light] Dato del sensor:', data)
          const lux = Number(data.illuminance ?? 0)
          const status: SensorStatus = lux < 80 || lux > 900 ? 'Alerta' : 'Normal'

          updateSensor('light', {
            value: `${lux.toFixed(0)} lux`,
            status,
            detail:
              status === 'Alerta'
                ? 'Nivel de luz extremadamente bajo o alto.'
                : 'Nivel de iluminacion adecuado.'
          })
        },
        (error) => {
          console.error('[SensorCheck-Light] Error del plugin nativo:', error)
          // Si el sensor de luz no está disponible en el dispositivo
          markUnsupported(
            'light',
            `El sensor de luz no esta disponible en este dispositivo: ${error}`
          )
        }
      )

      registerCleanup(() => {
        console.log('[SensorCheck-Light] Deteniendo sensor de luz...')
        plugin.stopLightUpdates(() => {}, () => {})
      })
      return
    }

    console.log('[SensorCheck-Light] Plugin nativo no disponible, intentando APIs web...')

    // Fallback a AmbientLightSensor API si existe
    const sensorWindow = window as unknown as {
      AmbientLightSensor?: new (options?: { frequency?: number }) => {
        illuminance?: number
        start: () => void
        stop?: () => void
        addEventListener: EventTarget['addEventListener']
        removeEventListener: EventTarget['removeEventListener']
      }
    }

    if (sensorWindow.AmbientLightSensor) {
      try {
        const sensor = new sensorWindow.AmbientLightSensor({ frequency: 1 })

        const syncLight = () => {
          const lux = Number(sensor.illuminance ?? 0)
          const status: SensorStatus = lux < 80 || lux > 900 ? 'Alerta' : 'Normal'

          updateSensor('light', {
            value: `${lux.toFixed(0)} lux`,
            status,
            detail:
              status === 'Alerta'
                ? 'Nivel de luz extremadamente bajo o alto.'
                : 'Nivel de iluminacion adecuado.'
          })
        }

        const handleError = () => {
          markUnsupported('light', 'No fue posible iniciar el sensor de luz ambiental.')
        }

        sensor.addEventListener('reading', syncLight)
        sensor.addEventListener('error', handleError)
        sensor.start()
        registerCleanup(() => {
          sensor.removeEventListener('reading', syncLight)
          sensor.removeEventListener('error', handleError)
          sensor.stop?.()
        })
        return
      } catch {
        markUnsupported('light', 'El sensor de luz ambiental no se pudo iniciar en este WebView.')
        return
      }
    }

    if ('ondevicelight' in window) {
      const syncLegacyLight = (event: Event) => {
        const lux = Number((event as Event & { value?: number }).value ?? 0)
        const status: SensorStatus = lux < 80 || lux > 900 ? 'Alerta' : 'Normal'

        updateSensor('light', {
          value: `${lux.toFixed(0)} lux`,
          status,
          detail:
            status === 'Alerta'
              ? 'Nivel de luz extremadamente bajo o alto.'
              : 'Nivel de iluminacion adecuado.'
        })
      }

      window.addEventListener('devicelight', syncLegacyLight as EventListener)
      registerCleanup(() => {
        window.removeEventListener('devicelight', syncLegacyLight as EventListener)
      })
      return
    }

    markUnsupported(
      'light',
      'El dispositivo o el WebView no exponen el sensor de luz ambiental.'
    )
  }

  function startProximityTracking() {
    const sensorWindow = window as SensorWindow

    if (sensorWindow.ProximitySensor) {
      try {
        const sensor = new sensorWindow.ProximitySensor({ frequency: 2 })

        const syncProximity = () => {
          const distance = Number(sensor.distance ?? 0)
          const isNear = Boolean(sensor.near ?? distance <= 2)
          const status: SensorStatus = isNear ? 'Alerta' : 'Normal'

          updateSensor('proximity', {
            value: `${distance.toFixed(1)} cm`,
            status,
            detail: isNear
              ? 'Objeto demasiado cercano al sensor de proximidad.'
              : 'No se detectan objetos cercanos de riesgo.'
          })
        }

        const handleError = () => {
          markUnsupported('proximity', 'No fue posible iniciar el sensor de proximidad.')
        }

        sensor.addEventListener('reading', syncProximity)
        sensor.addEventListener('error', handleError)
        sensor.start()
        registerCleanup(() => {
          sensor.removeEventListener('reading', syncProximity)
          sensor.removeEventListener('error', handleError)
          sensor.stop?.()
        })
        return
      } catch {
        markUnsupported('proximity', 'El sensor de proximidad no se pudo iniciar en este WebView.')
        return
      }
    }

    if ('ondeviceproximity' in window) {
      const syncLegacyProximity = (event: Event) => {
        const legacyEvent = event as Event & {
          distance?: number
          near?: boolean
          value?: number
        }
        const distance = Number(legacyEvent.distance ?? legacyEvent.value ?? 0)
        const isNear = Boolean(legacyEvent.near ?? distance <= 2)
        const status: SensorStatus = isNear ? 'Alerta' : 'Normal'

        updateSensor('proximity', {
          value: `${distance.toFixed(1)} cm`,
          status,
          detail: isNear
            ? 'Objeto demasiado cercano al sensor de proximidad.'
            : 'No se detectan objetos cercanos de riesgo.'
        })
      }

      window.addEventListener('deviceproximity', syncLegacyProximity as EventListener)
      registerCleanup(() => {
        window.removeEventListener('deviceproximity', syncLegacyProximity as EventListener)
      })
      return
    }

    markUnsupported(
      'proximity',
      'El dispositivo o el WebView no exponen el sensor de proximidad.'
    )
  }

  onMounted(() => {
    console.log('[SensorCheck] Iniciando monitoreo de sensores...')
    
    // Esperar a que Cordova esté listo (si existe)
    const w = window as WindowWithSensorPlugin & { cordova?: any; document?: any }
    if (w.cordova) {
      console.log('[SensorCheck] Cordova detectado, esperando deviceready...')
      const onDeviceReady = () => {
        console.log('[SensorCheck] ¡deviceready! Plugin disponible:', w.SensorCheckNative ? 'SÍ' : 'NO')
        document.removeEventListener('deviceready', onDeviceReady)
        syncLastUpdatedAt()
        startConnectivityTracking()
        startBatteryTracking()
        startGpsTracking()
        startAccelerometerTracking()
        startLightTracking()
        startProximityTracking()
      }
      document.addEventListener('deviceready', onDeviceReady)
    } else {
      console.log('[SensorCheck] Cordova no detectado, iniciando sin plugin nativo')
      // No hay Cordova, iniciar sin plugin nativo
      syncLastUpdatedAt()
      startConnectivityTracking()
      startBatteryTracking()
      startGpsTracking()
      startAccelerometerTracking()
      startLightTracking()
      startProximityTracking()
    }
  })

  onBeforeUnmount(() => {
    cleanupTasks.forEach((cleanup) => cleanup())
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
