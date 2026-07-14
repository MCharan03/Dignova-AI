from google.genai import types

print("--- LiveAudioTranscription Fields ---")
for name, field in types.LiveAudioTranscription.model_fields.items():
    print(f"{name}: {field.annotation}")
