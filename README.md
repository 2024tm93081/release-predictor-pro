# Release Pulse

## A Data-Driven Framework for Release Readiness Prediction Using Machine Learning

Release Pulse is a full-stack machine learning-based decision support system designed to predict software release readiness in Agile engineering environments.

The system analyzes historical release and sprint metrics to classify releases into:

- Ready
- At Risk
- Not Ready

It combines:
- Machine Learning prediction
- Rule-Based evaluation
- Blocking factor analysis
- Feature impact analysis
- Quality metrics visualization

to help Release Managers make data-driven release decisions.

---

# Features

## Dashboard
- Release readiness overview
- Readiness trend visualization
- Sprint velocity tracking
- Blocking factor summary
- Recent release monitoring

## Release Management
- View all releases
- ML prediction status
- Prediction confidence
- Readiness score
- Rule-based score
- Historical metrics tracking

## Sprint Analytics
- Sprint-wise performance analysis
- Planned vs completed story points
- Velocity trend analysis
- Spillover monitoring
- Sprint health tracking

## Quality Metrics
- Test coverage tracking
- Defect density analysis
- Regression pass rate
- Critical bugs monitoring
- Quality gate validation

## ML Prediction Engine
- Predict release readiness
- CatBoost and Random Forest comparison
- Prediction confidence
- Blocking factor identification
- Feature impact visualization

## Model Evaluation
- Cross-validation analysis
- Accuracy / Precision / Recall / F1 comparison
- Confusion matrices
- Classification reports
- Prediction history

---

# Tech Stack

## Frontend
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui
- Recharts

## Backend
- Python Flask
- Flask-CORS

## Database
- MongoDB

## Machine Learning
- CatBoost
- Random Forest
- Scikit-learn
- Pandas
- NumPy

---

# Machine Learning Models

## Primary Model
### CatBoost
Selected as the primary model based on:
- Higher Cross-Validation F1 Score
- Better generalization
- Lower variance across folds
- Better handling of complex feature interactions

## Comparison Model
### Random Forest
Used as:
- Baseline ensemble comparison model
- Interpretable reference model

## Baseline
### Rule-Based Evaluation
Implements predefined engineering quality gates for explainable comparison.

---

# Dataset Features

The system evaluates releases using the following metrics:

- Test Coverage
- Defect Density
- Spillover Ratio
- Code Churn
- Open Critical Bugs
- Regression Pass Rate
- Sprint Goals Met
- Velocity Variance
- Effort Ratio
- Days Since Incident
- Sprint Count
- Average Velocity

---

# System Architecture

Frontend (React + TypeScript)
↓
Flask REST API
↓
Machine Learning Layer
↓
MongoDB Database

---

# Installation

## Prerequisites

- Node.js
- Python 3.9+
- MongoDB

---

# Frontend Setup

```bash
cd frontend
npm install
npm run dev