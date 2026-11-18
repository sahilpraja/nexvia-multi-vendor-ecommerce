import { Client } from '@elastic/elasticsearch';
import { config } from './index.js';

let esClient: Client | null = null;

export const getElasticsearchClient = (): Client => {
  if (!esClient) {
    esClient = new Client({
      node: config.elasticsearchUrl,
      maxRetries: 3,
      requestTimeout: 3000,
    });
  }
  return esClient;
};

export const es = getElasticsearchClient();
