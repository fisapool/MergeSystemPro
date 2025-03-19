import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Product } from "@shared/schema";

interface OptimizationSettings {
  enabled: boolean;
  minConfidence: number;
  maxPriceChange: number;
  adjustmentFrequency: number;
}

interface Props {
  productId: number;
}

interface ExtendedProduct extends Product {
  optimizationHistory?: {
    autoAdjustSettings?: OptimizationSettings;
  };
}

export default function OptimizationSettings({ productId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch current settings
  const { data: product, isLoading } = useQuery<ExtendedProduct>({
    queryKey: [`/api/products/${productId}`]
  });

  const settings = product?.optimizationHistory?.autoAdjustSettings || {
    enabled: false,
    minConfidence: 0.85,
    maxPriceChange: 20,
    adjustmentFrequency: 24,
  };

  const [formData, setFormData] = useState<OptimizationSettings>(settings);

  // Update settings mutation
  const { mutate, isPending } = useMutation({
    mutationFn: async (data: OptimizationSettings) => {
      await apiRequest("POST", `/api/products/${productId}/auto-adjust`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/products/${productId}`] });
      toast({
        title: "Settings updated",
        description: "Price optimization settings have been updated successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Price Optimization Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="enabled">Enable automatic price adjustments</Label>
          <Switch
            id="enabled"
            checked={formData.enabled}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, enabled: checked }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="minConfidence">Minimum confidence score (%)</Label>
          <Input
            id="minConfidence"
            type="number"
            value={formData.minConfidence * 100}
            onChange={(e) => setFormData((prev) => ({ ...prev, minConfidence: Number(e.target.value) / 100 }))}
            min={60}
            max={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxPriceChange">Maximum price change (%)</Label>
          <Input
            id="maxPriceChange"
            type="number"
            value={formData.maxPriceChange}
            onChange={(e) => setFormData((prev) => ({ ...prev, maxPriceChange: Number(e.target.value) }))}
            min={1}
            max={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="adjustmentFrequency">Adjustment frequency (hours)</Label>
          <Input
            id="adjustmentFrequency"
            type="number"
            value={formData.adjustmentFrequency}
            onChange={(e) => setFormData((prev) => ({ ...prev, adjustmentFrequency: Number(e.target.value) }))}
            min={1}
            max={168}
          />
        </div>

        <Button
          className="w-full"
          onClick={() => mutate(formData)}
          disabled={isPending}
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}