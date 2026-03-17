import requests

# 1. Login as admin to get token
login_url = "http://localhost:8000/api/auth/login"
login_payload = {
    'username': 'admin@hospital.com',
    'password': 'adminpassword'
}
from urllib.parse import urlencode

print("Logging in as admin...")
response = requests.post(
    login_url,
    data=urlencode({'grant_type': 'password', **login_payload}),
    headers={'Content-Type': 'application/x-www-form-urlencoded'}
)

if response.status_code != 200:
    print(f"Login failed: {response.text}")
    exit(1)

token = response.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}

# 2. Test GET /doctors
print("Fetching doctors...")
doctors_res = requests.get("http://localhost:8000/api/auth/doctors", headers=headers)
print(f"GET /doctors Status: {doctors_res.status_code}")
if doctors_res.status_code != 200:
    print(doctors_res.text)

# 3. Test PATCH /doctor-profile
if doctors_res.status_code == 200:
    doctors = doctors_res.json()
    if len(doctors) > 0:
        doc_id = doctors[0]['id']
        print(f"Updating doctor {doc_id}...")
        patch_res = requests.patch(
            f"http://localhost:8000/api/auth/doctor-profile/{doc_id}",
            json={"bio": "Updated bio for testing"},
            headers=headers
        )
        print(f"PATCH Status: {patch_res.status_code}")
        if patch_res.status_code != 200:
            print(patch_res.text)
