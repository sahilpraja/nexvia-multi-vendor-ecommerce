import { redis } from '../config/redis.js';
import { prisma } from '../config/prisma.js';

export interface CartItem {
  productId: string;
  quantity: number;
  addedAt: string;
}

export interface EnrichedCartItem {
  productId: string;
  title: string;
  price: number;
  quantity: number;
  stock: number;
  vendorId: string;
  vendorName: string;
  imageUrl?: string;
  isAvailable: boolean;
  unavailableReason?: string;
  itemTotal: number;
}

const CART_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

export class CartService {
  private static getKey(identifier: string) {
    return `cart:${identifier}`;
  }

  static async getCart(identifier: string) {
    const key = this.getKey(identifier);
    let rawItems: string | null = null;

    try {
      rawItems = await redis.get(key);
      if (rawItems) {
        // Refresh TTL on activity
        await redis.expire(key, CART_TTL_SECONDS);
      }
    } catch {
      // Degraded / fallback
    }

    const items: CartItem[] = rawItems ? JSON.parse(rawItems) : [];
    return this.enrichAndValidateCart(items);
  }

  static async addItem(identifier: string, productId: string, quantity: number) {
    const key = this.getKey(identifier);
    let items: CartItem[] = [];

    try {
      const raw = await redis.get(key);
      if (raw) items = JSON.parse(raw);

      const existingIndex = items.findIndex((i) => i.productId === productId);
      if (existingIndex > -1) {
        items[existingIndex].quantity += quantity;
      } else {
        items.push({
          productId,
          quantity,
          addedAt: new Date().toISOString(),
        });
      }

      await redis.set(key, JSON.stringify(items), 'EX', CART_TTL_SECONDS);
    } catch {
      // Degraded
    }

    return this.enrichAndValidateCart(items);
  }

  static async updateQuantity(identifier: string, productId: string, quantity: number) {
    const key = this.getKey(identifier);
    let items: CartItem[] = [];

    try {
      const raw = await redis.get(key);
      if (raw) items = JSON.parse(raw);

      if (quantity <= 0) {
        items = items.filter((i) => i.productId !== productId);
      } else {
        const item = items.find((i) => i.productId === productId);
        if (item) {
          item.quantity = quantity;
        }
      }

      await redis.set(key, JSON.stringify(items), 'EX', CART_TTL_SECONDS);
    } catch {
      // Degraded
    }

    return this.enrichAndValidateCart(items);
  }

  static async removeItem(identifier: string, productId: string) {
    const key = this.getKey(identifier);
    let items: CartItem[] = [];

    try {
      const raw = await redis.get(key);
      if (raw) items = JSON.parse(raw);
      items = items.filter((i) => i.productId !== productId);
      await redis.set(key, JSON.stringify(items), 'EX', CART_TTL_SECONDS);
    } catch {
      // Degraded
    }

    return this.enrichAndValidateCart(items);
  }

  static async clearCart(identifier: string) {
    const key = this.getKey(identifier);
    try {
      await redis.del(key);
    } catch {
      // Degraded
    }
  }

  static async mergeGuestCart(guestId: string, userId: string) {
    try {
      const guestKey = this.getKey(guestId);
      const userKey = this.getKey(userId);

      const [guestRaw, userRaw] = await Promise.all([
        redis.get(guestKey),
        redis.get(userKey),
      ]);

      if (!guestRaw) return;

      const guestItems: CartItem[] = JSON.parse(guestRaw);
      const userItems: CartItem[] = userRaw ? JSON.parse(userRaw) : [];

      for (const gItem of guestItems) {
        const existing = userItems.find((u) => u.productId === gItem.productId);
        if (existing) {
          existing.quantity += gItem.quantity;
        } else {
          userItems.push(gItem);
        }
      }

      await redis.set(userKey, JSON.stringify(userItems), 'EX', CART_TTL_SECONDS);
      await redis.del(guestKey);
    } catch (err: any) {
      console.warn('⚠️  Cart merge error:', err.message);
    }
  }

  private static async enrichAndValidateCart(items: CartItem[]) {
    if (items.length === 0) {
      return {
        items: [],
        subtotal: 0,
        itemCount: 0,
        hasUnavailableItems: false,
      };
    }

    const productIds = items.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        vendor: { select: { id: true, storeName: true, status: true } },
        images: { orderBy: { position: 'asc' }, take: 1 },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const enrichedItems: EnrichedCartItem[] = [];
    let subtotal = 0;
    let hasUnavailableItems = false;

    for (const item of items) {
      const prod = productMap.get(item.productId);

      if (!prod || prod.deletedAt || prod.status !== 'ACTIVE' || prod.vendor.status !== 'APPROVED') {
        hasUnavailableItems = true;
        enrichedItems.push({
          productId: item.productId,
          title: prod?.title || 'Unavailable Product',
          price: prod ? Number(prod.price) : 0,
          quantity: item.quantity,
          stock: prod?.stock || 0,
          vendorId: prod?.vendorId || '',
          vendorName: prod?.vendor.storeName || 'Unknown Vendor',
          imageUrl: prod?.images[0]?.url,
          isAvailable: false,
          unavailableReason: 'Product is no longer available',
          itemTotal: 0,
        });
        continue;
      }

      const isStockSufficient = prod.stock >= item.quantity;
      if (!isStockSufficient) {
        hasUnavailableItems = true;
      }

      const price = Number(prod.price);
      const itemTotal = price * item.quantity;
      subtotal += itemTotal;

      enrichedItems.push({
        productId: prod.id,
        title: prod.title,
        price,
        quantity: item.quantity,
        stock: prod.stock,
        vendorId: prod.vendorId,
        vendorName: prod.vendor.storeName,
        imageUrl: prod.images[0]?.url,
        isAvailable: isStockSufficient,
        unavailableReason: isStockSufficient ? undefined : `Only ${prod.stock} items remaining in stock`,
        itemTotal,
      });
    }

    return {
      items: enrichedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      itemCount: enrichedItems.reduce((acc, i) => acc + i.quantity, 0),
      hasUnavailableItems,
    };
  }
}
