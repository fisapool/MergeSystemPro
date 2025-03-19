
import pandas as pd
import numpy as np
import json
from typing import Dict, Any
import argparse

def process_lazada_data(csv_path: str) -> Dict[str, Any]:
    df = pd.read_csv(csv_path)
    
    stats = {
        'total_products': len(df),
        'categories': df['category'].unique().tolist(),
        'avg_price': float(df['price'].mean()),
        'price_range': {
            'min': float(df['price'].min()),
            'max': float(df['price'].max())
        }
    }
    
    category_analysis = df.groupby('category').agg({
        'price': ['mean', 'min', 'max', 'count']
    }).to_dict()
    
    return {
        'market_stats': stats,
        'category_analysis': category_analysis,
        'recommendations': generate_recommendations(df)
    }

def generate_recommendations(df: pd.DataFrame) -> Dict[str, Any]:
    return {
        'underpriced_categories': find_underpriced_categories(df),
        'trending_categories': find_trending_categories(df)
    }

def find_underpriced_categories(df: pd.DataFrame) -> list:
    category_margins = df.groupby('category')['price'].agg(['mean', 'std'])
    return category_margins[category_margins['std'] / category_margins['mean'] > 0.3].index.tolist()

def find_trending_categories(df: pd.DataFrame) -> list:
    if 'sales_count' in df.columns:
        top_categories = df.groupby('category')['sales_count'].sum()
        return top_categories.nlargest(3).index.tolist()
    return []

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--path', type=str, required=True)
    args = parser.parse_args()
    
    results = process_lazada_data(args.path)
    print(json.dumps(results))
