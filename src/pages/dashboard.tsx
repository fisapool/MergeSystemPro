const getCompletionPercentage = (total: number, completed: number): number => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Product } from "@shared/schema";
import ProductTable from "@/components/ProductTable";
import PriceChart from "@/components/PriceChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from "wouter";
import Navbar from "@/components/Navbar";
import { getCompletionPercentage } from "@/utils/completionTracker";

const Dashboard = () => {
  const totalTasks = 10;
  const completedTasks = 5;
  const percentage = getCompletionPercentage(totalTasks, completedTasks);

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Completion Percentage: {percentage}%</p>
    </div>
  );
};

export default Dashboard;