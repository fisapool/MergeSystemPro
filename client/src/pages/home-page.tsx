import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart, LineChart, TrendingUp } from "lucide-react";
import Navbar from "@/components/Navbar";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, {user?.username}!
          </h1>
          <p className="text-muted-foreground">
            Optimize your product prices with ML-powered recommendations
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart className="h-5 w-5" />
                Product Analysis
              </CardTitle>
              <CardDescription>
                View and analyze your product performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard">
                <Button className="w-full">View Dashboard</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Price History
              </CardTitle>
              <CardDescription>
                Track price changes and market trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard?tab=history">
                <Button className="w-full">View History</Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Optimization
              </CardTitle>
              <CardDescription>
                Get ML-powered price recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard?tab=optimize">
                <Button className="w-full">Optimize Prices</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}