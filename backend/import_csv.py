import pandas as pd
from db import historical_releases

# change this filename if needed
CSV_PATH = "data/release_data_realistic_2023.csv"

df = pd.read_csv(CSV_PATH)

records = df.to_dict(orient="records")

if not records:
    print("No records found in CSV.")
else:
    # optional: clear old data first
    historical_releases.delete_many({})
    historical_releases.insert_many(records)
    print(f"✅ Inserted {len(records)} records into historical_releases")