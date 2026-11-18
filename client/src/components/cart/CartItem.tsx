import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Bookmark, AlertTriangle, Store, ShieldCheck } from 'lucide-react';
import { EnrichedCartItem } from '../../types/index.js';
import { QuantitySelector } from './QuantitySelector.js';

interface CartItemProps {
  item: EnrichedCartItem;
  loading?: boolean;
  onUpdateQuantity: (newQuantity: number) => void;
  onRemove: () => void;
}

export const CartItemComponent: React.FC<CartItemProps> = ({
  item,
  loading = false,
  onUpdateQuantity,
  onRemove,
}) => {
  const [savedForLater, setSavedForLater] = useState(false);

  const fallbackImage =
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400';

  return (
    <div
      className={`relative bg-white rounded-2xl border p-5 sm:p-6 transition-all duration-200 shadow-sm hover:shadow-md ${
        !item.isAvailable
          ? 'border-red-200 bg-red-50/15'
          : 'border-gray-200/90 hover:border-gray-300'
      }`}
    >
      <div className="flex flex-col sm:flex-row gap-5">
        {/* Product Image */}
        <Link
          to={`/products/${item.productId}`}
          className="relative w-full sm:w-28 sm:h-28 aspect-square sm:aspect-auto rounded-xl overflow-hidden bg-gray-50 border border-gray-100 flex-shrink-0 group"
        >
          <img
            src={item.imageUrl || fallbackImage}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          {item.discountPercentage && item.discountPercentage > 0 && (
            <span className="absolute top-2 left-2 bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-sm">
              {item.discountPercentage}% OFF
            </span>
          )}
        </Link>

        {/* Details & Actions */}
        <div className="flex-1 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center text-[11px] font-bold text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded-md uppercase tracking-wider">
                <Store className="w-3 h-3 mr-1 text-blue-500" />
                {item.vendorName || 'Independent Vendor'}
              </span>
              {item.sku && (
                <span className="text-[11px] font-medium text-gray-400">
                  SKU: {item.sku}
                </span>
              )}
            </div>

            <Link
              to={`/products/${item.productId}`}
              className="mt-1 block text-base font-bold text-gray-900 hover:text-blue-600 transition line-clamp-1"
            >
              {item.title}
            </Link>

            {item.description && (
              <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                {item.description}
              </p>
            )}

            {/* Unavailable / Low Stock Alert */}
            {!item.isAvailable && (
              <div className="mt-2.5 inline-flex items-center px-2.5 py-1 rounded-lg bg-red-100/70 text-red-700 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" />
                <span>{item.unavailableReason || 'Currently unavailable'}</span>
              </div>
            )}
            {item.isAvailable && item.stock <= 5 && (
              <p className="mt-1 text-[11px] font-bold text-amber-600">
                Only {item.stock} left in stock - order soon
              </p>
            )}
          </div>

          {/* Pricing & Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-gray-100">
            {/* Price section */}
            <div className="flex items-baseline space-x-2">
              <span className="text-lg font-black text-gray-900">
                ${Number(item.price).toFixed(2)}
              </span>
              {item.originalPrice && item.originalPrice > item.price && (
                <span className="text-xs font-medium text-gray-400 line-through">
                  ${Number(item.originalPrice).toFixed(2)}
                </span>
              )}
            </div>

            {/* Quantity Selector & Item Total */}
            <div className="flex items-center space-x-4">
              <QuantitySelector
                quantity={item.quantity}
                maxStock={item.stock}
                loading={loading}
                onIncrease={() => onUpdateQuantity(item.quantity + 1)}
                onDecrease={() => onUpdateQuantity(item.quantity - 1)}
              />

              <div className="text-right min-w-[70px]">
                <span className="block text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                  Item Total
                </span>
                <span className="text-sm font-black text-gray-900">
                  ${item.itemTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Actions: Save for later & Remove */}
          <div className="flex items-center justify-between pt-2 text-xs">
            <button
              type="button"
              onClick={() => setSavedForLater(!savedForLater)}
              className="inline-flex items-center text-gray-500 hover:text-blue-600 font-medium transition"
            >
              <Bookmark
                className={`w-3.5 h-3.5 mr-1 ${
                  savedForLater ? 'fill-blue-600 text-blue-600' : ''
                }`}
              />
              <span>{savedForLater ? 'Saved for Later' : 'Save for Later'}</span>
            </button>

            <button
              type="button"
              onClick={onRemove}
              disabled={loading}
              className="inline-flex items-center text-gray-400 hover:text-red-600 font-semibold transition px-2 py-1 rounded-lg hover:bg-red-50 disabled:opacity-40"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              <span>Remove</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
