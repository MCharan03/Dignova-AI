package com.dignova.mobile.api

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.Header
import retrofit2.http.POST

/**
 * DignovaApi: Retrofit interface for the Python FastAPI backend.
 */
interface DignovaApi {
    
    @POST("/api/hospital/calls")
    suspend fun syncCall(
        @Header("Authorization") token: String,
        @Body callRequest: CallSyncRequest
    ): Response<Unit>

    @POST("/api/hospital/geofence")
    suspend fun triggerGeofence(
        @Header("Authorization") token: String,
        @Body location: Map<String, Double>
    ): Response<Unit>
}

data class CallSyncRequest(
    val transcript: String,
    val severity: String,
    val diagnosis: String,
    val source: String = "android_mobile"
)
