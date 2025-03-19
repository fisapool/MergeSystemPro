import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Track active connections for proper shutdown
const connections = new Set<any>();

// Add request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    log('Starting server initialization...');
    const server = await registerRoutes(app);

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`Error: ${message}`);
      res.status(status).json({ message });
    });

    // Track connections for cleanup
    server.on('connection', (conn) => {
      connections.add(conn);
      conn.on('close', () => connections.delete(conn));
    });

    // Setup vite or static serving based on environment
    if (app.get("env") === "development") {
      log('Setting up Vite development server...');
      await setupVite(app, server);
    } else {
      log('Setting up static file serving...');
      serveStatic(app);
    }

    // Add graceful shutdown handling
    const gracefulShutdown = (signal: string) => {
      log(`Received ${signal}, initiating graceful shutdown...`);

      // Stop accepting new connections
      server.close(() => {
        log('HTTP server closed');
        process.exit(0);
      });

      // Close existing connections
      connections.forEach((conn) => {
        conn.end();
        connections.delete(conn);
      });

      // Force close after timeout
      setTimeout(() => {
        log('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Start server with proper error handling
    const port = 5000;
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`Server started and listening on port ${port}`);
    }).on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        log(`Port ${port} is already in use. Please ensure no other instance is running.`);
        process.exit(1);
      } else {
        log(`Failed to start server: ${error.message}`);
        throw error;
      }
    });

  } catch (error) {
    log(`Fatal error during startup: ${error}`);
    process.exit(1);
  }
})();