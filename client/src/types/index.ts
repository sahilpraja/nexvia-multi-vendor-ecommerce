export type Role = 'CUSTOMER' | 'VENDOR' | 'ADMIN';
export type VendorStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED';
export type ProductStatus = 'ACTIVE' | 'DRAFT';
export type SubOrderStatus = 'PLACED' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  vendorProfile?: VendorProfile;
}

export interface VendorProfile {
  id: string;
  userId: string;
  storeName: string;
  description?: string;
  status: VendorStatus;
  payoutAccountId?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string;
  children?: Category[];
}

export interface ProductImage {
  id: string;
  url: string;
  position: number;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  stock: number;
  sku: string;
  status: ProductStatus;
  avgRating: number;
  reviewCount: number;
  categoryId: string;
  categoryName?: string;
  category?: Category;
  vendorId: string;
  vendorName?: string;
  vendor?: VendorProfile;
  images?: ProductImage[];
  imageUrl?: string;
  createdAt: string;
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

export interface CartData {
  items: EnrichedCartItem[];
  subtotal: number;
  itemCount: number;
  hasUnavailableItems: boolean;
}

export interface Address {
  id: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  titleSnapshot: string;
  priceSnapshot: number;
  quantity: number;
}

export interface SubOrder {
  id: string;
  orderId: string;
  vendorId: string;
  vendor?: { id: string; storeName: string };
  subtotal: number;
  status: SubOrderStatus;
  packedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  orderItems: OrderItem[];
  createdAt: string;
}

export interface Order {
  id: string;
  customerId: string;
  addressId: string;
  address: Address;
  subtotal: number;
  discount: number;
  total: number;
  paymentStatus: PaymentStatus;
  subOrders: SubOrder[];
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  user: { id: string; name: string };
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'PERCENT' | 'FLAT';
  value: number;
  minOrder: number;
  maxDiscount?: number;
  usageLimit?: number;
  perUserLimit: number;
  expiresAt?: string;
  active: boolean;
}
