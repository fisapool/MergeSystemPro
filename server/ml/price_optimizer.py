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
import numpy as np
from typing import List, Dict

class PriceOptimizer:
    def __init__(self):
        # In a real implementation, this would load trained models
        self.elasticity_factor = 0.15
        
    def optimize_price(self, current_price: float, historical_data: List[Dict]) -> dict:
        """Optimize price based on historical data"""
        # Simple implementation - would be replaced with actual ML model
        avg_price = np.mean([d['price'] for d in historical_data]) if historical_data else current_price
        market_trend = self._analyze_trend(historical_data)
        
        if market_trend == 'up':
            optimal_price = current_price * (1 + self.elasticity_factor)
        elif market_trend == 'down':
            optimal_price = current_price * (1 - self.elasticity_factor)
        else:
            optimal_price = current_price
            
        return {
            'recommended_price': round(optimal_price, 2),
            'confidence': 0.85,
            'market_trend': market_trend
        }
    
    def _analyze_trend(self, historical_data: List[Dict]) -> str:
        if not historical_data:
            return 'stable'
        
        prices = [d['price'] for d in historical_data]
        if len(prices) < 2:
            return 'stable'
            
        recent_avg = np.mean(prices[-3:])
        old_avg = np.mean(prices[:-3])
        
        if recent_avg > old_avg * 1.05:
            return 'up'
        elif recent_avg < old_avg * 0.95:
            return 'down'
        return 'stable'
