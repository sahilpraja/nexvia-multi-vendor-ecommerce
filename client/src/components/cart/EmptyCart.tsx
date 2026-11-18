import React from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight, Sparkles, Compass } from 'lucide-react';

export const EmptyCart: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto py-16 px-4">
      <div className="bg-white rounded-3xl border border-gray-200/90 shadow-sm p-10 sm:p-14 text-center">
        {/* Animated bag illustration */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
            <ShoppingBag className="w-12 h-12 stroke-[1.5]" />
          </div>
          <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
            <Sparkles className="w-4 h-4" />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          Your Shopping Cart is Empty
        </h2>

        <p className="mt-3 text-sm text-gray-500 max-w-md mx-auto leading-relaxed">
          Looks like you haven't added anything to your cart yet. Explore verified top merchants and independent brands on Nexvia.
        </p>

        {/* CTA */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-sm transition shadow-md shadow-blue-500/20 group"
          >
            <Compass className="w-4 h-4 mr-2" />
            <span>Start Shopping Now</span>
            <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Categories */}
        <div className="mt-12 pt-8 border-t border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">
            Popular Categories to Explore
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              'Audio & Headphones',
              'Computers & Laptops',
              'Fitness & Sports',
              'Home Appliances',
              'Cameras & Photography',
            ].map((cat) => (
              <Link
                key={cat}
                to="/"
                className="px-3.5 py-1.5 rounded-full bg-gray-50 hover:bg-blue-50 hover:text-blue-600 text-xs font-semibold text-gray-600 border border-gray-200/80 transition"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
