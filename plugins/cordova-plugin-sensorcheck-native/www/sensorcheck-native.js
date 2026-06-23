var exec = require('cordova/exec')

module.exports = {
  getCurrentLocation: function (success, error) {
    exec(success, error, 'SensorCheckNative', 'getCurrentLocation', [])
  },

  getLocationPermissionStatus: function (success, error) {
    exec(success, error, 'SensorCheckNative', 'getLocationPermissionStatus', [])
  },

  requestLocationPermission: function (success, error) {
    exec(success, error, 'SensorCheckNative', 'requestLocationPermission', [])
  },

  isLocationEnabled: function (success, error) {
    exec(success, error, 'SensorCheckNative', 'isLocationEnabled', [])
  },

  startLightUpdates: function (success, error) {
    exec(success, error, 'SensorCheckNative', 'startLightUpdates', [])
  },

  stopLightUpdates: function (success, error) {
    exec(success, error, 'SensorCheckNative', 'stopLightUpdates', [])
  },

  vibrate: function (pattern, success, error) {
    exec(success, error, 'SensorCheckNative', 'vibrate', [pattern])
  }
}
