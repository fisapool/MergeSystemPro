import numpy as np
from datetime import datetime
from typing import Dict, List
import json
import sys
from scipy import stats

class PriceOptimizer:
    def __init__(self):
        self.elasticity_factor = 0.15
        self.confidence_threshold = 0.85
        self.inventory_weight = 0.25
        self.competition_weight = 0.35
        self.trend_weight = 0.25
        self.history_weight = 0.15

    def analyze_price_history(self, history: List[Dict]) -> Dict:
        if not history:
            return {"trend": 0, "volatility": 0}

        prices = [h["price"] for h in history]
        time_diffs = [(i+1) - i for i in range(len(prices)-1)]
        trend = np.polyfit(time_diffs, np.diff(prices), 1)[0] if len(prices) > 1 else 0
        volatility = np.std(prices) if len(prices) > 1 else 0

        return {"trend": trend, "volatility": volatility}

    def calculate_confidence(self, data_points: int, volatility: float, competitor_count: int) -> float:
        base_confidence = 0.7
        data_weight = min(data_points / 10, 1) * 0.1
        volatility_penalty = min(volatility * 0.1, 0.2)
        competition_bonus = min(competitor_count / 5, 1) * 0.2

        return min(base_confidence + data_weight + competition_bonus - volatility_penalty, 1.0)

    def optimize_price(self, data: Dict) -> Dict:
        product = data["product"]
        history = data.get("history", [])
        market = data["marketContext"]
        current_price = float(product["currentPrice"])

        # Analyze historical data
        history_analysis = self.analyze_price_history(history)

        # Process competitor data
        competitor_prices = [float(p["price"]) for p in market.get("competitors", [])]
        competitor_avg = np.mean(competitor_prices) if competitor_prices else current_price
        market_position = stats.percentileofscore(competitor_prices, current_price) if competitor_prices else 50

        # Calculate optimal price
        trend_adjustment = history_analysis["trend"] * self.trend_weight
        competition_adjustment = (competitor_avg - current_price) * self.competition_weight

        optimal_price = current_price + trend_adjustment + competition_adjustment
        optimal_price = max(optimal_price, current_price * 0.8)  # Limit price decrease
        optimal_price = min(optimal_price, current_price * 1.2)  # Limit price increase

        # Calculate confidence score
        confidence = self.calculate_confidence(
            len(history),
            history_analysis["volatility"],
            len(competitor_prices)
        )

        return {
            "recommended_price": round(optimal_price, 2),
            "confidence": round(confidence, 2),
            "market_position": round(market_position, 2),
            "analysis": {
                "trend": round(history_analysis["trend"], 3),
                "volatility": round(history_analysis["volatility"], 3),
                "competitor_avg": round(competitor_avg, 2)
            }
        }

def main():
    input_data = json.loads(sys.argv[1])
    optimizer = PriceOptimizer()
    result = optimizer.optimize_price(input_data)
    print(json.dumps(result))

if __name__ == "__main__":
    main()