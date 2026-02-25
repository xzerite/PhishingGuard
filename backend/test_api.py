import requests
# Dummy comment to trigger re-scan
import json

BASE_URL = "http://localhost:8000"

test_urls = [
    {"url": "https://www.google.com", "expected": False},
    {"url": "http://paypa1-security-update.com", "expected": True},
    {"url": "https://bit.ly/random-short-link", "expected": "moderate"},
    {"url": "http://192.168.1.1/login.php", "expected": True}
]

def test_api():
    print(f"Testing PhishGuard API at {BASE_URL}...")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"Root check: {response.json()}")
    except Exception as e:
        print(f"Error connecting to server: {e}")
        return

    for item in test_urls:
        url = item["url"]
        print(f"\nAnalyzing: {url}")
        res = requests.post(f"{BASE_URL}/analyze", json={"url": url})
        data = res.json()
        print(json.dumps(data, indent=2))
        
if __name__ == "__main__":
    test_api()
