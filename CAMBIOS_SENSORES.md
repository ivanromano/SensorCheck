# Cambios para Corregir Problemas de Sensores

## Problemas Identificados

1. **GPS: "Permiso pendiente"** - Los permisos de runtime de Android 6+ no se solicitaban correctamente
2. **Luz: "Sin soporte"** - El WebView de Ionic no expone las APIs web de sensores (`AmbientLightSensor`, `ondevicelight`)

## Soluciones Implementadas

### 1. **Composable `useSensorCheck.ts`** ✅

#### Cambios:
- ✅ Agregado tipos TypeScript para el plugin nativo (`SensorCheckNativePlugin`, `CordovaWindow`)
- ✅ Nueva función `getNativePlugin()` para acceder al plugin de forma segura
- ✅ Actualizado `onMounted()` para esperar a evento `deviceready` de Cordova

#### GPS (`startGpsTracking`):
- **Antes**: Usaba `navigator.geolocation` directamente sin solicitar permisos de runtime
- **Ahora**: 
  1. Llama a `plugin.requestLocationPermission()` del plugin nativo
  2. Espera a que se otorguen los permisos
  3. Solo entonces usa `navigator.geolocation.watchPosition()`

#### Luz (`startLightTracking`):
- **Antes**: Intentaba usar `window.AmbientLightSensor` y `window.ondevicelight` (no disponibles en WebView)
- **Ahora**: 
  1. Llama a `plugin.startLightUpdates()` del plugin nativo ← **Esto sí funciona**
  2. Fallback a APIs web solo si el plugin no existe

## Pasos para Probar

### 1. Reconstruir el APK:

```bash
cd mobile
cordova build android --release
```

O con signing automático (si está configurado):
```bash
cordova build android --release -- --keystore=...
```

### 2. Instalar en tu teléfono:

```bash
adb install -r platforms/android/app/build/outputs/apk/release/app-release.apk
```

### 3. Dar Permisos Necesarios:

Es importante que al abrir la app por **primera vez después de instalar**, veas:

- 📍 **Popup de Ubicación**: Presiona "Permitir mientras usas la app"
- 🔦 **Sensor de Luz**: Debería funcionar sin popup (es acceso directo al hardware)

### 4. Pruebas:

1. **GPS (después de darle permisos)**:
   - Presiona botón GPS
   - Debería mostrar coordenadas en lugar de "Permiso pendiente"

2. **Sensor de Luz**:
   - Debería mostrar valores en **LUX** (ej: `250 lux`)
   - Si dice "Sin soporte", significa que tu dispositivo no tiene ese sensor físico
   - Prueba con cambios de brillo para verificar que detecta cambios

## Archivos Modificados

- ✅ `app/composables/useSensorCheck.ts` - Lógica de sensores

## Plugin Nativo

El plugin nativo **ya tiene la implementación correcta**:
- ✅ `onRequestPermissionResult()` - Maneja respuesta de permisos
- ✅ `startLightUpdates()` - Expone sensor de luz de Android
- ✅ `requestLocationPermission()` - Solicita permisos de ubicación

## Información Técnica

- **Requiere**: Android 6.0+ (API 24+) para runtime permissions
- **Sensor de Luz**: Usa `Sensor.TYPE_LIGHT` nativo de Android
- **Ubicación**: Usa `LocationManager` con GPS/Network providers
- **Evento Cordova**: `deviceready` espera a que todos los plugins estén listos

## Próximos Pasos si Sigue Sin Funcionar

Si aún así no funciona después de reconstruir:

1. **Verifica en Terminal**:
```bash
adb logcat | grep -E "SensorCheck|Cordova|GPS|Light"
```

2. **Reinicia después de instalar**:
   El permiso debe solicitarse en el primer inicio

3. **Revisa permisos del dispositivo**:
   Ajustes → Aplicaciones → SensorCheck → Permisos → Ubicación
