package com.dignova.mobile.telemetry

import android.content.Context
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlin.math.sqrt

/**
 * SensorService: Implements the "Sentient OS Layer" emotional telemetry on mobile.
 * Detects physical stress/jitter using the device's Accelerometer (IMU).
 */
class SensorService(context: Context) : SensorEventListener {

    private val sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    private val accelerometer = sensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)

    private val _stressLevel = MutableStateFlow(0f)
    val stressLevel: StateFlow<Float> = _stressLevel

    private var lastX = 0f
    private var lastY = 0f
    private var lastZ = 0f
    private var smoothingFactor = 0.1f // EMA smoothing

    fun startTracking() {
        accelerometer?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_UI)
        }
    }

    fun stopTracking() {
        sensorManager.unregisterListener(this)
    }

    override fun onSensorChanged(event: SensorEvent?) {
        if (event?.sensor?.type == Sensor.TYPE_ACCELEROMETER) {
            val x = event.values[0]
            val y = event.values[1]
            val z = event.values[2]

            // Calculate delta (jitter)
            val delta = sqrt((x - lastX) * (x - lastX) + (y - lastY) * (y - lastY) + (z - lastZ) * (z - lastZ))
            
            // Normalize and smooth jitter to a 0.0 - 1.0 stress score
            // Threshold of 2.0 is typical for "micro-jitters"
            val rawStress = (delta / 5f).coerceIn(0f, 1f)
            
            _stressLevel.value = (_stressLevel.value * (1 - smoothingFactor)) + (rawStress * smoothingFactor)

            lastX = x
            lastY = y
            lastZ = z
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {
        // Not needed for this implementation
    }
}
