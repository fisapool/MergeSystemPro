import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingDown, TrendingUp, Minus, AlertCircle, CheckCircle2 } from "lucide-react";
import { Product } from "@shared/schema";

interface Props {
  productId: number;
}

export default function MarketAnalysis({ productId }: Props) {
  const { data: analysis, isLoading } = useQuery({
    queryKey: [`/api/products/${productId}/analysis`],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Market Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  const { recommendation, market } = analysis;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return <Minus className="h-5 w-5 text-gray-500" />;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.85) return "bg-green-500";
    if (confidence >= 0.7) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Analysis</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Confidence Score</span>
            <span className="text-sm text-muted-foreground">
              {Math.round(recommendation.confidence * 100)}%
            </span>
          </div>
          <Progress
            value={recommendation.confidence * 100}
            className={getConfidenceColor(recommendation.confidence)}
          />
        </div>

        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Market Position</span>
            <span className="capitalize text-sm font-medium">
              {recommendation.analysis.market_position}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Market Trend</span>
            <div className="flex items-center gap-2">
              {getTrendIcon(market.trend)}
              <span className="capitalize text-sm font-medium">{market.trend}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Price Volatility</span>
            <span className="text-sm font-medium">
              {Math.round(recommendation.analysis.price_volatility * 100)}%
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Trend Strength</span>
            <span className="text-sm font-medium">
              {Math.round(recommendation.analysis.trend_strength * 100)}%
            </span>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-start gap-2">
            {recommendation.confidence >= 0.85 ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
            )}
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Price Recommendation
              </p>
              <p className="text-sm text-muted-foreground">
                {recommendation.confidence >= 0.85
                  ? "High confidence in the recommended price based on market analysis"
                  : "Consider additional market factors before adjusting price"}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
