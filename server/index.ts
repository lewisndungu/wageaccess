import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { createServer } from 'http';
// @ts-ignore
import { Server } from 'socket.io';
// @ts-ignore
import { calculateKenyanPayroll } from './payroll-utils';
// @ts-ignore
import { createChatService } from './chat-service';

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Create chat service
export const chatService = createChatService();

// Add CORS headers to API responses
app.use((req, res, next) => {
  // Only add CORS headers for API routes
  if (req.path.startsWith('/api/')) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
  }
  next();
});

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
    
    log(`${req.method} ${path} ${res.statusCode} ${duration}ms`);
    
    if (path.startsWith('/api/') && capturedJsonResponse) {
      log(`Response: ${JSON.stringify(capturedJsonResponse).slice(0, 200)}...`);
    }
  });

  next();
});

// Register API routes before setting up Vite middleware
// This ensures API routes are handled by Express and not by Vite
(async () => {
  try {
    // First register all API routes
    const server = await registerRoutes(app);
    
    // Now set up Vite middleware for handling frontend requests
    if (process.env.NODE_ENV !== "production") {
      // In development, use Vite's dev server
      await setupVite(app, server);
    } else {
      // In production, serve static files
      serveStatic(app);
      
      // For any route not matching /api, serve the index.html
      app.get("*", (req, res) => {
        if (!req.path.startsWith('/api/')) {
          res.sendFile('index.html', { root: './dist' });
        }
      });
    }
    
    // Catch-all error handler
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error(err.stack);
      res.status(500).json({
        error: err.message || "Something went wrong",
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
      });
    });
    
    // Start the server
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
      log(`Server running on port ${PORT}`);
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
})();
