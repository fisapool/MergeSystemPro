import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertProductSchema } from "@shared/schema";
import { z } from "zod";
import { importLazadaProducts } from "./scripts/import_lazada_data";
import multer from "multer";
import path from "path";
import { PythonShell } from 'python-shell';
import { log } from "./vite";

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
  log('Setting up authentication...');
  setupAuth(app);

  // Product routes with deferred optimization
  app.get("/api/products", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const products = await storage.getProductsByUser(req.user.id);

    // Defer optimization checks until server is stable
    setTimeout(() => {
      products.forEach(product => {
        const lastOptimized = product.lastOptimizedAt ? new Date(product.lastOptimizedAt) : new Date(0);
        const hoursSinceLastOptimization = (new Date().getTime() - lastOptimized.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastOptimization >= 24) {
          optimizeProductPrice(product.id).catch(err => 
            console.error(`Failed to optimize product ${product.id}:`, err)
          );
        }
      });
    }, 5000); // Wait 5 seconds after server start

    res.json(products);
  });

  // Basic product and user management routes
  app.get("/api/products/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const productId = parseInt(req.params.id);
    const product = await storage.getProduct(productId);

    if (!product || product.userId !== req.user.id) {
      return res.sendStatus(404);
    }

    const history = await storage.getPriceHistory(productId);
    const marketStats = await storage.getMarketStatistics(product.category);

    res.json({
      ...product,
      priceHistory: history,
      marketAnalysis: {
        categoryAverage: marketStats.averagePrice,
        competitorCount: marketStats.competitorCount,
        marketTrend: marketStats.trend
      }
    });
  });

  app.post("/api/products/:id/optimize", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const productId = parseInt(req.params.id);

    try {
      const product = await storage.getProduct(productId);
      if (!product) return res.sendStatus(404);

      const pythonOptions = {
        mode: 'text',
        pythonPath: 'python3',
        scriptPath: './server/ml',
        args: [JSON.stringify({ product })]
      };

      PythonShell.run('price_optimizer.py', pythonOptions).then(async results => {
        const optimization = JSON.parse(results[0]);
        const savedResult = await storage.saveOptimizationResult({
          productId,
          recommendedPrice: optimization.price,
          confidenceScore: optimization.confidence,
          marketData: optimization.market_data
        });
        res.json(savedResult);
      });
    } catch (err) {
      res.status(500).json({ error: "Optimization failed" });
    }
  });

  app.get("/api/products/:id/optimizations", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const productId = parseInt(req.params.id);
    const results = await storage.getOptimizationHistory(productId);
    res.json(results);
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

  // Import functionality
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

  log('Routes registered successfully');
  const httpServer = createServer(app);
  return httpServer;
}

// Temporarily commented out to debug startup issues
/*
async function optimizeProductPrice(productId: number): Promise<any> {
  // Implementation moved to separate file for startup optimization
}
*/