import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertProductSchema, type Product, type PriceHistory } from "@shared/schema";
import { z } from "zod";
import { importLazadaProducts } from "./scripts/import_lazada_data";
import multer from "multer";
import path from "path";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.csv') {
      cb(new Error('Only CSV files are allowed'));
      return;
    }
    cb(null, true);
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Product routes
  app.get("/api/products", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const products = await storage.getProductsByUser(req.user.id);
    res.json(products);
  });

  // New route for importing Lazada products
  app.post("/api/products/import/lazada", upload.single('file'), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    try {
      const result = await importLazadaProducts(req.file.path, req.user.id);
      res.json(result);
    } catch (err) {
      res.status(500).json({ 
        message: "Failed to import products",
        error: err instanceof Error ? err.message : "Unknown error"
      });
    }
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
  app.get("/api/analysis/lazada", async (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  
  try {
    const { PythonShell } = require('python-shell');
    const options = {
      scriptPath: 'server/ml',
      args: ['--path', 'data/lazada_products.csv']
    };
    
    const results = await new Promise((resolve, reject) => {
      PythonShell.run('process_lazada.py', options, (err: any, output: any) => {
        if (err) reject(err);
        resolve(JSON.parse(output[0]));
      });
    });
    
    res.json(results);
  } catch (err) {
    res.status(500).send("Failed to analyze Lazada data");
  }
});

  app.post("/api/products/:id/optimize", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const productId = parseInt(req.params.id);
    const product = await storage.getProduct(productId);

    if (!product || product.userId !== req.user.id) {
      return res.sendStatus(404);
    }

    try {
      const history = await storage.getPriceHistory(productId);
      const categoryProducts = await storage.getProductsByCategory(product.category);
      const marketStats = await storage.getMarketStatistics(product.category);

      const optimizationData = {
        product,
        history,
        categoryProducts,
        marketStats,
      };

      const recommendedPrice = await optimizePrice(product, history);
      const confidence = calculateConfidence(optimizationData);

      const updated = await storage.updateProduct(productId, {
        recommendedPrice: recommendedPrice.toString(),
      });

      res.json({
        ...updated,
        confidence,
        marketAnalysis: {
          categoryAverage: marketStats.averagePrice,
          competitorCount: categoryProducts.length,
          marketTrend: marketStats.trend
        }
      });
    } catch (err) {
      res.status(500).send("Failed to optimize price");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function optimizePrice(product: Product, history: PriceHistory[]): Promise<number> {
  const { PythonShell } = require('python-shell');
  
  const options = {
    scriptPath: 'server/ml',
    args: [
      '--price', product.currentPrice.toString(),
      '--history', JSON.stringify(history)
    ]
  };
  
  return new Promise((resolve, reject) => {
    PythonShell.run('price_optimizer.py', options, (err: any, results: any) => {
      if (err) {
        console.error('Price optimization failed:', err);
        reject(err);
      }
      const result = JSON.parse(results[0]);
      resolve(result.recommended_price);
    });
  });
}

function calculateConfidence(data: any): number {
  // For now, return a simple confidence score
  // In reality, this would be calculated based on various factors
  return 0.85; // 85% confidence
}