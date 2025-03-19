import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertProductSchema, type Product, type PriceHistory } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Product routes
  app.get("/api/products", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const products = await storage.getProductsByUser(req.user.id);
    res.json(products);
  });

  app.post("/api/products", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const product = insertProductSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      const created = await storage.createProduct(product);
      res.status(201).json(created);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json(err.errors);
      } else {
        res.status(500).send("Internal server error");
      }
    }
  });

  app.get("/api/products/:id/history", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const productId = parseInt(req.params.id);
    const product = await storage.getProduct(productId);

    if (!product || product.userId !== req.user.id) {
      return res.sendStatus(404);
    }

    const history = await storage.getPriceHistory(productId);
    res.json(history);
  });

  app.post("/api/products/:id/optimize", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const productId = parseInt(req.params.id);
    const product = await storage.getProduct(productId);

    if (!product || product.userId !== req.user.id) {
      return res.sendStatus(404);
    }

    try {
      // Call ML service for price optimization
      const history = await storage.getPriceHistory(productId);
      const recommendedPrice = await optimizePrice(product, history);

      const updated = await storage.updateProduct(productId, {
        recommendedPrice: recommendedPrice.toString(),
      });

      res.json(updated);
    } catch (err) {
      res.status(500).send("Failed to optimize price");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function optimizePrice(product: Product, history: PriceHistory[]): Promise<number> {
  // This would normally call the Python ML service
  // For now, return a simple recommendation
  const currentPrice = parseFloat(product.currentPrice.toString());
  return Number((currentPrice * 1.1).toFixed(2)); // Suggest 10% increase, rounded to 2 decimal places
}