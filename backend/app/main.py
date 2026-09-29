import os
import joblib
import pandas as pd
from typing import Optional
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Base directory resolution relative to backend/app/main.py
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
MODEL_PATH = os.path.join(BASE_DIR, "backend", "ml", "models", "lightgbm_model.pkl")
FEATURES_PATH = os.path.join(BASE_DIR, "backend", "ml", "models", "feature_names.pkl")

app = FastAPI(
    title="DemandIQ Backend API",
    description="Demand Forecasting and Inventory Decision Support API",
    version="1.0.0"
)

# Enable CORS for all origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for loaded model and features metadata
model = None
feature_cols = None

class PredictionInput(BaseModel):
    Store: int = 1
    Dept: int = 1
    Size: int = 151315
    Week: int = 42
    Month: int = 10
    Year: int = 2026
    IsHoliday: int = 0
    Temperature: float = 65.0
    Fuel_Price: float = 3.50
    CPI: float = 220.0
    Unemployment: float = 6.5
    MarkDown1: float = 0.0
    MarkDown2: float = 0.0
    MarkDown3: float = 0.0
    MarkDown4: float = 0.0
    MarkDown5: float = 0.0
    Sales_Lag_1: float = 15000.0
    Sales_Lag_4: float = 14500.0
    Sales_Lag_52: float = 16000.0
    Rolling_Mean_4: float = 14800.0
    Rolling_Std_4: float = 500.0
    Type: Optional[int] = 0
    # Inventory Parameters
    current_stock: float = 600.0
    safety_stock: float = 100.0

@app.on_event("startup")
def load_model_and_features():
    global model, feature_cols
    print(f"Resolving project base directory: {BASE_DIR}")
    
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(
            f"Model file not found at: {MODEL_PATH}. Run backend/ml/train.py first."
        )
        
    if not os.path.exists(FEATURES_PATH):
        raise FileNotFoundError(
            f"Feature names metadata not found at: {FEATURES_PATH}. Run backend/ml/train.py first."
        )

    try:
        model = joblib.load(MODEL_PATH)
        feature_cols = joblib.load(FEATURES_PATH)
        print(f"Model successfully loaded from: {MODEL_PATH}")
        print(f"Loaded {len(feature_cols)} feature columns into memory.")
    except Exception as e:
        raise RuntimeError(f"Failed to load model artifacts: {str(e)}")

@app.get("/")
def read_root():
    return {"status": "DemandIQ Backend Running"}

@app.post("/predict")
def predict(data: PredictionInput):
    if model is None or feature_cols is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not loaded. Ensure startup completed successfully."
        )
    
    try:
        input_dict = data.model_dump()
        df_input = pd.DataFrame([input_dict])
        
        # Ensure input align strictly with feature set used during training
        for col in feature_cols:
            if col not in df_input.columns:
                df_input[col] = 0.0
        
        X = df_input[feature_cols]
        
        # Perform demand forecasting inference
        predicted_sales = float(model.predict(X)[0])
        
        # Inventory Calculation: Recommended Order = Max(0, Predicted Demand - Current Stock + Safety Stock)
        raw_order = predicted_sales - data.current_stock + data.safety_stock
        recommended_order = max(0.0, round(raw_order, 2))
        
        return {
            "Store": data.Store,
            "Dept": data.Dept,
            "predicted_weekly_sales": float(round(predicted_sales, 2)),
            "current_stock": float(data.current_stock),
            "safety_stock": float(data.safety_stock),
            "recommended_order": recommended_order
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Inference error: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)