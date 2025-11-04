import os
from dotenv import load_dotenv

load_dotenv()

# Gemini API Key
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# API Settings
API_V1_STR = "/api/v1"
PROJECT_NAME = "Finsync Stock Analysis"