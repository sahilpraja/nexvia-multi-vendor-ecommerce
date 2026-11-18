import React from 'react';
import { Minus, Plus, Loader2 } from 'lucide-react';

interface QuantitySelectorProps {
  quantity: number;
  maxStock: number;
  loading?: boolean;
  onIncrease: () => void;
  onDecrease: () => void;
}

export const QuantitySelector: React.FC<QuantitySelectorProps> = ({
  quantity,
  maxStock,
  loading = false,
  onIncrease,
  onDecrease,
}) => {
  const isMin = quantity <= 1;
  const isMax = quantity >= maxStock;

  return (
    <div className="inline-flex items-center bg-gray-50 border border-gray-200 rounded-xl p-0.5 shadow-sm">
      <button
        type="button"
        onClick={onDecrease}
        disabled={isMin || loading}
        aria-label="Decrease quantity"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-white transition disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      <div className="w-10 text-center flex items-center justify-center">
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
        ) : (
          <span className="text-xs font-bold text-gray-900 select-none">{quantity}</span>
        )}
      </div>

      <button
        type="button"
        onClick={onIncrease}
        disabled={isMax || loading}
        aria-label="Increase quantity"
        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-white transition disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
