import { IStorage, MarketStatistics } from "./types";
import { User, InsertUser, Product, InsertProduct, PriceHistory, InsertPriceHistory } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private products: Map<number, Product>;
  private priceHistory: Map<number, PriceHistory>;
  sessionStore: session.Store;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.products = new Map();
    this.priceHistory = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getProduct(id: number): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductsByUser(userId: number): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      (product) => product.userId === userId,
    );
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(
      (product) => product.category === category,
    );
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = this.currentId++;
    const product: Product = {
      ...insertProduct,
      id,
      recommendedPrice: null,
      rating: null,
      salesCount: null,
      sku: insertProduct.sku || null,
      stock: insertProduct.stock || null,
      description: insertProduct.description || null,
      updatedAt: new Date(),
    };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: number, updates: Partial<Product>): Promise<Product> {
    const product = await this.getProduct(id);
    if (!product) throw new Error("Product not found");

    const updatedProduct = { ...product, ...updates, updatedAt: new Date() };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async getPriceHistory(productId: number): Promise<PriceHistory[]> {
    return Array.from(this.priceHistory.values()).filter(
      (history) => history.productId === productId,
    );
  }

  async addPriceHistory(insertHistory: InsertPriceHistory): Promise<PriceHistory> {
    const id = this.currentId++;
    const history: PriceHistory = {
      ...insertHistory,
      id,
      timestamp: new Date(),
    };
    this.priceHistory.set(id, history);
    return history;
  }

  async getMarketStatistics(category: string): Promise<MarketStatistics> {
    const products = await this.getProductsByCategory(category);
    const prices = products.map(p => parseFloat(p.currentPrice.toString()));

    const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    // Calculate trend based on price history
    const oldestHistory = await Promise.all(
      products.map(p => this.getPriceHistory(p.id))
    );
    const oldPrices = oldestHistory
      .map(history => history[0]?.price || 0)
      .map(price => parseFloat(price.toString()));

    const avgOldPrice = oldPrices.reduce((a, b) => a + b, 0) / oldPrices.length;

    let trend: 'up' | 'down' | 'stable';
    const threshold = 0.05; // 5% change threshold
    const priceDiff = (averagePrice - avgOldPrice) / avgOldPrice;

    if (priceDiff > threshold) {
      trend = 'up';
    } else if (priceDiff < -threshold) {
      trend = 'down';
    } else {
      trend = 'stable';
    }

    return {
      averagePrice,
      trend,
      competitorCount: products.length
    };
  }
}

export const storage = new MemStorage();