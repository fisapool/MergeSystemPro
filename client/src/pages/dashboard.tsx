import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Product } from "@shared/schema";
import ProductTable from "@/components/ProductTable";
import PriceChart from "@/components/PriceChart";
import OptimizationSettings from "@/components/OptimizationSettings";
import MarketAnalysis from "@/components/MarketAnalysis";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";

export default function Dashboard() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1]);
  const defaultTab = searchParams.get("tab") || "products";

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="history">Price History</TabsTrigger>
            <TabsTrigger value="optimize">Optimization</TabsTrigger>
          </TabsList>

          <TabsContent value="products">
            <ProductTable products={products || []} isLoading={isLoading} />
          </TabsContent>

          <TabsContent value="history">
            <PriceChart products={products || []} />
          </TabsContent>

          <TabsContent value="optimize">
            <div className="grid gap-6">
              <div className="prose dark:prose-invert">
                <h3>Price Optimization</h3>
                <p>
                  Our ML model analyzes historical price data and market trends to
                  recommend optimal prices for your products.
                </p>
              </div>

              {products && products.length > 0 && (
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <OptimizationSettings productId={products[0].id} />
                    <MarketAnalysis productId={products[0].id} />
                  </div>
                  <ProductTable
                    products={products}
                    isLoading={isLoading}
                    showOptimize
                  />
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}