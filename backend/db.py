import os
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "release_pulse")

client = MongoClient(MONGO_URI)
db = client[DB_NAME]

# Collections
historical_releases = db["historical_releases"]
predictions = db["predictions"]
sprints = db["sprints"]
model_metrics = db["model_metrics"]

print("✅ MongoDB Connected Successfully!")