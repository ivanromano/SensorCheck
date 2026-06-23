package app.sensorcheck.plugin;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.CancellationSignal;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

import androidx.annotation.NonNull;

import org.apache.cordova.CallbackContext;
import org.apache.cordova.CordovaPlugin;
import org.apache.cordova.PermissionHelper;
import org.apache.cordova.PluginResult;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.concurrent.Executor;

public class SensorCheckNativePlugin extends CordovaPlugin implements SensorEventListener {
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 4101;
    private static final long LOCATION_TIMEOUT_MS = 20000L;
    private static final String[] LOCATION_PERMISSIONS =
            new String[] {
                Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION
            };

    private CallbackContext lightUpdatesCallback;
    private CallbackContext pendingLocationCallback;
    private CallbackContext pendingPermissionCallback;
    private CancellationSignal pendingLocationCancellationSignal;
    private Handler mainHandler;
    private LocationListener pendingLocationListener;
    private Runnable pendingLocationTimeout;
    private boolean continueLocationAfterPermissionGrant;
    private Sensor lightSensor;
    private SensorManager sensorManager;

    @Override
    public boolean execute(String action, JSONArray args, CallbackContext callbackContext) throws JSONException {
        switch (action) {
            case "getCurrentLocation":
                getCurrentLocation(callbackContext);
                return true;
            case "getLocationPermissionStatus":
                callbackContext.success(hasLocationPermission() ? "granted" : "missing");
                return true;
            case "requestLocationPermission":
                requestLocationPermission(callbackContext);
                return true;
            case "isLocationEnabled":
                callbackContext.success(isLocationEnabled() ? 1 : 0);
                return true;
            case "startLightUpdates":
                startLightUpdates(callbackContext);
                return true;
            case "stopLightUpdates":
                stopLightUpdates();
                callbackContext.success();
                return true;
            case "vibrate":
                vibrate(args, callbackContext);
                return true;
            default:
                return false;
        }
    }

    private void getCurrentLocation(@NonNull CallbackContext callbackContext) {
        if (!isLocationEnabled()) {
            callbackContext.error("location_disabled");
            return;
        }

        if (!hasLocationPermission()) {
            requestLocationPermissions(callbackContext, true);
            return;
        }

        runOnUiThread(
                new Runnable() {
                    @Override
                    public void run() {
                        resolveCurrentLocation(callbackContext);
                    }
                });
    }

    private void requestLocationPermission(@NonNull CallbackContext callbackContext) {
        if (hasLocationPermission()) {
            callbackContext.success("granted");
            return;
        }

        requestLocationPermissions(callbackContext, false);
    }

