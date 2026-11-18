import { createApp } from './app.js';
import { config } from './config/index.js';
import { SearchService } from './services/search.service.js';

const app = createApp();

const startServer = async () => {
  try {
    // Initialize Elasticsearch index asynchronously
    SearchService.initIndex().catch((err) => {
      console.warn('Elasticsearch initialization warning:', err.message);
    });

    app.listen(config.port, () => {
      console.log(`🚀 Server running on http://localhost:${config.port}`);
      console.log(`📡 API v1 mounted at http://localhost:${config.port}/api/v1`);
      console.log(`🩺 Health check at http://localhost:${config.port}/api/v1/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
