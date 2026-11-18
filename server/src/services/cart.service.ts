import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiResponse.js';
import { memGet, memSet, memDel } from '../config/redis.js';

export interface CartItemData {
  id?: string;
  productId: string;
  quantity: number;
}

export interface EnrichedCartItem {
  id: string; // cart item ID
  productId: string;
  title: string;
  description?: string;
  sku: string;
  price: number;
  originalPrice: number;
  discountPercentage: number;
  quantity: number;
  stock: number;
  vendorId: string;
  vendorName: string;
  imageUrl?: string;
  isAvailable: boolean;
  unavailableReason?: string;
  itemTotal: number;
}

export interface CartResponse {
  id: string;
  items: EnrichedCartItem[];
  subtotal: number;
  totalOriginalPrice: number;
  productDiscount: number;
  deliveryCharges: number;
  itemCount: number;
  total: number;
  hasUnavailableItems: boolean;
}

export class CartService {
  /**
   * Helper to check if identifier is a database user ID (UUID) or guest key
   */
  private static isUserId(identifier: string): boolean {
    return !identifier.startsWith('guest_');
  }

  /**
   * Get or create a PostgreSQL Cart for an authenticated user
   */
  private static async getOrCreateUserCart(userId: string) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
      });
    }

    return cart;
  }

  /**
   * Fetch the full enriched cart for a given user or guest
   */
  static async getCart(identifier: string): Promise<CartResponse> {
    if (this.isUserId(identifier)) {
      const cart = await this.getOrCreateUserCart(identifier);
      const dbItems = await prisma.cartItem.findMany({
        where: { cartId: cart.id },
        include: {
          product: {
            include: {
              vendor: { select: { id: true, storeName: true, status: true } },
              images: { orderBy: { position: 'asc' }, take: 1 },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return this.formatEnrichedCart(cart.id, dbItems);
    }

    // Guest fallback (in-memory)
    const raw = memGet(`guest_cart:${identifier}`);
    const guestItems: CartItemData[] = raw ? JSON.parse(raw) : [];
    return this.enrichGuestItems(identifier, guestItems);
  }

  /**
   * Add a product to cart (or increase quantity if existing)
   */
  static async addItem(identifier: string, productId: string, quantity: number = 1): Promise<CartResponse> {
    if (quantity < 1) {
      throw ApiError.badRequest('Quantity must be at least 1');
    }

    // 1. Always verify product existence and current stock in PostgreSQL
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { vendor: { select: { status: true } } },
    });

    if (!product || product.deletedAt || product.status !== 'ACTIVE') {
      throw ApiError.badRequest('This product is unavailable or no longer exists');
    }

    if (product.vendor.status !== 'APPROVED') {
      throw ApiError.badRequest('Vendor store is currently not active');
    }

    if (product.stock <= 0) {
      throw ApiError.badRequest(`"${product.title}" is out of stock`);
    }

    if (quantity > product.stock) {
      throw ApiError.badRequest(`Only ${product.stock} units available in stock`);
    }

    if (this.isUserId(identifier)) {
      const cart = await this.getOrCreateUserCart(identifier);

      // Atomic transaction for safe concurrent updates
      await prisma.$transaction(async (tx) => {
        const existingItem = await tx.cartItem.findUnique({
          where: {
            cartId_productId: {
              cartId: cart.id,
              productId,
            },
          },
        });

        if (existingItem) {
          const newQty = existingItem.quantity + quantity;
          if (newQty > product.stock) {
            throw ApiError.badRequest(
              `Cannot add ${quantity} more. You already have ${existingItem.quantity} in cart and only ${product.stock} are available.`
            );
          }

          await tx.cartItem.update({
            where: { id: existingItem.id },
            data: { quantity: newQty },
          });
        } else {
          await tx.cartItem.create({
            data: {
              cartId: cart.id,
              productId,
              quantity,
            },
          });
        }
      });

      return this.getCart(identifier);
    }

    // Guest memory cart
    const raw = memGet(`guest_cart:${identifier}`);
    const items: CartItemData[] = raw ? JSON.parse(raw) : [];
    const existing = items.find((i) => i.productId === productId);

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > product.stock) {
        throw ApiError.badRequest(`Cannot exceed available stock (${product.stock})`);
      }
      existing.quantity = newQty;
    } else {
      items.push({
        id: `guest-item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId,
        quantity,
      });
    }

    memSet(`guest_cart:${identifier}`, JSON.stringify(items), 7 * 24 * 3600);
    return this.enrichGuestItems(identifier, items);
  }

  /**
   * Update item quantity (item identifier can be CartItem ID or Product ID)
   */
  static async updateQuantity(identifier: string, itemOrProductId: string, quantity: number): Promise<CartResponse> {
    if (quantity < 1) {
      throw ApiError.badRequest('Quantity must be at least 1');
    }

    if (this.isUserId(identifier)) {
      const cart = await this.getOrCreateUserCart(identifier);

      // Find item either by CartItem ID or by productId for this cart
      const item = await prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          OR: [{ id: itemOrProductId }, { productId: itemOrProductId }],
        },
        include: { product: true },
      });

      if (!item) {
        throw ApiError.notFound('Item not found in your cart');
      }

      if (quantity > item.product.stock) {
        throw ApiError.badRequest(
          `Requested quantity (${quantity}) exceeds available stock (${item.product.stock})`
        );
      }

      await prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity },
      });

      return this.getCart(identifier);
    }

    // Guest memory cart
    const raw = memGet(`guest_cart:${identifier}`);
    const items: CartItemData[] = raw ? JSON.parse(raw) : [];
    const item = items.find((i) => i.id === itemOrProductId || i.productId === itemOrProductId);

    if (!item) {
      throw ApiError.notFound('Item not found in cart');
    }

    const prod = await prisma.product.findUnique({ where: { id: item.productId } });
    if (prod && quantity > prod.stock) {
      throw ApiError.badRequest(`Requested quantity exceeds available stock (${prod.stock})`);
    }

    item.quantity = quantity;
    memSet(`guest_cart:${identifier}`, JSON.stringify(items), 7 * 24 * 3600);
    return this.enrichGuestItems(identifier, items);
  }

  /**
   * Remove item from cart
   */
  static async removeItem(identifier: string, itemOrProductId: string): Promise<CartResponse> {
    if (this.isUserId(identifier)) {
      const cart = await this.getOrCreateUserCart(identifier);

      const item = await prisma.cartItem.findFirst({
        where: {
          cartId: cart.id,
          OR: [{ id: itemOrProductId }, { productId: itemOrProductId }],
        },
      });

      if (item) {
        await prisma.cartItem.delete({
          where: { id: item.id },
        });
      }

      return this.getCart(identifier);
    }

    // Guest memory cart
    const raw = memGet(`guest_cart:${identifier}`);
    let items: CartItemData[] = raw ? JSON.parse(raw) : [];
    items = items.filter((i) => i.id !== itemOrProductId && i.productId !== itemOrProductId);
    memSet(`guest_cart:${identifier}`, JSON.stringify(items), 7 * 24 * 3600);
    return this.enrichGuestItems(identifier, items);
  }

  /**
   * Clear all items from cart
   */
  static async clearCart(identifier: string): Promise<void> {
    if (this.isUserId(identifier)) {
      const cart = await prisma.cart.findUnique({
        where: { userId: identifier },
      });

      if (cart) {
        await prisma.cartItem.deleteMany({
          where: { cartId: cart.id },
        });
      }
      return;
    }

    memDel(`guest_cart:${identifier}`);
  }

  /**
   * Merge guest items into authenticated user's PostgreSQL cart upon login
   */
  static async mergeGuestCart(guestId: string, userId: string): Promise<void> {
    try {
      const raw = memGet(`guest_cart:${guestId}`);
      if (!raw) return;

      const guestItems: CartItemData[] = JSON.parse(raw);
      if (guestItems.length === 0) return;

      const userCart = await this.getOrCreateUserCart(userId);

      for (const gItem of guestItems) {
        const prod = await prisma.product.findUnique({ where: { id: gItem.productId } });
        if (!prod || prod.deletedAt || prod.status !== 'ACTIVE') continue;

        const existing = await prisma.cartItem.findUnique({
          where: {
            cartId_productId: {
              cartId: userCart.id,
              productId: gItem.productId,
            },
          },
        });

        if (existing) {
          const mergedQty = Math.min(prod.stock, existing.quantity + gItem.quantity);
          await prisma.cartItem.update({
            where: { id: existing.id },
            data: { quantity: mergedQty },
          });
        } else {
          const validQty = Math.min(prod.stock, gItem.quantity);
          if (validQty > 0) {
            await prisma.cartItem.create({
              data: {
                cartId: userCart.id,
                productId: gItem.productId,
                quantity: validQty,
              },
            });
          }
        }
      }

      memDel(`guest_cart:${guestId}`);
    } catch (err: any) {
      console.warn('⚠️  Cart merge error:', err.message);
    }
  }

  /**
   * Format and calculate cart totals for DB items
   */
  private static formatEnrichedCart(cartId: string, dbItems: any[]): CartResponse {
    let subtotal = 0;
    let totalOriginalPrice = 0;
    let hasUnavailableItems = false;
    let itemCount = 0;

    const items: EnrichedCartItem[] = dbItems.map((item) => {
      const prod = item.product;
      const isAvailable =
        Boolean(prod) &&
        !prod.deletedAt &&
        prod.status === 'ACTIVE' &&
        prod.vendor.status === 'APPROVED' &&
        prod.stock >= item.quantity;

      let unavailableReason: string | undefined;
      if (!prod || prod.deletedAt || prod.status !== 'ACTIVE' || prod.vendor?.status !== 'APPROVED') {
        unavailableReason = 'Product is no longer available';
        hasUnavailableItems = true;
      } else if (prod.stock < item.quantity) {
        unavailableReason = prod.stock === 0 ? 'Out of stock' : `Only ${prod.stock} items left in stock`;
        hasUnavailableItems = true;
      }

      const price = prod ? Number(prod.price) : 0;
      // Calculate realistic modern discount presentation: 15% promotional markup on retail
      const originalPrice = Math.round(price * 1.15 * 100) / 100;
      const discountPercentage = 15;
      const itemTotal = isAvailable ? price * item.quantity : 0;

      if (isAvailable) {
        subtotal += itemTotal;
        totalOriginalPrice += originalPrice * item.quantity;
        itemCount += item.quantity;
      }

      return {
        id: item.id,
        productId: item.productId,
        title: prod?.title || 'Unavailable Product',
        description: prod?.description || '',
        sku: prod?.sku || '',
        price,
        originalPrice,
        discountPercentage,
        quantity: item.quantity,
        stock: prod?.stock || 0,
        vendorId: prod?.vendorId || '',
        vendorName: prod?.vendor?.storeName || 'Merchant',
        imageUrl: prod?.images?.[0]?.url,
        isAvailable,
        unavailableReason,
        itemTotal: Math.round(itemTotal * 100) / 100,
      };
    });

    const roundedSubtotal = Math.round(subtotal * 100) / 100;
    const roundedOriginalTotal = Math.round(totalOriginalPrice * 100) / 100;
    const productDiscount = Math.max(0, Math.round((roundedOriginalTotal - roundedSubtotal) * 100) / 100);
    const deliveryCharges = roundedSubtotal === 0 || roundedSubtotal >= 100 ? 0 : 9.99;
    const total = Math.round((roundedSubtotal + deliveryCharges) * 100) / 100;

    return {
      id: cartId,
      items,
      subtotal: roundedSubtotal,
      totalOriginalPrice: roundedOriginalTotal,
      productDiscount,
      deliveryCharges,
      itemCount,
      total,
      hasUnavailableItems,
    };
  }

  /**
   * Helper for guest in-memory items
   */
  private static async enrichGuestItems(guestId: string, guestItems: CartItemData[]): Promise<CartResponse> {
    if (guestItems.length === 0) {
      return {
        id: guestId,
        items: [],
        subtotal: 0,
        totalOriginalPrice: 0,
        productDiscount: 0,
        deliveryCharges: 0,
        itemCount: 0,
        total: 0,
        hasUnavailableItems: false,
      };
    }

    const productIds = guestItems.map((g) => g.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        vendor: { select: { id: true, storeName: true, status: true } },
        images: { orderBy: { position: 'asc' }, take: 1 },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    const formattedDbItems = guestItems.map((g) => ({
      id: g.id || g.productId,
      productId: g.productId,
      quantity: g.quantity,
      product: productMap.get(g.productId),
    }));

    return this.formatEnrichedCart(guestId, formattedDbItems);
  }
}
