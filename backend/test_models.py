import os
import requests
import json

api_key = os.getenv("GEMINI_API_KEY")
url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

response = requests.get(url)
models = response.json().get("models", [])
for m in models:
    name = m.get("name")
    if "lite" in name.lower() or "flash" in name.lower() or "3" in name.lower():
        print(name)
