(function () {
  if (window.__sensorCheckRuntimeStarted) {
    return
  }

  window.__sensorCheckRuntimeStarted = true

  const sensorDefinitions = [
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

  const initialSensorState = {
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
      value: 'Verificando estado',
      status: 'Normal',
      detail: 'Comprueba si la ubicacion del sistema esta activa y, si das permiso, muestra coordenadas.'
    }
  }

  const state = {
    selectedSensorId: 'light',
    sensors: {},
    lastUpdatedAt: '',
    gpsRequestInFlight: false,
    lightNativeWatchdogId: null,
    vibrationFeedbackTimerId: null,
    runtimeInitialized: false,
    cordovaReady: false
  }

  const cleanupTasks = []
  const lastSensorUpdateAt = {}

  sensorDefinitions.forEach((sensor) => {
    state.sensors[sensor.id] = Object.assign({}, sensor, initialSensorState[sensor.id])
  })

  function formatClockTime() {
    return new Date().toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  function getStatusTone(status) {
    switch (status) {
      case 'Alerta':
        return 'danger'
      case 'Sin soporte':
        return 'neutral'
      default:
        return 'success'
    }
  }

  function describeGpsError(error) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return 'Permiso de ubicacion denegado.'
      case error.POSITION_UNAVAILABLE:
        return 'La ubicacion esta activa, pero no se pudo obtener una posicion valida.'
      case error.TIMEOUT:
        return 'El GPS esta buscando senal y todavia no obtuvo una posicion.'
      default:
        return 'No fue posible acceder a la ubicacion.'
    }
  }

  function describeNativeGpsError(code) {
    switch (code) {
      case 'permission_denied':
        return 'Permiso de ubicacion denegado.'
      case 'location_disabled':
        return 'La ubicacion del sistema esta desactivada en Android.'
      case 'timeout':
        return 'La ubicacion esta activa, pero todavia no se obtuvo un fix del GPS.'
      case 'position_unavailable':
        return 'La ubicacion esta activa, pero no se encontro una posicion valida.'
      default:
        return 'No fue posible acceder a la ubicacion del dispositivo.'
    }
  }

  function updateBadgeClass(element, tone) {
    if (!element) {
      return
    }

    element.classList.remove('success', 'danger', 'neutral')
    element.classList.add(tone)
  }

  function syncHero() {
    const alertCount = Object.values(state.sensors).filter((sensor) => sensor.status === 'Alerta').length
    const alertChip = document.querySelector('[data-alert-chip]')
    const lastUpdated = document.querySelector('[data-last-updated]')

    if (alertChip) {
      alertChip.textContent = alertCount + ' alertas activas'
      alertChip.classList.remove('chip-success', 'chip-warning')
      alertChip.classList.add(alertCount > 0 ? 'chip-warning' : 'chip-success')
    }

    if (lastUpdated) {
      lastUpdated.textContent = 'Actualizado ' + (state.lastUpdatedAt || '--:--:--')
    }
  }

  function syncButtons() {
    const buttons = document.querySelectorAll('[data-sensor-button]')

    buttons.forEach((button) => {
      const sensorId = button.getAttribute('data-sensor-id')
      const sensor = state.sensors[sensorId]

      if (!sensor) {
        return
      }

      button.classList.toggle('active', sensorId === state.selectedSensorId)
      button.classList.toggle('alert', sensor.status === 'Alerta')
      button.setAttribute('aria-pressed', sensorId === state.selectedSensorId ? 'true' : 'false')

      const statusBadge = button.querySelector('[data-sensor-status]')

      if (statusBadge) {
        statusBadge.textContent = sensor.status
        updateBadgeClass(statusBadge, getStatusTone(sensor.status))
      }
    })
  }

  function syncSelectedPanel() {
    const sensor = state.sensors[state.selectedSensorId]

    if (!sensor) {
      return
    }

    const name = document.querySelector('[data-selected-sensor-name]')
    const description = document.querySelector('[data-selected-sensor-description]')
    const status = document.querySelector('[data-selected-sensor-status]')
    const value = document.querySelector('[data-selected-sensor-value]')
    const sensorState = document.querySelector('[data-selected-sensor-state]')
    const detail = document.querySelector('[data-selected-sensor-detail]')

    if (name) {
      name.textContent = sensor.name
    }

    if (description) {
      description.textContent = sensor.description
    }

    if (status) {
      status.textContent = sensor.status
      updateBadgeClass(status, getStatusTone(sensor.status))
    }

    if (value) {
      value.textContent = sensor.value
    }

    if (sensorState) {
      sensorState.textContent = sensor.status
    }

    if (detail) {
      detail.textContent = sensor.detail
    }
  }

  function syncAll() {
    syncHero()
    syncButtons()
    syncSelectedPanel()
  }

  function setLastUpdated() {
    state.lastUpdatedAt = formatClockTime()
  }

  function updateSensor(sensorId, next, minIntervalMs) {
    const now = Date.now()
    const lastUpdate = lastSensorUpdateAt[sensorId] || 0

    if (minIntervalMs && now - lastUpdate < minIntervalMs) {
      return
    }

    lastSensorUpdateAt[sensorId] = now
    state.sensors[sensorId] = Object.assign({}, state.sensors[sensorId], next)
    setLastUpdated()
    syncAll()
  }

  function markUnsupported(sensorId, detail) {
    updateSensor(sensorId, {
      value: 'No disponible',
      status: 'Sin soporte',
      detail: detail
    })
  }

  function hasNativeBridge() {
    return state.cordovaReady && window.SensorCheckNative
  }

  function isCordovaDeviceReady() {
    if (!window.cordova || typeof window.cordova.require !== 'function') {
      return false
    }

    try {
      const channel = window.cordova.require('cordova/channel')
      return Boolean(channel && channel.onDeviceReady && channel.onDeviceReady.state === 2)
    } catch (error) {
      return false
    }
  }

  function activateCordovaBridge() {
    if (state.cordovaReady || !window.SensorCheckNative) {
      return
    }

    state.cordovaReady = true
    document.documentElement.setAttribute('data-sensorcheck-bridge', 'cordova')

    if (!state.runtimeInitialized) {
      return
    }

    startLightTracking()

    if (state.selectedSensorId === 'gps' && !state.gpsRequestInFlight) {
      startGpsTracking()
    }
  }

  function checkLocationEnabled(callback, options) {
    const settings = Object.assign(
      {
        allowNative: true,
        timeoutMs: 1500
      },
      options
    )

    if (
      !settings.allowNative ||
      !hasNativeBridge() ||
      typeof window.SensorCheckNative.isLocationEnabled !== 'function'
    ) {
      callback(null)
      return
    }

    let settled = false
    const timeoutId = window.setTimeout(function () {
      if (settled) {
        return
      }

      settled = true
      callback(null)
    }, settings.timeoutMs)

    window.SensorCheckNative.isLocationEnabled(
      function (enabled) {
        if (settled) {
          return
        }

        settled = true
        window.clearTimeout(timeoutId)
        callback(Boolean(enabled))
      },
      function () {
        if (settled) {
          return
        }

        settled = true
        window.clearTimeout(timeoutId)
        callback(null)
      }
    )
  }

  function setVibrationFeedback(message) {
    const feedback = document.querySelector('[data-vibration-feedback]')

    if (feedback) {
      feedback.textContent = message
    }
  }

  function selectSensor(sensorId) {
    if (!state.sensors[sensorId]) {
      return
    }

    state.selectedSensorId = sensorId
    syncButtons()
    syncSelectedPanel()

    if (sensorId === 'gps') {
      startGpsTracking()
    }
  }

  function registerCleanup(cleanup) {
    cleanupTasks.push(cleanup)
  }

  function startConnectivityTracking() {
    function syncConnectivity() {
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
    registerCleanup(function () {
      window.removeEventListener('online', syncConnectivity)
      window.removeEventListener('offline', syncConnectivity)
    })
  }

  function startBatteryTracking() {
    if (!navigator.getBattery) {
      markUnsupported(
        'battery',
        'El navegador del dispositivo no expone la API de bateria en este WebView.'
      )
      return
    }

    navigator.getBattery().then(function (battery) {
      function syncBattery() {
        const level = Math.round(battery.level * 100)
        const chargingLabel = battery.charging ? ' cargando' : ''

        updateSensor('battery', {
          value: level + '%' + chargingLabel,
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
      registerCleanup(function () {
        battery.removeEventListener('levelchange', syncBattery)
        battery.removeEventListener('chargingchange', syncBattery)
      })
    }).catch(function () {
      markUnsupported('battery', 'No se pudo leer el estado de la bateria del dispositivo.')
    })
  }

  function startGpsTracking() {
    if (state.gpsRequestInFlight) {
      return
    }

    state.gpsRequestInFlight = true
    let nativeGpsWatchdogId = null
    let locationEnabledState = null
    let bridgeWaitIntervalId = null
    let bridgeWaitTimeoutId = null

    function finishGpsRequest() {
      if (bridgeWaitIntervalId) {
        window.clearInterval(bridgeWaitIntervalId)
        bridgeWaitIntervalId = null
      }

      if (bridgeWaitTimeoutId) {
        window.clearTimeout(bridgeWaitTimeoutId)
        bridgeWaitTimeoutId = null
      }

      state.gpsRequestInFlight = false
    }

    function requestNativeCoordinates() {
      nativeGpsWatchdogId = window.setTimeout(function () {
        if (!state.gpsRequestInFlight) {
          return
        }

        finishGpsRequest()

        if (locationEnabledState === true) {
          showGpsEnabled(
            'La ubicacion del sistema esta activada, pero no se obtuvo una posicion en este momento.'
          )
          return
        }

        startWebGpsFallback({ skipLocationEnabledCheck: true })
      }, 7000)

      if (locationEnabledState !== true) {
        updateSensor('gps', {
          value: 'Solicitando permiso...',
          status: 'Normal',
          detail: 'Android puede pedir permiso de ubicacion la primera vez.'
        })
      }

      try {
        window.SensorCheckNative.getCurrentLocation(handleNativeGpsSuccess, handleNativeGpsError)
      } catch (error) {
        if (nativeGpsWatchdogId) {
          window.clearTimeout(nativeGpsWatchdogId)
          nativeGpsWatchdogId = null
        }

        finishGpsRequest()
        startWebGpsFallback({ skipLocationEnabledCheck: true, preserveEnabledState: true })
      }
    }

    function requestNativeLocationPermission() {
      let settled = false
      const permissionWatchdogId = window.setTimeout(function () {
        if (settled) {
          return
        }

        settled = true
        finishGpsRequest()
        updateSensor('gps', {
          value: 'Permiso pendiente',
          status: 'Alerta',
          detail:
            'Android no devolvio el permiso de ubicacion. Si no aparece el popup, habilitalo manualmente en Ajustes > Apps > SensorCheck > Permisos.'
        })
      }, 5000)

      updateSensor('gps', {
        value: 'Solicitando permiso...',
        status: 'Normal',
        detail: 'Android deberia mostrar un permiso para acceder a tu ubicacion.'
      })

      try {
        window.SensorCheckNative.requestLocationPermission(
          function () {
            if (settled) {
              return
            }

            settled = true
            window.clearTimeout(permissionWatchdogId)
            requestNativeCoordinates()
          },
          function () {
            if (settled) {
              return
            }

            settled = true
            window.clearTimeout(permissionWatchdogId)
            finishGpsRequest()

            updateSensor('gps', {
              value: 'Permiso denegado',
              status: 'Alerta',
              detail:
                'No se concedio el permiso de ubicacion. Si no aparece el popup, habilitalo manualmente en Ajustes > Apps > SensorCheck > Permisos.'
            })
          }
        )
      } catch (error) {
        if (!settled) {
          settled = true
          window.clearTimeout(permissionWatchdogId)
        }

        finishGpsRequest()
        startWebGpsFallback({ preserveEnabledState: locationEnabledState === true })
      }
    }

    function showGpsEnabled(detail) {
      updateSensor('gps', {
        value: 'Activado',
        status: 'Normal',
        detail: detail
      })
    }

    function showGpsDisabled() {
      updateSensor('gps', {
        value: 'Desactivado',
        status: 'Alerta',
        detail: 'La ubicacion del sistema esta desactivada en Android.'
      })
    }

    function handleNativeGpsSuccess(payload) {
      if (nativeGpsWatchdogId) {
        window.clearTimeout(nativeGpsWatchdogId)
      }

      finishGpsRequest()

      const latitude = Number((payload && payload.latitude) || 0)
      const longitude = Number((payload && payload.longitude) || 0)
      const accuracy = Number((payload && payload.accuracy) || 0)
      const source = payload && payload.source === 'last_known' ? 'last_known' : 'live'
      const sourceDetail =
        source === 'last_known'
          ? 'Usando la ultima posicion conocida del dispositivo.'
          : 'Ubicacion activa obtenida desde Android.'

      updateSensor('gps', {
        value: latitude.toFixed(5) + ', ' + longitude.toFixed(5),
        status: 'Normal',
        detail:
          sourceDetail + ' Precision aproximada de ' + Math.round(accuracy || 0) + ' m.'
      })
    }

    function handleNativeGpsError(error) {
      if (nativeGpsWatchdogId) {
        window.clearTimeout(nativeGpsWatchdogId)
      }

      finishGpsRequest()

      const code = typeof error === 'string' ? error : ''
      const detail = describeNativeGpsError(code)

      if (code === 'location_disabled') {
        showGpsDisabled()
        return
      }

      if (code === 'permission_denied' && locationEnabledState === true) {
        showGpsEnabled(
          'La ubicacion del sistema esta activada, pero la app no tiene permiso para leer coordenadas.'
        )
        return
      }

      if (code === 'permission_denied') {
        updateSensor('gps', {
          value: 'Permiso denegado',
          status: 'Alerta',
          detail: detail
        })
        return
      }

      if (locationEnabledState === true) {
        showGpsEnabled(
          code === 'timeout'
            ? 'La ubicacion del sistema esta activada, pero todavia no se obtuvo un fix del GPS.'
            : 'La ubicacion del sistema esta activada, pero no se encontro una posicion valida.'
        )
        return
      }

      showGpsEnabled(
        code === 'timeout'
          ? 'No se obtuvo un fix del GPS, pero la ubicacion del dispositivo parece estar disponible.'
          : detail
      )
    }

    function startWebGpsFallback(options) {
      const fallbackOptions = Object.assign(
        {
          skipLocationEnabledCheck: false,
          preserveEnabledState: false
        },
        options
      )

      if (!navigator.geolocation) {
        finishGpsRequest()

        if (fallbackOptions.preserveEnabledState) {
          showGpsEnabled(
            'La ubicacion del sistema esta activada, pero este WebView no permite leer coordenadas.'
          )
          return
        }

        markUnsupported('gps', 'La ubicacion no esta disponible en este dispositivo o WebView.')
        return
      }

      function beginLocationRequest(locationEnabled) {
        if (locationEnabled === false) {
          finishGpsRequest()
          showGpsDisabled()
          return
        }

        if (fallbackOptions.preserveEnabledState || locationEnabled === true) {
          showGpsEnabled(
            'La ubicacion del sistema esta activada. Intentando leer coordenadas del dispositivo.'
          )
        } else {
          updateSensor('gps', {
            value: 'Buscando senal...',
            status: 'Normal',
            detail:
              'Esperando una lectura del GPS. Si tarda, intenta moverte cerca de una ventana o al exterior.'
          })
        }

        navigator.geolocation.getCurrentPosition(
          function (position) {
            finishGpsRequest()

            const coords = position.coords
            const accuracyLabel = Math.round(coords.accuracy)

            updateSensor('gps', {
              value: coords.latitude.toFixed(5) + ', ' + coords.longitude.toFixed(5),
              status: 'Normal',
              detail: 'Ubicacion activa con una precision aproximada de ' + accuracyLabel + ' m.'
            })
          },
          function (error) {
            finishGpsRequest()

            if (error.code === error.PERMISSION_DENIED) {
              if (fallbackOptions.preserveEnabledState || locationEnabled === true) {
                showGpsEnabled(
                  'La ubicacion del sistema esta activada, pero la app no tiene permiso para leer coordenadas.'
                )
                return
              }

              updateSensor('gps', {
                value: 'Permiso denegado',
                status: 'Alerta',
                detail: describeGpsError(error)
              })
              return
            }

            checkLocationEnabled(function (enabled) {
              if (enabled === false) {
                showGpsDisabled()
                return
              }

              if (fallbackOptions.preserveEnabledState || locationEnabled === true) {
                showGpsEnabled(
                  error.code === error.TIMEOUT
                    ? 'La ubicacion del sistema esta activada, pero todavia no se obtuvo un fix del GPS.'
                    : 'La ubicacion del sistema esta activada, pero no se encontro una posicion valida.'
                )
                return
              }

              showGpsEnabled(
                error.code === error.TIMEOUT
                  ? 'No se obtuvo un fix del GPS, pero la ubicacion del dispositivo parece estar disponible.'
                  : describeGpsError(error)
              )
            })
          },
          {
            enableHighAccuracy: true,
            maximumAge: 10000,
            timeout: 20000
          }
        )
      }

      if (fallbackOptions.skipLocationEnabledCheck) {
        beginLocationRequest(fallbackOptions.preserveEnabledState ? true : null)
        return
      }

      checkLocationEnabled(beginLocationRequest)
    }

    if (window.cordova && !state.cordovaReady) {
      updateSensor('gps', {
        value: 'Preparando GPS...',
        status: 'Normal',
        detail: 'Esperando a que Cordova termine de inicializar los plugins nativos.'
      })

      bridgeWaitIntervalId = window.setInterval(function () {
        if (!state.cordovaReady) {
          return
        }

        finishGpsRequest()
        startGpsTracking()
      }, 250)

      bridgeWaitTimeoutId = window.setTimeout(function () {
        if (state.cordovaReady) {
          return
        }

        finishGpsRequest()
        startWebGpsFallback()
      }, 4000)

      return
    }

    checkLocationEnabled(
      function (enabled) {
        locationEnabledState = enabled

        if (enabled === false) {
          finishGpsRequest()
          showGpsDisabled()
          return
        }

        if (enabled === true) {
          showGpsEnabled(
            'La ubicacion del sistema esta activada. Intentando leer coordenadas del dispositivo.'
          )
        }

        if (
          hasNativeBridge() &&
          typeof window.SensorCheckNative.getCurrentLocation === 'function' &&
          typeof window.SensorCheckNative.requestLocationPermission === 'function'
        ) {
          requestNativeLocationPermission()
          return
        }

        startWebGpsFallback({ preserveEnabledState: enabled === true })
      },
      {
        timeoutMs: 1500
      }
    )
  }

  function startAccelerometerTracking() {
    if (!('DeviceMotionEvent' in window)) {
      markUnsupported('accelerometer', 'El acelerometro no esta disponible en este dispositivo.')
      return
    }

    let receivedReading = false

    function syncMotion(event) {
      receivedReading = true

      const sample = event.acceleration || event.accelerationIncludingGravity || {}
      const x = Number(sample.x || 0)
      const y = Number(sample.y || 0)
      const z = Number(sample.z || 0)
      const magnitude = Math.sqrt(x * x + y * y + z * z)
      const status = magnitude >= 18 ? 'Alerta' : 'Normal'

      updateSensor(
        'accelerometer',
        {
          value: magnitude.toFixed(1) + ' m/s2',
          status: status,
          detail:
            status === 'Alerta'
              ? 'Movimiento brusco detectado por el acelerometro.'
              : 'Movimiento dentro de los rangos esperados.'
        },
        250
      )
    }

    const timerId = window.setTimeout(function () {
      if (!receivedReading) {
        markUnsupported(
          'accelerometer',
          'No se recibieron eventos de movimiento desde el acelerometro.'
        )
      }
    }, 5000)

    window.addEventListener('devicemotion', syncMotion)
    registerCleanup(function () {
      window.clearTimeout(timerId)
      window.removeEventListener('devicemotion', syncMotion)
    })
  }

  function startLightTracking() {
    if (hasNativeBridge() && typeof window.SensorCheckNative.startLightUpdates === 'function') {
      let receivedNativeReading = false

      if (state.lightNativeWatchdogId) {
        window.clearTimeout(state.lightNativeWatchdogId)
      }

      state.lightNativeWatchdogId = window.setTimeout(function () {
        if (receivedNativeReading) {
          return
        }

        startLightTrackingFallback()
      }, 7000)

      window.SensorCheckNative.startLightUpdates(
        function (payload) {
          receivedNativeReading = true

          if (state.lightNativeWatchdogId) {
            window.clearTimeout(state.lightNativeWatchdogId)
            state.lightNativeWatchdogId = null
          }

          const lux = Number((payload && payload.illuminance) || 0)
          const status = lux < 80 || lux > 900 ? 'Alerta' : 'Normal'

          updateSensor('light', {
            value: lux.toFixed(0) + ' lux',
            status: status,
            detail:
              status === 'Alerta'
                ? 'Nivel de luz extremadamente bajo o alto.'
                : 'Nivel de iluminacion adecuada segun el sensor nativo.'
          })
        },
        function () {
          if (state.lightNativeWatchdogId) {
            window.clearTimeout(state.lightNativeWatchdogId)
            state.lightNativeWatchdogId = null
          }

          startLightTrackingFallback()
        }
      )

      registerCleanup(function () {
        if (state.lightNativeWatchdogId) {
          window.clearTimeout(state.lightNativeWatchdogId)
          state.lightNativeWatchdogId = null
        }

        if (window.SensorCheckNative && typeof window.SensorCheckNative.stopLightUpdates === 'function') {
          window.SensorCheckNative.stopLightUpdates(function () {}, function () {})
        }
      })
      return
    }

    startLightTrackingFallback()
  }

  function startLightTrackingFallback() {
    if (window.AmbientLightSensor) {
      try {
        const sensor = new window.AmbientLightSensor({ frequency: 1 })

        function syncLight() {
          const lux = Number(sensor.illuminance || 0)
          const status = lux < 80 || lux > 900 ? 'Alerta' : 'Normal'

          updateSensor('light', {
            value: lux.toFixed(0) + ' lux',
            status: status,
            detail:
              status === 'Alerta'
                ? 'Nivel de luz extremadamente bajo o alto.'
                : 'Nivel de iluminacion adecuado.'
          })
        }

        function onError() {
          markUnsupported('light', 'No fue posible iniciar el sensor de luz ambiental.')
        }

        sensor.addEventListener('reading', syncLight)
        sensor.addEventListener('error', onError)
        sensor.start()
        registerCleanup(function () {
          sensor.removeEventListener('reading', syncLight)
          sensor.removeEventListener('error', onError)
          if (sensor.stop) {
            sensor.stop()
          }
        })
        return
      } catch (error) {
        markUnsupported('light', 'El sensor de luz ambiental no se pudo iniciar en este WebView.')
        return
      }
    }

    if ('ondevicelight' in window) {
      function syncLegacyLight(event) {
        const lux = Number(event.value || 0)
        const status = lux < 80 || lux > 900 ? 'Alerta' : 'Normal'

        updateSensor('light', {
          value: lux.toFixed(0) + ' lux',
          status: status,
          detail:
            status === 'Alerta'
              ? 'Nivel de luz extremadamente bajo o alto.'
              : 'Nivel de iluminacion adecuado.'
        })
      }

      window.addEventListener('devicelight', syncLegacyLight)
      registerCleanup(function () {
        window.removeEventListener('devicelight', syncLegacyLight)
      })
      return
    }

    markUnsupported('light', 'El dispositivo o el WebView no exponen el sensor de luz ambiental.')
  }

  function startProximityTracking() {
    if (window.ProximitySensor) {
      try {
        const sensor = new window.ProximitySensor({ frequency: 2 })

        function syncProximity() {
          const distance = Number(sensor.distance || 0)
          const isNear = Boolean(sensor.near || distance <= 2)
          const status = isNear ? 'Alerta' : 'Normal'

          updateSensor('proximity', {
            value: distance.toFixed(1) + ' cm',
            status: status,
            detail: isNear
              ? 'Objeto demasiado cercano al sensor de proximidad.'
              : 'No se detectan objetos cercanos de riesgo.'
          })
        }

        function onError() {
          markUnsupported('proximity', 'No fue posible iniciar el sensor de proximidad.')
        }

        sensor.addEventListener('reading', syncProximity)
        sensor.addEventListener('error', onError)
        sensor.start()
        registerCleanup(function () {
          sensor.removeEventListener('reading', syncProximity)
          sensor.removeEventListener('error', onError)
          if (sensor.stop) {
            sensor.stop()
          }
        })
        return
      } catch (error) {
        markUnsupported(
          'proximity',
          'El sensor de proximidad no se pudo iniciar en este WebView.'
        )
        return
      }
    }

    if ('ondeviceproximity' in window) {
      function syncLegacyProximity(event) {
        const distance = Number(event.distance || event.value || 0)
        const isNear = Boolean(event.near || distance <= 2)
        const status = isNear ? 'Alerta' : 'Normal'

        updateSensor('proximity', {
          value: distance.toFixed(1) + ' cm',
          status: status,
          detail: isNear
            ? 'Objeto demasiado cercano al sensor de proximidad.'
            : 'No se detectan objetos cercanos de riesgo.'
        })
      }

      window.addEventListener('deviceproximity', syncLegacyProximity)
      registerCleanup(function () {
        window.removeEventListener('deviceproximity', syncLegacyProximity)
      })
      return
    }

    markUnsupported('proximity', 'El dispositivo o el WebView no exponen el sensor de proximidad.')
  }

  function bindButtons() {
    const buttons = document.querySelectorAll('[data-sensor-button]')

    buttons.forEach(function (button) {
      const sensorId = button.getAttribute('data-sensor-id')
      let lastTapAt = 0

      function triggerSelection(event) {
        const now = Date.now()

        if (now - lastTapAt < 350) {
          return
        }

        lastTapAt = now

        if (event.cancelable) {
          event.preventDefault()
        }

        selectSensor(sensorId)
      }

      button.addEventListener('click', triggerSelection)
      button.addEventListener('touchend', triggerSelection, { passive: false })

      if (window.PointerEvent) {
        button.addEventListener('pointerup', triggerSelection)
      }

      registerCleanup(function () {
        button.removeEventListener('click', triggerSelection)
        button.removeEventListener('touchend', triggerSelection)

        if (window.PointerEvent) {
          button.removeEventListener('pointerup', triggerSelection)
        }
      })
    })
  }

  function bindVibrationButton() {
    const button = document.querySelector('[data-vibration-button]')

    if (!button) {
      return
    }

    function triggerVibration(event) {
      if (event.cancelable) {
        event.preventDefault()
      }

      let vibrationSettled = false
      let vibrationFallbackTriggered = false

      function onVibrationSuccess() {
        vibrationSettled = true
        setVibrationFeedback('Vibracion activada')

        if (state.vibrationFeedbackTimerId) {
          window.clearTimeout(state.vibrationFeedbackTimerId)
        }

        state.vibrationFeedbackTimerId = window.setTimeout(function () {
          setVibrationFeedback('Lista para vibrar')
        }, 1800)
      }

      function fallbackToNavigatorVibrate() {
        if (vibrationFallbackTriggered) {
          return
        }

        vibrationFallbackTriggered = true
        vibrationSettled = true

        if (!navigator.vibrate) {
          setVibrationFeedback('La vibracion no esta disponible en este dispositivo')
          return
        }

        navigator.vibrate(420)
        onVibrationSuccess()
      }

      if (hasNativeBridge() && typeof window.SensorCheckNative.vibrate === 'function') {
        const vibrationWatchdogId = window.setTimeout(function () {
          if (!vibrationSettled) {
            fallbackToNavigatorVibrate()
          }
        }, 1200)

        window.SensorCheckNative.vibrate(
          420,
          function () {
            window.clearTimeout(vibrationWatchdogId)
            onVibrationSuccess()
          },
          function () {
            window.clearTimeout(vibrationWatchdogId)
            fallbackToNavigatorVibrate()
          }
        )
        return
      }

      fallbackToNavigatorVibrate()
    }

    button.addEventListener('click', triggerVibration)
    button.addEventListener('touchend', triggerVibration, { passive: false })

    if (window.PointerEvent) {
      button.addEventListener('pointerup', triggerVibration)
    }

    registerCleanup(function () {
      button.removeEventListener('click', triggerVibration)
      button.removeEventListener('touchend', triggerVibration)

      if (window.PointerEvent) {
        button.removeEventListener('pointerup', triggerVibration)
      }
    })
  }

  function init() {
    if (state.runtimeInitialized) {
      return
    }

    state.runtimeInitialized = true
    bindButtons()
    bindVibrationButton()
    setLastUpdated()
    syncAll()

    startConnectivityTracking()
    startBatteryTracking()
    startAccelerometerTracking()
    startLightTracking()
    startProximityTracking()

    document.documentElement.setAttribute(
      'data-sensorcheck-bridge',
      state.cordovaReady ? 'cordova' : 'web'
    )
    document.documentElement.setAttribute('data-sensorcheck-runtime', 'ready')
  }

  function boot() {
    init()

    if (!window.cordova) {
      document.documentElement.setAttribute('data-sensorcheck-bridge', 'web')
      return
    }

    if (isCordovaDeviceReady()) {
      activateCordovaBridge()
      return
    }

    document.documentElement.setAttribute('data-sensorcheck-bridge', 'waiting')

    document.addEventListener(
      'deviceready',
      function () {
        window.setTimeout(function () {
          activateCordovaBridge()
        }, 150)
      },
      { once: true }
    )
  }

  if (document.readyState === 'complete') {
    boot()
  } else {
    window.addEventListener('load', boot, { once: true })
  }

  window.addEventListener('beforeunload', function () {
    cleanupTasks.forEach(function (cleanup) {
      cleanup()
    })
  })
})()
