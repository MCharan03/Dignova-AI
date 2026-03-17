import requests

url = "http://localhost:8000/api/auth/login"

payload = {
    'username': 'alex@patient.com',
    'password': 'patient123'
}

print("Sending request to FastAPI...")
response = requests.post(url, data=payload)

print(response.status_code)
print(response.json())
