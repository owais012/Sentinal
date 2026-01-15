#!/usr/bin/env python
"""Test the Sentinel AI API"""
import requests
import json
import sys
import time

def test_chat():
    """Test the /chat endpoint"""
    url = "http://localhost:8000/chat"
    payload = {"query": "Hello, what can you do?"}
    
    print(f"Testing {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}\n")
    
    try:
        response = requests.post(url, json=payload, timeout=30)
        print(f"Status Code: {response.status_code}")
        print(f"Response:")
        print(json.dumps(response.json(), indent=2))
        
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Make sure the server is running on http://localhost:8000")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    test_chat()

