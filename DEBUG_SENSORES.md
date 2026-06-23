# Debug de Sensores - Instrucciones

## Paso 1: Ver Logs en Tiempo Real

Abre una terminal y ejecuta:

```bash
adb logcat | grep -E "SensorCheck|Cordova|deviceready|SensorCheckNative"
```

Esto mostrará TODOS los logs del plugin y la app.

## Paso 2: Ver Logs de la Consola del WebView

Abre Developer Tools en Chrome y ve a los logs de la consola. Deberías ver mensajes como:

```
[SensorCheck] Iniciando monitoreo de sensores...
[SensorCheck] Cordova detectado, esperando deviceready...
[SensorCheck] ¡deviceready! Plugin disponible: SÍ
[SensorCheck-GPS] Solicitando permiso de ubicación con plugin nativo...
[SensorCheck-GPS] Respuesta del plugin: granted
[SensorCheck-Light] Iniciando sensor de luz con plugin nativo...
```

## Paso 3: Ejecutar Comandos Manuales en la Consola

Si SensorCheckNative no está disponible, prueba:

```javascript
// En la consola del navegador
console.log('SensorCheckNative:', window.SensorCheckNative)

// Si existe, intenta solicitar el permiso manualmente
if (window.SensorCheckNative) {
  window.SensorCheckNative.requestLocationPermission(
    (result) => console.log('✅ Permiso obtenido:', result),
    (error) => console.log('❌ Error:', error)
  )
}
```

## Paso 4: Verificar que Cordova Existe

```javascript
// En la consola
console.log('Cordova:', typeof window.cordova)
console.log('document.readyState:', document.readyState)
```

## Paso 5: Instalar APK en Modo Debug

Si reconstruiste, asegúrate de instalar la última versión:

```bash
cd mobile
adb uninstall com.sensorcheck.app
cordova build android --debug
adb install platforms/android/app/build/outputs/apk/debug/app-debug.apk
```

El APK debug permite más logging.

## Paso 6: Revisar Permisos en el APK

Asegúrate de que el `AndroidManifest.xml` generado tiene estos permisos:

```bash
adb shell dumpsys package com.sensorcheck.app | grep -A 20 "android.permission.ACCESS"
```

Debería mostrar:
- `android.permission.ACCESS_FINE_LOCATION`
- `android.permission.ACCESS_COARSE_LOCATION`

## Posibles Causas y Soluciones

### 1. Plugin no se encuentra ("undefined")
- **Causa**: El plugin no se instaló correctamente en Cordova
- **Solución**: Reinstalar el plugin
```bash
cd mobile
cordova plugin remove cordova-plugin-sensorcheck-native
cordova plugin add ./plugins/cordova-plugin-sensorcheck-native
cordova build android
```

### 2. "deviceready" nunca se dispara
- **Causa**: El WebView no está inicializando Cordova
- **Solución**: Verificar que `index.html` incluye `cordova.js`
```bash
cat mobile/www/index.html | grep cordova.js
```

### 3. Permiso sigue siendo "Pendiente"
- **Causa**: El callback del plugin no se está ejecutando
- **Solución**: Ver si hay errores en `adb logcat` del lado de Java

### 4. Popup nunca aparece
- **Causa**: Android ya otorgó el permiso o lo rechazó permanentemente
- **Solución**: Resetear permisos de la app
```bash
adb shell pm reset-permissions com.sensorcheck.app
adb uninstall com.sensorcheck.app
adb install platforms/android/app/build/outputs/apk/debug/app-debug.apk
```

## Archivos a Revisar

1. `mobile/plugins/cordova-plugin-sensorcheck-native/www/sensorcheck-native.js` - Puente JavaScript
2. `mobile/plugins/cordova-plugin-sensorcheck-native/src/android/SensorCheckNativePlugin.java` - Implementación Java
3. `mobile/config.xml` - Debe tener `<feature name="SensorCheckNative">` y permisos
4. `app/composables/useSensorCheck.ts` - Lógica Vue (acabamos de actualizar)
