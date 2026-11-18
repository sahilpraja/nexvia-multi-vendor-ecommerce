import { SearchService } from '../services/search.service.js';

async function main() {
  console.log('🔄 Rebuilding Elasticsearch indices from PostgreSQL...');
  try {
    await SearchService.reindexAll();
    console.log('✨ Reindex process finished successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Reindex failed:', error);
    process.exit(1);
  }
}

main();
