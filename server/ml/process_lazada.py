
import pandas as pd
import json
from typing import Dict, Any

def process_lazada_data(csv_path: str) -> Dict[str, Any]:
    df = pd.read_csv(csv_path)
    
    # Basic statistics
    stats = {
        'total_products': len(df),
        'categories': df['category'].unique().tolist(),
        'avg_price': df['current_price'].mean(),
        'avg_rating': df['rating'].mean() if 'rating' in df else None
    }
    
    # Price analysis by category
    price_by_category = df.groupby('category')['current_price'].agg(['mean', 'min', 'max']).to_dict()
    
    return {
        'stats': stats,
        'price_analysis': price_by_category
    }

if __name__ == '__main__':
    results = process_lazada_data('data/lazada_products.csv')
    print(json.dumps(results, indent=2))
