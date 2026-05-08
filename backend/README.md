# Release Pulse — Backend

Flask + ML backend for Release Pulse.

## Setup (Run these commands in order)

```bash
# Step 1 — Install packages
pip install -r requirements.txt

# Step 2 — Generate dataset
python data/generate_data.py

# Step 3 — Train models
python train_models.py

# Step 4 — Start server
python app.py
```

Server runs at: http://localhost:5000

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| /api/health | GET | Check API is running |
| /api/predict | POST | Predict release readiness |
| /api/comparison | GET | Model comparison data |
| /api/features | GET | Feature importance |
| /api/releases | GET | Sample release data |
| /api/sprints | GET | Sample sprint data |

## Project Structure

```
backend/
├── app.py              ← Flask API server
├── train_models.py     ← Train RF + CatBoost
├── requirements.txt    ← Python packages
├── data/
│   ├── generate_data.py
│   └── release_data.csv
└── models/
    ├── random_forest.pkl
    ├── catboost_model.pkl
    └── results.json
```
