from google.genai import types
import inspect

print("--- Blob Fields ---")
try:
    for name, field in types.Blob.model_fields.items():
        print(f"{name}: {field.annotation}")
except Exception as e:
    print("Error Blob:", e)
