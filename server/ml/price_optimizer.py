import numpy as np
import json
import sys
from typing import List, Dict
from datetime import datetime

class PriceOptimizer:
    def __init__(self):
        self.elasticity_factor = 0.15
        self.confidence_threshold = 0.85
        self.inventory_weight = 0.3
        self.competition_weight = 0.4
        self.trend_weight = 0.3

    def optimize_price(self, data: Dict) -> Dict:
        current_price = data['product']['currentPrice']
        history = data['history']
        market_context = data['marketContext']

        analysis_data = {
            'timestamp': datetime.now().isoformat(),
            'market_factors': {
                'competitor_count': len(market_context['competitors']),
                'category_avg': market_context['categoryAverage'],
                'market_trend': market_context['trend']
            }
        }

        # Calculate competitor-based price adjustment
        competitor_prices = [p['price'] for p in market_context['competitors']]
        if competitor_prices:
            competitor_avg = np.mean(competitor_prices)
            competitor_std = np.std(competitor_prices)
            price_position = (current_price - competitor_avg) / competitor_std if competitor_std > 0 else 0

            # Competitive positioning strategy
            if price_position > 1.5:  # Significantly overpriced
                return {
                    'recommended_price': round(competitor_avg * 1.1, 2),
                    'confidence': 0.9,
                    'market_trend': 'competitive_adjustment',
                    'reason': 'Price significantly above market average'
                }

        # Analyze historical pricing and trends
        if history:
            prices = [h['price'] for h in history]
            timestamps = [datetime.fromisoformat(h['timestamp'].replace('Z', '+00:00')) for h in history]

            # Enhanced trend analysis
            price_trend = self._calculate_trend(prices)
            volatility = np.std(prices) / np.mean(prices) if len(prices) > 1 else 0
            trend_strength = self._calculate_trend_strength(prices)

            # Dynamic elasticity adjustment
            self.elasticity_factor = self._adjust_elasticity(
                base_elasticity=0.15,
                volatility=volatility,
                trend_strength=trend_strength,
                market_trend=market_context['trend']
            )

            # Calculate optimal price using weighted factors
            optimal_price = self._calculate_optimal_price(
                current_price=current_price,
                competitor_avg=competitor_avg if competitor_prices else current_price,
                price_trend=price_trend,
                market_trend=market_context['trend'],
                elasticity=self.elasticity_factor
            )

            confidence = self._calculate_confidence(
                volatility=volatility,
                history_length=len(history),
                market_trend=market_context['trend'],
                competitor_count=len(competitor_prices),
                trend_strength=trend_strength
            )

            analysis = {
                'price_volatility': volatility,
                'trend_strength': trend_strength,
                'market_position': 'premium' if price_position > 0.5 else 'competitive' if price_position > -0.5 else 'budget'
            }
        else:
            # Without history, use market average as baseline
            optimal_price = market_context['categoryAverage']
            confidence = 0.7
            price_trend = market_context['trend']
            analysis = {'limited_data': True}

        return {
            'recommended_price': round(optimal_price, 2),
            'confidence': round(confidence, 2),
            'market_trend': price_trend,
            'analysis': analysis
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

    def _calculate_trend_strength(self, prices: List[float]) -> float:
        if len(prices) < 2:
            return 0.0

        price_changes = np.diff(prices)
        consistency = np.sum(np.sign(price_changes[1:]) == np.sign(price_changes[:-1])) / (len(price_changes) - 1)
        magnitude = np.mean(np.abs(price_changes)) / np.mean(prices)

        return (consistency + magnitude) / 2

    def _adjust_elasticity(self, base_elasticity: float, volatility: float, 
                         trend_strength: float, market_trend: str) -> float:
        elasticity = base_elasticity

        # Adjust for volatility - reduce elasticity in volatile markets
        elasticity *= (1 - volatility)

        # Adjust for trend strength
        elasticity *= (1 + trend_strength)

        # Adjust for market trend
        if market_trend == 'up':
            elasticity *= 1.2
        elif market_trend == 'down':
            elasticity *= 0.8

        return np.clip(elasticity, 0.05, 0.3)

    def _calculate_optimal_price(self, current_price: float, competitor_avg: float,
                               price_trend: str, market_trend: str, elasticity: float) -> float:
        # Blend multiple pricing factors
        competitive_factor = competitor_avg * self.competition_weight
        trend_factor = current_price * (1 + elasticity if price_trend == 'up' else 1 - elasticity if price_trend == 'down' else 1)
        trend_factor *= self.trend_weight

        optimal_price = competitive_factor + trend_factor

        # Apply market trend adjustments
        if market_trend == 'up':
            optimal_price *= 1.05
        elif market_trend == 'down':
            optimal_price *= 0.95

        return optimal_price

    def _calculate_confidence(self, volatility: float, history_length: int,
                            market_trend: str, competitor_count: int,
                            trend_strength: float) -> float:
        # Base confidence
        confidence = 0.85

        # Adjust for volatility - higher volatility reduces confidence
        confidence -= volatility * 0.5

        # Adjust for history length
        confidence += min((history_length / 30) * 0.1, 0.1)

        # Adjust for market clarity
        if market_trend != 'stable':
            confidence += 0.05 * trend_strength

        # Adjust for competition data
        confidence += min((competitor_count / 10) * 0.05, 0.05)

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