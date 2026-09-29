import os
import pandas as pd
import numpy as np
from scipy.stats.mstats import winsorize

# Dynamic base directory resolution independent of execution location
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
RAW_DATA_DIR = os.path.join(BASE_DIR, 'backend', 'data', 'raw')
PROCESSED_DIR = os.path.join(BASE_DIR, 'backend', 'data', 'processed')
OUTPUT_PATH = os.path.join(PROCESSED_DIR, 'cleaned_walmart_data.csv')

def load_and_merge_data(raw_data_dir: str) -> pd.DataFrame:
    """Load raw Walmart dataset files and merge into a unified dataframe."""
    train_path = os.path.join(raw_data_dir, "train.csv")
    features_path = os.path.join(raw_data_dir, "features.csv")
    stores_path = os.path.join(raw_data_dir, "stores.csv")
    
    if not os.path.exists(train_path):
        raise FileNotFoundError(f"Missing train.csv at: {train_path}")
    if not os.path.exists(features_path):
        raise FileNotFoundError(f"Missing features.csv at: {features_path}")
    if not os.path.exists(stores_path):
        raise FileNotFoundError(f"Missing stores.csv at: {stores_path}")

    train = pd.read_csv(train_path)
    features = pd.read_csv(features_path)
    stores = pd.read_csv(stores_path)
    
    # Merge datasets on Store, Date, and IsHoliday
    df = train.merge(features, on=['Store', 'Date', 'IsHoliday'], how='left')
    df = df.merge(stores, on=['Store'], how='left')
    
    df['Date'] = pd.to_datetime(df['Date'])
    df = df.sort_values(by=['Store', 'Dept', 'Date']).reset_index(drop=True)
    return df

def apply_winsorization(df: pd.DataFrame, limits=[0.01, 0.05]) -> pd.DataFrame:
    """Cap extreme sales outliers using quantile-based winsorization."""
    df['Weekly_Sales_Winsorized'] = winsorize(df['Weekly_Sales'], limits=limits)
    return df

def generate_engineered_features(df: pd.DataFrame) -> pd.DataFrame:
    """Engineers time-series lag variables, rolling metrics, and calendar indicators."""
    # Calendar features
    df['Week'] = df['Date'].dt.isocalendar().week.astype(int)
    df['Month'] = df['Date'].dt.month
    df['Year'] = df['Date'].dt.year
    df['IsHoliday'] = df['IsHoliday'].astype(int)
    
    # Fill missing promotional markdowns with 0
    markdown_cols = ['MarkDown1', 'MarkDown2', 'MarkDown3', 'MarkDown4', 'MarkDown5']
    df[markdown_cols] = df[markdown_cols].fillna(0)
    
    # Generate Lagged Features per Store & Department
    grouped = df.groupby(['Store', 'Dept'])['Weekly_Sales_Winsorized']
    
    df['Sales_Lag_1'] = grouped.shift(1)   # 1 week ago
    df['Sales_Lag_4'] = grouped.shift(4)   # 1 month ago
    df['Sales_Lag_52'] = grouped.shift(52) # 1 year ago (captures holiday seasonality)
    
    # Rolling Statistics (4-week window)
    df['Rolling_Mean_4'] = grouped.transform(lambda x: x.shift(1).rolling(4).mean())
    df['Rolling_Std_4'] = grouped.transform(lambda x: x.shift(1).rolling(4).std())
    
    # Drop rows created with NaN values due to shift operations
    df_clean = df.dropna().reset_index(drop=True)
    return df_clean

if __name__ == "__main__":
    print(f"Resolved Project Base Directory: {BASE_DIR}")
    print("Loading raw Walmart dataset...")
    df_merged = load_and_merge_data(RAW_DATA_DIR)
    
    print("Applying winsorization to treat outliers...")
    df_winsorized = apply_winsorization(df_merged)
    
    print("Engineering lag features and rolling statistics...")
    df_processed = generate_engineered_features(df_winsorized)
    
    os.makedirs(PROCESSED_DIR, exist_ok=True)
    df_processed.to_csv(OUTPUT_PATH, index=False)
    print(f"Dataset preprocessed successfully. Output saved to: {OUTPUT_PATH}")