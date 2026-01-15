from huggingface_hub import login
import os

my_token = os.getenv("HF_TOKEN")
try:
    login(token=my_token, add_to_git_credential=False)
    print("✅ SUCCESS: You are logged in!")
except Exception as e:
    print(f"❌ ERROR: {e}")