    private boolean isLocationEnabled() {
        LocationManager locationManager = getLocationManager();

        if (locationManager == null) {
            return false;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            return locationManager.isLocationEnabled();
        }

        try {
            return locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)
                    || locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER);
        } catch (Exception exception) {
            return false;
        }
    }

    private boolean hasLocationPermission() {
        return PermissionHelper.hasPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                || PermissionHelper.hasPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION);
    }

    private LocationManager getLocationManager() {
        Context context = cordova.getContext();
        return (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
    }

    private void requestLocationPermissions(
            @NonNull CallbackContext callbackContext, boolean resolveLocationAfterGrant) {
        stopPendingLocationRequest();
        pendingPermissionCallback = callbackContext;
        continueLocationAfterPermissionGrant = resolveLocationAfterGrant;

        if (resolveLocationAfterGrant) {
            pendingLocationCallback = callbackContext;
        }

        keepCallbackOpen(callbackContext);

        runOnUiThread(
                new Runnable() {
                    @Override
                    public void run() {
                        PermissionHelper.requestPermissions(
                                SensorCheckNativePlugin.this,
                                LOCATION_PERMISSION_REQUEST_CODE,
                                LOCATION_PERMISSIONS);
                    }
                });
    }

    private void runOnUiThread(@NonNull Runnable runnable) {
        if (cordova.getActivity() != null) {
            cordova.getActivity().runOnUiThread(runnable);
            return;
        }

        if (mainHandler == null) {
            mainHandler = new Handler(Looper.getMainLooper());
        }

        mainHandler.post(runnable);
    }

    private void resolveCurrentLocation(@NonNull CallbackContext callbackContext) {
        pendingLocationCallback = null;
        LocationManager locationManager = getLocationManager();

        if (locationManager == null) {
            callbackContext.error("location_manager_unavailable");
            return;
        }

        Location lastKnownLocation = getBestLastKnownLocation(locationManager);
        if (lastKnownLocation != null) {
            try {
                callbackContext.success(buildLocationPayload(lastKnownLocation, "last_known"));
            } catch (JSONException exception) {
                callbackContext.error("location_payload_failed");
            }
            return;
        }

        String provider = getBestEnabledProvider(locationManager);
        if (provider == null) {
            callbackContext.error("position_unavailable");
            return;
        }

        stopPendingLocationRequest();
        pendingLocationCallback = callbackContext;
        keepCallbackOpen(callbackContext);

        if (mainHandler == null) {
            mainHandler = new Handler(Looper.getMainLooper());
        }

        pendingLocationTimeout =
                new Runnable() {
                    @Override
                    public void run() {
                        if (pendingLocationCancellationSignal != null) {
                            pendingLocationCancellationSignal.cancel();
                        }
                        deliverLocationError("timeout");
                    }
                };

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            requestCurrentLocationModern(locationManager, provider, callbackContext);
            return;
        }

        requestCurrentLocationLegacy(locationManager, provider, callbackContext);
    }

    private Location getBestLastKnownLocation(@NonNull LocationManager locationManager) {
        Location bestLocation = null;

        for (String provider : locationManager.getProviders(true)) {
            try {
                Location candidate = locationManager.getLastKnownLocation(provider);
                if (candidate == null) {
                    continue;
                }

                if (bestLocation == null || candidate.getTime() > bestLocation.getTime()) {
                    bestLocation = candidate;
                }
            } catch (SecurityException exception) {
                return null;
            }
        }

        return bestLocation;
    }

    private void requestCurrentLocationModern(
            @NonNull LocationManager locationManager,
            @NonNull String provider,
            @NonNull CallbackContext callbackContext) {
        pendingLocationCancellationSignal = new CancellationSignal();

        try {
            locationManager.getCurrentLocation(
                    provider,
                    pendingLocationCancellationSignal,
                    new Executor() {
                        @Override
                        public void execute(@NonNull Runnable command) {
                            runOnUiThread(command);
                        }
                    },
                    location -> {
                        if (location == null) {
                            deliverLocationError("position_unavailable");
                            return;
                        }

                        deliverLocationSuccess(location, "live");
                    });

            mainHandler.postDelayed(pendingLocationTimeout, LOCATION_TIMEOUT_MS);
        } catch (SecurityException exception) {
            stopPendingLocationRequest();
            callbackContext.error("permission_denied");
        } catch (IllegalArgumentException exception) {
            stopPendingLocationRequest();
            callbackContext.error("position_unavailable");
        }
    }

    private void requestCurrentLocationLegacy(
            @NonNull LocationManager locationManager,
            @NonNull String provider,
            @NonNull CallbackContext callbackContext) {
        pendingLocationListener =
                new LocationListener() {
                    @Override
                    public void onLocationChanged(@NonNull Location location) {
                        deliverLocationSuccess(location, "live");
                    }

                    @Override
                    public void onProviderDisabled(@NonNull String disabledProvider) {
                        if (disabledProvider.equals(provider)) {
                            deliverLocationError("location_disabled");
                        }
                    }

                    @Override
                    public void onStatusChanged(String providerName, int status, Bundle extras) {
                        // No-op.
                    }
                };

        try {
            locationManager.requestLocationUpdates(
                    provider, 0L, 0f, pendingLocationListener, Looper.getMainLooper());
            mainHandler.postDelayed(pendingLocationTimeout, LOCATION_TIMEOUT_MS);
        } catch (SecurityException exception) {
            stopPendingLocationRequest();
            callbackContext.error("permission_denied");
        } catch (IllegalArgumentException exception) {
            stopPendingLocationRequest();
            callbackContext.error("position_unavailable");
        }
    }

    private String getBestEnabledProvider(@NonNull LocationManager locationManager) {
        try {
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                return LocationManager.NETWORK_PROVIDER;
            }

            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                return LocationManager.GPS_PROVIDER;
            }
        } catch (Exception exception) {
            return null;
        }

        return null;
    }

    private JSONObject buildLocationPayload(@NonNull Location location, @NonNull String source)
            throws JSONException {
        JSONObject payload = new JSONObject();
        payload.put("latitude", location.getLatitude());
        payload.put("longitude", location.getLongitude());
        payload.put("accuracy", location.getAccuracy());
        payload.put("provider", location.getProvider());
        payload.put("source", source);
        return payload;
    }

    private void keepCallbackOpen(@NonNull CallbackContext callbackContext) {
        PluginResult pluginResult = new PluginResult(PluginResult.Status.NO_RESULT);
        pluginResult.setKeepCallback(true);
        callbackContext.sendPluginResult(pluginResult);
    }

    private void deliverLocationSuccess(@NonNull Location location, @NonNull String source) {
        CallbackContext callbackContext = pendingLocationCallback;
        stopPendingLocationRequest();

        if (callbackContext == null) {
            return;
        }

        try {
            callbackContext.success(buildLocationPayload(location, source));
        } catch (JSONException exception) {
            callbackContext.error("location_payload_failed");
        }
    }

    private void deliverLocationError(@NonNull String code) {
        CallbackContext callbackContext = pendingLocationCallback;
        stopPendingLocationRequest();

        if (callbackContext != null) {
            callbackContext.error(code);
        }
    }

    private void stopPendingLocationRequest() {
        LocationManager locationManager = getLocationManager();
        if (locationManager != null && pendingLocationListener != null) {
            locationManager.removeUpdates(pendingLocationListener);
        }

        if (pendingLocationCancellationSignal != null) {
            pendingLocationCancellationSignal.cancel();
        }

        if (mainHandler != null && pendingLocationTimeout != null) {
            mainHandler.removeCallbacks(pendingLocationTimeout);
        }

        pendingLocationCancellationSignal = null;
        pendingLocationListener = null;
        pendingLocationTimeout = null;
        pendingLocationCallback = null;
    }

    private void startLightUpdates(@NonNull CallbackContext callbackContext) {
        if (sensorManager == null) {
            sensorManager =
                    (SensorManager) cordova.getContext().getSystemService(Context.SENSOR_SERVICE);
        }

        if (sensorManager == null) {
            callbackContext.error("sensor_manager_unavailable");
            return;
        }

        lightSensor = sensorManager.getDefaultSensor(Sensor.TYPE_LIGHT);

        if (lightSensor == null) {
            callbackContext.error("light_sensor_unavailable");
            return;
        }

        stopLightUpdates();
        lightUpdatesCallback = callbackContext;

        boolean registered =
                sensorManager.registerListener(this, lightSensor, SensorManager.SENSOR_DELAY_NORMAL);

        if (!registered) {
            lightUpdatesCallback = null;
            callbackContext.error("light_sensor_registration_failed");
            return;
        }

        PluginResult pluginResult = new PluginResult(PluginResult.Status.NO_RESULT);
        pluginResult.setKeepCallback(true);
        callbackContext.sendPluginResult(pluginResult);
    }

    private void stopLightUpdates() {
        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }

        if (lightUpdatesCallback != null) {
            PluginResult pluginResult = new PluginResult(PluginResult.Status.NO_RESULT);
            pluginResult.setKeepCallback(false);
            lightUpdatesCallback.sendPluginResult(pluginResult);
            lightUpdatesCallback = null;
        }
    }

    private void vibrate(JSONArray args, CallbackContext callbackContext) throws JSONException {
        Context context = cordova.getContext();
        long[] pattern = buildPattern(args);

        if (pattern.length == 0) {
            callbackContext.error("invalid_pattern");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vibratorManager =
                    (VibratorManager) context.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);

            if (vibratorManager == null) {
                callbackContext.error("vibrator_unavailable");
                return;
            }

            Vibrator vibrator = vibratorManager.getDefaultVibrator();
            if (vibrator == null || !vibrator.hasVibrator()) {
                callbackContext.error("vibrator_unavailable");
                return;
            }

            vibrateWithEffect(vibrator, pattern);
            callbackContext.success();
            return;
        }

        Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator == null || !vibrator.hasVibrator()) {
            callbackContext.error("vibrator_unavailable");
            return;
        }

        vibrateWithEffect(vibrator, pattern);
        callbackContext.success();
    }

    private long[] buildPattern(JSONArray args) throws JSONException {
        if (args.length() == 0) {
            return new long[0];
        }

        Object firstArg = args.get(0);

        if (firstArg instanceof Number) {
            return new long[] {0L, ((Number) firstArg).longValue()};
        }

        if (firstArg instanceof JSONArray) {
            JSONArray source = (JSONArray) firstArg;
            long[] pattern = new long[source.length()];

            for (int index = 0; index < source.length(); index++) {
                pattern[index] = source.getLong(index);
            }

            return pattern;
        }

        return new long[0];
    }

    private void vibrateWithEffect(Vibrator vibrator, long[] pattern) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            if (pattern.length == 2 && pattern[0] == 0L) {
                vibrator.vibrate(
                        VibrationEffect.createOneShot(
                                pattern[1], VibrationEffect.DEFAULT_AMPLITUDE));
                return;
            }

            vibrator.vibrate(
                    VibrationEffect.createWaveform(pattern, -1));
            return;
        }

        if (pattern.length == 2 && pattern[0] == 0L) {
            vibrator.vibrate(pattern[1]);
            return;
        }

        vibrator.vibrate(pattern, -1);
    }

    @Override
    public void onRequestPermissionResult(
            int requestCode, String[] permissions, int[] grantResults) throws JSONException {
        if (requestCode != LOCATION_PERMISSION_REQUEST_CODE) {
            super.onRequestPermissionResult(requestCode, permissions, grantResults);
            return;
        }

        CallbackContext callbackContext = pendingPermissionCallback;
        boolean shouldResolveLocation = continueLocationAfterPermissionGrant;
        pendingPermissionCallback = null;
        continueLocationAfterPermissionGrant = false;

        if (callbackContext == null) {
            return;
        }

        boolean granted = false;

        for (int grantResult : grantResults) {
            if (grantResult == PackageManager.PERMISSION_GRANTED) {
                granted = true;
                break;
            }
        }

        granted = granted || hasLocationPermission();

        if (!granted) {
            stopPendingLocationRequest();
            callbackContext.error("permission_denied");
            return;
        }

        if (!shouldResolveLocation) {
            pendingLocationCallback = null;
            callbackContext.success("granted");
            return;
        }

        runOnUiThread(
                new Runnable() {
                    @Override
                    public void run() {
                        resolveCurrentLocation(callbackContext);
                    }
                });
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (lightUpdatesCallback == null || event.sensor.getType() != Sensor.TYPE_LIGHT) {
            return;
        }

        try {
            JSONObject payload = new JSONObject();
            payload.put("illuminance", event.values[0]);

            PluginResult pluginResult = new PluginResult(PluginResult.Status.OK, payload);
            pluginResult.setKeepCallback(true);
            lightUpdatesCallback.sendPluginResult(pluginResult);
        } catch (JSONException exception) {
            lightUpdatesCallback.error("light_sensor_payload_failed");
            stopLightUpdates();
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // No-op.
    }

    @Override
    public void onPause(boolean multitasking) {
        stopLightUpdates();
        stopPendingLocationRequest();
        super.onPause(multitasking);
    }

    @Override
    public void onDestroy() {
        stopLightUpdates();
        stopPendingLocationRequest();
        super.onDestroy();
    }
}
