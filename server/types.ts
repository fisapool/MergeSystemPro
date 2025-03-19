import { User, InsertUser, Product, PriceHistory } from "@shared/schema";
import session from "express-session";

export interface MarketStatistics {
  averagePrice: number;
  trend: 'up' | 'down' | 'stable';
  competitorCount: number;
}

export interface AutoAdjustSettings {
  enabled: boolean;
  minConfidence: number;
  maxPriceChange: number;
  adjustmentFrequency: number;
}

export interface IStorage {
  sessionStore: session.Store;

  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Product methods
  getProduct(id: number): Promise<Product | undefined>;
  getProductsByUser(userId: number): Promise<Product[]>;
  getProductsByCategory(category: string): Promise<Product[]>;
  createProduct(product: Omit<Product, 'id' | 'recommendedPrice' | 'updatedAt'>): Promise<Product>;
  updateProduct(id: number, updates: Partial<Product>): Promise<Product>;

  // Price history methods
  getPriceHistory(productId: number): Promise<PriceHistory[]>;
  addPriceHistory(history: Omit<PriceHistory, 'id' | 'timestamp'>): Promise<PriceHistory>;

  // Market analysis methods
  getMarketStatistics(category: string): Promise<MarketStatistics>;
}