from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from fastapi import FastAPI, HTTPException, status
from pydantic import BaseModel

app = FastAPI(title="DemandIQ Backend API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dummy model for Walmart dataset logic
np.random.seed(42)
X_dummy = np.random.rand(100, 5)
y_dummy = X_dummy[:,0]*800 + X_dummy[:,1]*200 + X_dummy[:,2]*100 + 500
model = RandomForestRegressor()
model.fit(X_dummy, y_dummy)

class RecommendationRequest(BaseModel):
    is_holiday: int = 0
    promotional_discount: float = 0.15
    temperature: float = 72.5
    fuel_price: float = 3.5
    previous_week_sales: float = 950
    current_stock: int = 600
    safety_stock: int = 100

class WhatIfRequest(BaseModel):
    base_demand: float
    discount_percentage: float

@app.get("/")
def home():
    return {"status": "DemandIQ API Running"}

@app.post("/api/recommendation")
def get_recommendation(req: RecommendationRequest):
    features = np.array([[req.previous_week_sales/1000, req.is_holiday, req.promotional_discount, req.temperature/100, req.fuel_price/10]])
    pred = float(model.predict(features)[0])
    # Walmart logic: if discount more, demand more
    pred = pred * (1 + req.promotional_discount * 0.5)

    recommended = max(0, int(pred + req.safety_stock - req.current_stock))

    if req.current_stock < req.safety_stock:
        status = "CRITICAL - ORDER NOW"
    elif req.current_stock < pred:
        status = "LOW - REORDER"
    else:
        status = "OPTIMAL"

    return {
        "predicted_demand": round(pred, 2),
        "current_stock": req.current_stock,
        "safety_stock": req.safety_stock,
        "recommended_order": recommended,
        "stock_status": status
    }

@app.post("/api/what-if")
def what_if(req: WhatIfRequest):
    # Discount impact simulation
    simulated = req.base_demand * (1 + (req.discount_percentage/100) * 0.8)
    return {"simulated_demand": round(simulated, 2)}

@app.get("/api/explainability")
def explainability():
    return [
        {"feature": "Previous Week Sales", "importance": 0.42},
        {"feature": "Is Holiday / Festival", "importance": 0.28},
        {"feature": "Promotional Discount", "importance": 0.18},
        {"feature": "Temperature / Weather", "importance": 0.12},
        {"feature": "Fuel Price", "importance": 0.05},
    ]

@app.get("/api/inventory")
def inventory():
    return [
        {"product": "Milk 1L", "current": 60, "predicted": 120, "status": "Low"},
        {"product": "Bread", "current": 150, "predicted": 140, "status": "OK"},
    ]

# Add these models to main.py
class LoginRequest(BaseModel):
    email: str
    password: str

# Login Endpoint
@app.post("/api/login")
def login(credentials: LoginRequest):
    """Module Authentication: Validates store manager credentials."""
    # Demo credentials check
    if credentials.email == "admin@demandiq.ai" and credentials.password == "admin123":
        return {
            "token": "demandiq-session-token-99823",
            "user": {
                "name": "Alex Mercer",
                "email": credentials.email,
                "role": "Store Manager",
                "store_id": "STORE-WALMART-104"
            }
        }
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password"
    )