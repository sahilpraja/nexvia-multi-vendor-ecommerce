import { es } from '../config/elasticsearch.js';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';

export interface SearchProductParams {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  vendorId?: string;
  minRating?: number;
  inStock?: boolean;
  sort?: 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'rating';
  page?: number;
  limit?: number;
}

export class SearchService {
  private static indexName = config.elasticsearchIndex;

  static async initIndex() {
    try {
      const exists = await es.indices.exists({ index: this.indexName });
      if (!exists) {
        await es.indices.create({
          index: this.indexName,
          body: {
            settings: {
              analysis: {
                analyzer: {
                  autocomplete_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'autocomplete_filter'],
                  },
                },
                filter: {
                  autocomplete_filter: {
                    type: 'edge_ngram',
                    min_gram: 2,
                    max_gram: 15,
                  },
                },
              },
            },
            mappings: {
              properties: {
                id: { type: 'keyword' },
                title: {
                  type: 'text',
                  fields: {
                    autocomplete: {
                      type: 'text',
                      analyzer: 'autocomplete_analyzer',
                      search_analyzer: 'standard',
                    },
                  },
                },
                description: { type: 'text' },
                categoryName: { type: 'keyword' },
                categoryId: { type: 'keyword' },
                vendorId: { type: 'keyword' },
                vendorName: { type: 'text' },
                price: { type: 'float' },
                stock: { type: 'integer' },
                avgRating: { type: 'float' },
                reviewCount: { type: 'integer' },
                status: { type: 'keyword' },
                deletedAt: { type: 'date' },
                createdAt: { type: 'date' },
                imageUrl: { type: 'keyword' },
              },
            },
          },
        });
        console.log('✅ Elasticsearch index created successfully');
      }
    } catch (err: any) {
      console.warn('⚠️  Elasticsearch initIndex skipped/unavailable:', err.message);
    }
  }

  static async indexProduct(productId: string) {
    try {
      const product = await prisma.product.findUnique({
        where: { id: productId },
        include: {
          category: true,
          vendor: true,
          images: { orderBy: { position: 'asc' }, take: 1 },
        },
      });

      if (!product || product.deletedAt || product.status !== 'ACTIVE') {
        await this.removeProduct(productId);
        return;
      }

      await es.index({
        index: this.indexName,
        id: product.id,
        document: {
          id: product.id,
          title: product.title,
          description: product.description,
          categoryName: product.category.name,
          categoryId: product.categoryId,
          vendorId: product.vendorId,
          vendorName: product.vendor.storeName,
          price: Number(product.price),
          stock: product.stock,
          avgRating: product.avgRating,
          reviewCount: product.reviewCount,
          status: product.status,
          deletedAt: product.deletedAt,
          createdAt: product.createdAt,
          imageUrl: product.images[0]?.url || null,
        },
      });
    } catch (err: any) {
      console.warn('⚠️  Elasticsearch indexProduct failed:', err.message);
    }
  }

  static async removeProduct(productId: string) {
    try {
      await es.delete({
        index: this.indexName,
        id: productId,
      });
    } catch {
      // Ignore if document not found
    }
  }

  static async search(params: SearchProductParams) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(50, Math.max(1, params.limit || 12));
    const from = (page - 1) * limit;

    try {
      // Attempt Elasticsearch search
      const mustClauses: any[] = [{ term: { status: 'ACTIVE' } }];
      const filterClauses: any[] = [];

      if (params.q) {
        mustClauses.push({
          multi_match: {
            query: params.q,
            fields: ['title^3', 'title.autocomplete^2', 'description', 'categoryName^2'],
            fuzziness: 'AUTO',
          },
        });
      }

      if (params.category) {
        filterClauses.push({
          bool: {
            should: [
              { term: { categoryId: params.category } },
              { term: { categoryName: params.category } },
            ],
          },
        });
      }

      if (params.vendorId) {
        filterClauses.push({ term: { vendorId: params.vendorId } });
      }

      if (params.inStock) {
        filterClauses.push({ range: { stock: { gt: 0 } } });
      }

      if (params.minPrice !== undefined || params.maxPrice !== undefined) {
        const priceRange: any = {};
        if (params.minPrice !== undefined) priceRange.gte = params.minPrice;
        if (params.maxPrice !== undefined) priceRange.lte = params.maxPrice;
        filterClauses.push({ range: { price: priceRange } });
      }

      if (params.minRating !== undefined) {
        filterClauses.push({ range: { avgRating: { gte: params.minRating } } });
      }

      const sortRules: any[] = [];
      switch (params.sort) {
        case 'price_asc':
          sortRules.push({ price: { order: 'asc' } });
          break;
        case 'price_desc':
          sortRules.push({ price: { order: 'desc' } });
          break;
        case 'newest':
          sortRules.push({ createdAt: { order: 'desc' } });
          break;
        case 'rating':
          sortRules.push({ avgRating: { order: 'desc' } });
          break;
        default:
          if (params.q) {
            sortRules.push({ _score: { order: 'desc' } });
          } else {
            sortRules.push({ createdAt: { order: 'desc' } });
          }
      }

      const response = await es.search({
        index: this.indexName,
        from,
        size: limit,
        query: {
          bool: {
            must: mustClauses,
            filter: filterClauses,
          },
        },
        sort: sortRules,
        aggs: {
          categories: {
            terms: { field: 'categoryName', size: 10 },
          },
        },
      });

      const totalHits =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0;

      const products = response.hits.hits.map((hit: any) => hit._source);
      const facets = {
        categories: (response.aggregations?.categories as any)?.buckets || [],
      };

      return {
        products,
        facets,
        pagination: {
          total: totalHits,
          page,
          limit,
          totalPages: Math.ceil(totalHits / limit),
        },
        source: 'elasticsearch',
      };
    } catch {
      // Graceful fallback to PostgreSQL query
      return this.searchPostgresFallback(params, page, limit);
    }
  }

  private static async searchPostgresFallback(
    params: SearchProductParams,
    page: number,
    limit: number
  ) {
    const where: any = {
      status: 'ACTIVE',
      deletedAt: null,
    };

    if (params.q) {
      where.OR = [
        { title: { contains: params.q, mode: 'insensitive' } },
        { description: { contains: params.q, mode: 'insensitive' } },
        { category: { name: { contains: params.q, mode: 'insensitive' } } },
      ];
    }

    if (params.category) {
      where.OR = [
        ...(where.OR || []),
        { categoryId: params.category },
        { category: { name: { equals: params.category, mode: 'insensitive' } } },
      ];
    }

    if (params.vendorId) {
      where.vendorId = params.vendorId;
    }

    if (params.inStock) {
      where.stock = { gt: 0 };
    }

    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      where.price = {};
      if (params.minPrice !== undefined) where.price.gte = params.minPrice;
      if (params.maxPrice !== undefined) where.price.lte = params.maxPrice;
    }

    if (params.minRating !== undefined) {
      where.avgRating = { gte: params.minRating };
    }

    let orderBy: any = { createdAt: 'desc' };
    if (params.sort === 'price_asc') orderBy = { price: 'asc' };
    if (params.sort === 'price_desc') orderBy = { price: 'desc' };
    if (params.sort === 'rating') orderBy = { avgRating: 'desc' };

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        include: {
          category: true,
          vendor: { select: { id: true, storeName: true } },
          images: { orderBy: { position: 'asc' }, take: 1 },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    const products = items.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      price: Number(p.price),
      stock: p.stock,
      sku: p.sku,
      avgRating: p.avgRating,
      reviewCount: p.reviewCount,
      categoryId: p.categoryId,
      categoryName: p.category.name,
      vendorId: p.vendorId,
      vendorName: p.vendor.storeName,
      imageUrl: p.images[0]?.url || null,
      createdAt: p.createdAt,
    }));

    return {
      products,
      facets: { categories: [] },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      source: 'postgres_fallback',
    };
  }

  static async reindexAll() {
    await this.initIndex();
    const products = await prisma.product.findMany({
      where: { deletedAt: null, status: 'ACTIVE' },
      select: { id: true },
    });

    console.log(`Starting reindex of ${products.length} products...`);
    for (const p of products) {
      await this.indexProduct(p.id);
    }
    console.log('✅ Reindexing completed');
  }
}
