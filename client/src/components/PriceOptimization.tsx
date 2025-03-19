
import { useQuery } from "@tanstack/react-query";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Product, OptimizationResult } from "@shared/schema";
import { LineChart, CheckCircle2, AlertCircle } from "lucide-react";

interface Props {
  product: Product;
}

export default function PriceOptimization({ product }: Props) {
  const { data: optimization, isLoading } = useQuery<OptimizationResult>({
    queryKey: [`/api/products/${product.id}/optimizations`],
  });

  const triggerOptimization = async () => {
    const response = await fetch(`/api/products/${product.id}/optimize`, {
      method: 'POST'
    });
    if (!response.ok) throw new Error('Optimization failed');
    return response.json();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LineChart className="h-5 w-5" />
          Price Optimization
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium">Current Price</p>
              <p className="text-2xl font-bold">${product.currentPrice}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Recommended Price</p>
              <p className="text-2xl font-bold">${optimization?.recommendedPrice || '-'}</p>
            </div>
          </div>

          {optimization && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {optimization.confidenceScore > 0.8 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                <span>
                  {optimization.confidenceScore > 0.8 
                    ? 'High confidence recommendation'
                    : 'Consider market factors'}
                </span>
              </div>
            </div>
          )}

          <Button 
            onClick={triggerOptimization}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? 'Optimizing...' : 'Optimize Price'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
