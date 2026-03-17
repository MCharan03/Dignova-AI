import requests

url = "http://localhost:8000/api/auth/login"

payload = 'username=alex%40patient.com&password=patient123'
headers = {
  'Content-Type': 'application/x-www-form-urlencoded'
}

print("Sending request...")
response = requests.request("POST", url, headers=headers, data=payload)

print(response.status_code)
print(response.text)
