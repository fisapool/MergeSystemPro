from sklearn.ensemble import RandomForestRegressor
import numpy as np
import pandas as pd
from typing import List, Dict
from datetime import datetime

class PriceOptimizer:
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        
    def prepare_features(self, price_history: List[Dict]) -> pd.DataFrame:
        df = pd.DataFrame(price_history)
        df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Extract temporal features
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        df['month'] = df['timestamp'].dt.month
        
        # Calculate price statistics
        df['price_7d_mean'] = df['price'].rolling(7).mean()
        df['price_7d_std'] = df['price'].rolling(7).std()
        
        return df.dropna()
        
    def train(self, price_history: List[Dict]) -> None:
        if len(price_history) < 14:  # Need minimum data points
            raise ValueError("Insufficient price history for training")
            
        df = self.prepare_features(price_history)
        
        X = df[['day_of_week', 'month', 'price_7d_mean', 'price_7d_std']]
        y = df['price']
        
        self.model.fit(X, y)
        
    def predict_optimal_price(self, price_history: List[Dict]) -> float:
        df = self.prepare_features(price_history)
        
        if df.empty:
            raise ValueError("No valid features for prediction")
            
        X = df[['day_of_week', 'month', 'price_7d_mean', 'price_7d_std']].iloc[-1:]
        prediction = self.model.predict(X)[0]
        
        # Add business logic constraints
        current_price = float(price_history[-1]['price'])
        max_change = 0.20  # Maximum 20% change
        
        min_price = current_price * (1 - max_change)
        max_price = current_price * (1 + max_change)
        
        return np.clip(prediction, min_price, max_price)
