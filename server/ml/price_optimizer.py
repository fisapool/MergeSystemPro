import numpy as np
from typing import List, Dict

class PriceOptimizer:
    def __init__(self):
        # In a real implementation, this would load trained models
        self.elasticity_factor = 0.15

    def optimize_price(self, current_price: float, historical_data: List[Dict], competitor_data: List[Dict] = None) -> dict:
        if competitor_data:
            competitor_prices = [float(d['price']) for d in competitor_data]
            competitor_avg = np.mean(competitor_prices)
            competitor_min = np.min(competitor_prices)

            if current_price > competitor_avg * 1.2:  # If price is 20% above average
                return {
                    'recommended_price': round(competitor_avg * 1.1, 2),  # Price slightly above average
                    'confidence': 0.9,
                    'market_trend': 'competitive_adjustment'
                }
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