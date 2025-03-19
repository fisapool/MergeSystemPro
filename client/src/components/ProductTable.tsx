import { Product } from "@shared/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ProductTableProps {
  products: Product[];
  isLoading: boolean;
  showOptimize?: boolean;
}

export default function ProductTable({
  products,
  isLoading,
  showOptimize = false,
}: ProductTableProps) {
  const { toast } = useToast();

  const optimizeMutation = useMutation({
    mutationFn: async (productId: number) => {
      const res = await apiRequest("POST", `/api/products/${productId}/optimize`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Success",
        description: "Price optimization complete",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Current Price</TableHead>
          {showOptimize && <TableHead>Recommended Price</TableHead>}
          <TableHead>Last Updated</TableHead>
          {showOptimize && <TableHead>Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product.id}>
            <TableCell>{product.name}</TableCell>
            <TableCell>{product.category}</TableCell>
            <TableCell>${product.currentPrice}</TableCell>
            {showOptimize && (
              <TableCell>
                {product.recommendedPrice
                  ? `$${product.recommendedPrice}`
                  : "Not optimized"}
              </TableCell>
            )}
            <TableCell>
              {new Date(product.updatedAt).toLocaleDateString()}
            </TableCell>
            {showOptimize && (
              <TableCell>
                <Button
                  size="sm"
                  onClick={() => optimizeMutation.mutate(product.id)}
                  disabled={optimizeMutation.isPending}
                >
                  {optimizeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Optimize"
                  )}
                </Button>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
