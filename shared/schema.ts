import { pgTable, text, serial, integer, decimal, timestamp } from "drizzle-orm/pg-core";
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
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const priceHistory = pgTable("price_history", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  price: decimal("price").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
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
});

export const insertPriceHistorySchema = createInsertSchema(priceHistory).pick({
  productId: true,
  price: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type InsertPriceHistory = z.infer<typeof insertPriceHistorySchema>;
export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type PriceHistory = typeof priceHistory.$inferSelect;