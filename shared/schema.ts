import { pgTable, text, serial, integer, decimal, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  lazadaId: text("lazada_id").notNull().unique(),
  name: text("name").notNull(),
  currentPrice: decimal("current_price").notNull(),
  recommendedPrice: decimal("recommended_price"),
  category: text("category").notNull(),
  userId: integer("user_id").notNull(),
  sku: text("sku"),
  stock: integer("stock"),
  description: text("description"),
  rating: decimal("rating"),
  salesCount: integer("sales_count"),
  competitorPrices: jsonb("competitor_prices"), // Store competitor price data
  optimizationHistory: jsonb("optimization_history"), // Store optimization attempts
  confidenceScore: decimal("confidence_score"), // Confidence in price recommendation
  lastOptimizedAt: timestamp("last_optimized_at"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const priceHistory = pgTable("price_history", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  price: decimal("price").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  marketContext: jsonb("market_context"), // Store market conditions at the time
  optimizationReason: text("optimization_reason"), // Why the price was changed
});

// Schema for importing Lazada CSV data
export const lazadaImportSchema = z.object({
  lazadaId: z.string(),
  name: z.string(),
  price: z.number(),
  category: z.string(),
  sku: z.string().optional(),
  stock: z.number().optional(),
  description: z.string().optional(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProductSchema = createInsertSchema(products).pick({
  lazadaId: true,
  name: true,
  currentPrice: true,
  category: true,
  userId: true,
  sku: true,
  stock: true,
  description: true,
  competitorPrices: true,
  optimizationHistory: true,
  confidenceScore: true,
  lastOptimizedAt: true,
});

export const insertPriceHistorySchema = createInsertSchema(priceHistory).pick({
  productId: true,
  price: true,
  marketContext: true,
  optimizationReason: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertPriceHistory = z.infer<typeof insertPriceHistorySchema>;
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type PriceHistory = typeof priceHistory.$inferSelect;
export type LazadaImport = z.infer<typeof lazadaImportSchema>;