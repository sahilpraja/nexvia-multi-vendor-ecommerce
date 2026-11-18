import React from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { XCircle, ArrowLeft, RotateCcw, ShieldCheck, ShoppingCart } from 'lucide-react';

export const PaymentCancel: React.FC = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('order_id');
  const navigate = useNavigate();

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-8 sm:p-12 space-y-6">
        {/* Cancel Icon */}
        <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <XCircle className="w-10 h-10 stroke-[2]" />
        </div>

        <div>
          <span className="inline-block text-[11px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 mb-2">
            Payment Cancelled
          </span>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Checkout was not completed
          </h1>
          <p className="mt-2 text-sm text-gray-500 leading-relaxed">
            Your payment session was cancelled and no charges were made to your account. Your items remain safely preserved in your cart.
          </p>
          {orderId && (
            <p className="mt-2 text-xs font-mono text-gray-400">
              Reference Order: #{orderId.slice(0, 8)}
            </p>
          )}
        </div>

        {/* Security reassurance */}
        <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center space-x-3 text-left text-xs text-gray-600">
          <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>Your payment security is guaranteed with Stripe 256-bit encrypted checkout.</span>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/checkout')}
            className="flex-1 py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs transition shadow-md shadow-blue-500/20 flex items-center justify-center space-x-2"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Try Payment Again</span>
          </button>
          <Link
            to="/cart"
            className="py-3.5 px-6 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl text-xs transition flex items-center justify-center space-x-1.5"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Return to Cart</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
