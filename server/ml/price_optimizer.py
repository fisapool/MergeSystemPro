import numpy as np
import json
import sys
from typing import List, Dict
from datetime import datetime

class PriceOptimizer:
    def __init__(self):
        self.elasticity_factor = 0.15
        self.confidence_threshold = 0.85

    def optimize_price(self, data: Dict) -> Dict:
        current_price = data['product']['currentPrice']
        history = data['history']
        market_context = data['marketContext']

        # Calculate competitor-based price adjustment
        competitor_prices = [p['price'] for p in market_context['competitors']]
        if competitor_prices:
            competitor_avg = np.mean(competitor_prices)
            competitor_min = np.min(competitor_prices)

            # If our price is significantly higher than competition
            if current_price > competitor_avg * 1.2:
                return {
                    'recommended_price': round(competitor_avg * 1.1, 2),
                    'confidence': 0.9,
                    'market_trend': 'competitive_adjustment'
                }

        # Analyze historical pricing
        if history:
            prices = [h['price'] for h in history]
            timestamps = [datetime.fromisoformat(h['timestamp'].replace('Z', '+00:00')) for h in history]

            # Calculate price trend
            price_trend = self._calculate_trend(prices)

            # Calculate price volatility
            volatility = np.std(prices) / np.mean(prices) if len(prices) > 1 else 0

            # Adjust elasticity based on market trend
            if market_context['trend'] == 'up':
                self.elasticity_factor *= 1.2
            elif market_context['trend'] == 'down':
                self.elasticity_factor *= 0.8

            # Calculate optimal price
            if price_trend == 'up' and market_context['trend'] != 'down':
                optimal_price = current_price * (1 + self.elasticity_factor)
            elif price_trend == 'down' or market_context['trend'] == 'down':
                optimal_price = current_price * (1 - self.elasticity_factor)
            else:
                optimal_price = current_price

            # Ensure price remains competitive
            if competitor_prices:
                optimal_price = min(optimal_price, competitor_avg * 1.15)

            confidence = self._calculate_confidence(
                volatility,
                len(history),
                market_context['trend'],
                len(competitor_prices)
            )
        else:
            # Without history, use market average as baseline
            optimal_price = market_context['categoryAverage']
            confidence = 0.7
            price_trend = market_context['trend']

        return {
            'recommended_price': round(optimal_price, 2),
            'confidence': round(confidence, 2),
            'market_trend': price_trend
        }

    def _calculate_trend(self, prices: List[float]) -> str:
        if len(prices) < 2:
            return 'stable'

        recent_avg = np.mean(prices[-3:])
        old_avg = np.mean(prices[:-3]) if len(prices) > 3 else prices[0]

        if recent_avg > old_avg * 1.05:
            return 'up'
        elif recent_avg < old_avg * 0.95:
            return 'down'
        return 'stable'

    def _calculate_confidence(self, volatility: float, history_length: int, 
                            market_trend: str, competitor_count: int) -> float:
        # Base confidence
        confidence = 0.85

        # Adjust for volatility
        confidence -= volatility * 0.5

        # Adjust for history length
        confidence += min((history_length / 30) * 0.1, 0.1)  # Max 10% boost for history

        # Adjust for market clarity
        if market_trend != 'stable':
            confidence += 0.05

        # Adjust for competition data
        confidence += min((competitor_count / 10) * 0.05, 0.05)  # Max 5% boost for competition

        return np.clip(confidence, 0.6, 0.95)

def main():
    # Parse input data
    input_data = json.loads(sys.argv[1])

    # Initialize optimizer and get recommendation
    optimizer = PriceOptimizer()
    result = optimizer.optimize_price(input_data)

    # Output result as JSON
    print(json.dumps(result))

if __name__ == "__main__":
    main()