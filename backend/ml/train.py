import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error

# Dynamic base directory resolution independent of execution location
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
PROCESSED_DATA_PATH = os.path.join(BASE_DIR, 'backend', 'data', 'processed', 'cleaned_walmart_data.csv')
MODELS_DIR = os.path.join(BASE_DIR, 'backend', 'ml', 'models')

def load_processed_data(file_path: str) -> pd.DataFrame:
    """Load the preprocessed Walmart feature table."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Processed data file not found at {file_path}. Run preprocess.py first.")
    
    df = pd.read_csv(file_path)
    df['Date'] = pd.to_datetime(df['Date'])
    return df

def prepare_features_and_target(df: pd.DataFrame):
    """Separate target variable and define model features."""
    feature_cols = [
        'Store', 'Dept', 'Size', 'Week', 'Month', 'Year', 'IsHoliday',
        'Temperature', 'Fuel_Price', 'CPI', 'Unemployment',
        'MarkDown1', 'MarkDown2', 'MarkDown3', 'MarkDown4', 'MarkDown5',
        'Sales_Lag_1', 'Sales_Lag_4', 'Sales_Lag_52',
        'Rolling_Mean_4', 'Rolling_Std_4'
    ]
    
    if 'Type' in df.columns:
        df['Type'] = df['Type'].astype('category').cat.codes
        feature_cols.append('Type')

    X = df[feature_cols]
    y = df['Weekly_Sales_Winsorized']
    
    return X, y, feature_cols

def train_gradient_boosting_model(df: pd.DataFrame, models_dir: str):
    """
    Splits data chronologically (80% Train / 20% Test) and trains HistGradientBoostingRegressor.
    Evaluates using RMSE and MAE metrics before saving model artifacts.
    """
    df = df.sort_values(by='Date').reset_index(drop=True)
    
    X, y, feature_cols = prepare_features_and_target(df)
    
    split_idx = int(len(df) * 0.80)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
    
    print(f"Dataset split: {len(X_train)} training rows | {len(X_test)} testing rows")
    
    model = HistGradientBoostingRegressor(
        loss='squared_error',
        max_iter=1000,
        learning_rate=0.05,
        max_leaf_nodes=63,
        early_stopping=True,
        n_iter_no_change=50,
        random_state=42
    )
    
    print("Training HistGradientBoostingRegressor model...")
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    mae = mean_absolute_error(y_test, y_pred)
    
    print("\n--- Model Performance Metrics ---")
    print(f"Test RMSE (Root Mean Squared Error): {rmse:.2f}")
    print(f"Test MAE  (Mean Absolute Error)    : {mae:.2f}")
    
    os.makedirs(models_dir, exist_ok=True)
    
    model_path = os.path.join(models_dir, "lightgbm_model.pkl")
    features_path = os.path.join(models_dir, "feature_names.pkl")
    
    joblib.dump(model, model_path)
    joblib.dump(feature_cols, features_path)
    
    print(f"\nModel successfully saved to: {model_path}")
    print(f"Feature metadata saved to: {features_path}")

if __name__ == "__main__":
    print(f"Resolved Project Base Directory: {BASE_DIR}")
    print("Loading preprocessed dataset...")
    df_clean = load_processed_data(PROCESSED_DATA_PATH)
    
    train_gradient_boosting_model(df_clean, MODELS_DIR)