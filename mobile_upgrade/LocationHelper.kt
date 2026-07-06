package com.dignova.mobile.location

import android.annotation.SuppressLint
import android.content.Context
import android.location.Location
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import com.google.android.gms.tasks.CancellationTokenSource

/**
 * LocationHelper: Handles foreground location tracking for the "Asha Node" Geofencing.
 */
class LocationHelper(private val context: Context) {

    private val fusedLocationClient: FusedLocationProviderClient =
        LocationServices.getFusedLocationProviderClient(context)

    // Hospital Coordinates (Default: Dignova Core Node)
    private val HOSPITAL_LAT = 17.4486 
    private val HOSPITAL_LON = 78.3908
    private val GEOFENCE_RADIUS_METERS = 500f

    @SuppressLint("MissingPermission")
    fun checkGeofenceStatus(onNearHospital: () -> Unit) {
        val cts = CancellationTokenSource()
        
        fusedLocationClient.getCurrentLocation(
            Priority.PRIORITY_HIGH_ACCURACY,
            cts.token
        ).addOnSuccessListener { location: Location? ->
            location?.let {
                val results = FloatArray(1)
                Location.distanceBetween(
                    it.latitude, it.longitude,
                    HOSPITAL_LAT, HOSPITAL_LON,
                    results
                )
                
                if (results[0] < GEOFENCE_RADIUS_METERS) {
                    onNearHospital()
                }
            }
        }
    }
}
