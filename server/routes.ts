import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertProductSchema, type Product, type PriceHistory } from "@shared/schema";
import { z } from "zod";
import { importLazadaProducts } from "./scripts/import_lazada_data";
import multer from "multer";
import path from "path";
import { PythonShell } from 'python-shell';

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

  // Product routes with automatic price optimization
  app.get("/api/products", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const products = await storage.getProductsByUser(req.user.id);

    // Check for products that need optimization
    const now = new Date();
    const productsNeedingOptimization = products.filter(product => {
      const lastOptimized = product.lastOptimizedAt ? new Date(product.lastOptimizedAt) : new Date(0);
      const hoursSinceLastOptimization = (now.getTime() - lastOptimized.getTime()) / (1000 * 60 * 60);
      return hoursSinceLastOptimization >= 24; // Optimize daily
    });

    // Trigger background optimization for products that need it
    productsNeedingOptimization.forEach(product => {
      optimizeProductPrice(product.id).catch(console.error);
    });

    res.json(products);
  });

  // New endpoint for auto-adjustment settings
  app.post("/api/products/:id/auto-adjust", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const schema = z.object({
      enabled: z.boolean(),
      minConfidence: z.number().min(0).max(1).default(0.85),
      maxPriceChange: z.number().min(0).max(100).default(20), // percentage
      adjustmentFrequency: z.number().min(1).max(168).default(24) // hours
    });

    try {
      const { id } = req.params;
      const settings = schema.parse(req.body);

      const product = await storage.getProduct(parseInt(id));
      if (!product || product.userId !== req.user.id) {
        return res.sendStatus(404);
      }

      const updated = await storage.updateProduct(parseInt(id), {
        optimizationHistory: {
          ...product.optimizationHistory,
          autoAdjustSettings: settings
        }
      });

      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json(err.errors);
      } else {
        res.status(500).json({ 
          message: "Failed to update auto-adjustment settings",
          error: err instanceof Error ? err.message : "Unknown error"
        });
      }
    }
  });

  // Get product with its price history and optimization data
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

  // Price history routes
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

  // Price optimization routes
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

      // Prepare data for the ML model
      const optimizationInput = {
        product: {
          currentPrice: parseFloat(product.currentPrice.toString()),
          category: product.category,
        },
        history: history.map(h => ({
          price: parseFloat(h.price.toString()),
          timestamp: h.timestamp,
          marketContext: h.marketContext
        })),
        marketContext: {
          categoryAverage: marketStats.averagePrice,
          trend: marketStats.trend,
          competitors: categoryProducts.map(p => ({
            price: parseFloat(p.currentPrice.toString())
          }))
        }
      };

      // Call Python optimization script
      const options = {
        scriptPath: 'server/ml',
        args: ['--data', JSON.stringify(optimizationInput)]
      };

      const result = await new Promise((resolve, reject) => {
        PythonShell.run('price_optimizer.py', options, (err, output) => {
          if (err) reject(err);
          resolve(JSON.parse(output[output.length - 1]));
        });
      });

      // Update product with optimization results
      const updated = await storage.updateProduct(productId, {
        recommendedPrice: result.recommended_price.toString(),
        confidenceScore: result.confidence.toString(),
        lastOptimizedAt: new Date()
      });

      // Record optimization attempt in history
      await storage.addPriceHistory({
        productId,
        price: result.recommended_price.toString(),
        marketContext: optimizationInput.marketContext,
        optimizationReason: `ML optimization based on ${history.length} historical points`
      });

      res.json({
        ...updated,
        optimizationDetails: {
          confidence: result.confidence,
          marketTrend: result.market_trend,
          previousPrice: product.currentPrice,
          recommendedPrice: result.recommended_price
        }
      });
    } catch (err) {
      console.error('Price optimization failed:', err);
      res.status(500).json({
        message: "Failed to optimize price",
        error: err instanceof Error ? err.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function optimizeProductPrice(productId: number): Promise<void> {
  try {
    const product = await storage.getProduct(productId);
    if (!product) return;

    const history = await storage.getPriceHistory(productId);
    const categoryProducts = await storage.getProductsByCategory(product.category);
    const marketStats = await storage.getMarketStatistics(product.category);

    const optimizationInput = {
      product: {
        currentPrice: parseFloat(product.currentPrice.toString()),
        category: product.category,
      },
      history: history.map(h => ({
        price: parseFloat(h.price.toString()),
        timestamp: h.timestamp,
        marketContext: h.marketContext
      })),
      marketContext: {
        categoryAverage: marketStats.averagePrice,
        trend: marketStats.trend,
        competitors: categoryProducts.map(p => ({
          price: parseFloat(p.currentPrice.toString())
        }))
      }
    };

    const options = {
      scriptPath: 'server/ml',
      args: ['--data', JSON.stringify(optimizationInput)]
    };

    const result = await new Promise<any>((resolve, reject) => {
      PythonShell.run('price_optimizer.py', options, (err, output) => {
        if (err) reject(err);
        if (!output?.length) reject(new Error('No output from optimizer'));
        resolve(JSON.parse(output[output.length - 1]));
      });
    });

    const settings = product.optimizationHistory?.autoAdjustSettings || {
      enabled: false,
      minConfidence: 0.85,
      maxPriceChange: 20,
      adjustmentFrequency: 24
    };

    if (settings.enabled && result.confidence >= settings.minConfidence) {
      const currentPrice = parseFloat(product.currentPrice.toString());
      const recommendedPrice = result.recommended_price;
      const priceChange = Math.abs((recommendedPrice - currentPrice) / currentPrice * 100);

      if (priceChange <= settings.maxPriceChange) {
        await storage.updateProduct(productId, {
          currentPrice: recommendedPrice.toString(),
          recommendedPrice: recommendedPrice.toString(),
          confidenceScore: result.confidence.toString(),
          lastOptimizedAt: new Date()
        });

        // Record the automatic price change
        await storage.addPriceHistory({
          productId,
          price: recommendedPrice.toString(),
          marketContext: optimizationInput.marketContext,
          optimizationReason: `Automatic adjustment based on ML recommendation (confidence: ${result.confidence})`
        });
      }
    }
  } catch (error) {
    console.error('Failed to optimize product price:', error);
  }
}