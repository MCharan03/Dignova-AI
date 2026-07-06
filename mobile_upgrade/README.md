# Dignova Mobile Upgrade: Sentient OS Layer Components

This folder contains the core Kotlin components needed to upgrade your Android app to the **Sentient OS Layer**.

## Components

1.  **`SensorService.kt`**: Implements **Emotional Telemetry**. It uses the device accelerometer to detect physical stress/jitter.
    *   **Usage**: Initialize in your `ViewModel` and collect the `stressLevel` StateFlow. Include this score in your Gemini API prompts to increase triage urgency.
2.  **`LocationHelper.kt`**: Implements the **Asha Node (Geofencing)**. It tracks location in the foreground.
    *   **Usage**: Call `checkGeofenceStatus` when a triage session starts. If `onNearHospital` triggers, notify the backend to bypass queues.
3.  **`DignovaApi.kt`**: Retrofit interface for connecting to the Python FastAPI backend.
4.  **`DignovaSyncWorker.kt`**: WorkManager class for background synchronization of AI transcripts to the central EHR.

## Integration Steps

1.  **Add Dependencies**: Add the following to your `build.gradle.kts`:
    ```kotlin
    implementation("com.google.android.gms:play-services-location:21.0.1")
    implementation("androidx.work:work-runtime-ktx:2.8.1")
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    ```
2.  **Request Permissions**: Ensure `ACCESS_FINE_LOCATION` and `BODY_SENSORS` (if using HR) are requested in your `AndroidManifest.xml`.
3.  **Update Prompting**: When calling Gemini directly (as per your preference), inject the `stressLevel` from `SensorService` into the system instructions.
    *   *Example*: `"Current user stress telemetry: ${stressLevel.value}. Adjust response tone accordingly."*

## Answering your Question: Gemini CLI & AI Studio
Yes, you can connect the **Gemini CLI** to your **Google AI Studio** account. 
1. Go to Google AI Studio and generate an **API Key**.
2. Set it as an environment variable on your machine:
   * **Windows (PowerShell)**: `$env:GEMINI_API_KEY="your_key_here"`
   * **Linux/Mac**: `export GEMINI_API_KEY="your_key_here"`
3. The Gemini CLI will now use your AI Studio quota and models.
