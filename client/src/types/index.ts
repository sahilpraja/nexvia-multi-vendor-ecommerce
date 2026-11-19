export type Role = 'CUSTOMER' | 'VENDOR' | 'ADMIN';
export type VendorStatus = 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
export type ProductStatus = 'ACTIVE' | 'DRAFT' | 'PENDING' | 'REJECTED';
export type SubOrderStatus = 'PLACED' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
export type PaymentStatus =
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'COD_PENDING';

export type PaymentMethod = 'STRIPE' | 'COD';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  vendorProfile?: VendorProfile;
  addresses?: Address[];
}

export interface VendorProfile {
  id: string;
  userId: string;
  storeName: string;
  description?: string;
  status: VendorStatus;
  rejectionReason?: string;
  payoutAccountId?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  status?: string;
  parentId?: string;
  children?: Category[];
  _count?: { products: number };
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
  reviews?: Review[];
  createdAt: string;
}

export interface EnrichedCartItem {
  id?: string;
  productId: string;
  title: string;
  description?: string;
  sku?: string;
  price: number;
  originalPrice?: number;
  discountPercentage?: number;
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
  id?: string;
  items: EnrichedCartItem[];
  subtotal: number;
  totalOriginalPrice?: number;
  productDiscount?: number;
  deliveryCharges?: number;
  itemCount: number;
  total?: number;
  hasUnavailableItems: boolean;
}

export interface Address {
  id: string;
  userId?: string;
  fullName?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
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

export type OrderStatusType =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED'
  | 'REFUNDED'
  | 'PAYMENT_FAILED';

export interface OrderStatusHistory {
  id: string;
  orderId: string;
  status: OrderStatusType;
  courierName?: string;
  trackingNumber?: string;
  note?: string;
  updatedBy?: string;
  createdAt: string;
}

export interface PaymentInfo {
  id: string;
  orderId: string;
  paymentMethod: PaymentMethod;
  providerPaymentId?: string;
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  codCollectedAt?: string;
  codCollectedBy?: string;
  refundedAmount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Order {
  id: string;
  customerId: string;
  customer?: { id: string; name: string; email: string };
  addressId: string;
  address: Address;
  subtotal: number;
  discount: number;
  total: number;
  currency?: string;
  paymentMethod?: PaymentMethod;
  codCharges?: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatusType;
  courierName?: string;
  trackingNumber?: string;
  payment?: PaymentInfo;
  subOrders: SubOrder[];
  statusHistories?: OrderStatusHistory[];
  createdAt: string;
  updatedAt?: string;
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
