from google.genai import types

print("--- AudioTranscriptionConfig Fields ---")
for name, field in types.AudioTranscriptionConfig.model_fields.items():
    print(f"{name}: {field.annotation}")
