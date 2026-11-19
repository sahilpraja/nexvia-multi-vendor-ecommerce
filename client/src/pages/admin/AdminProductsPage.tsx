import React from 'react';
import { Package, Plus, Search, Filter } from 'lucide-react';

export const AdminProductsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Package className="w-7 h-7 text-blue-600" />
            <span>Product Management</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Search, moderate, edit, and organize all multi-vendor products across the marketplace.
          </p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-gray-200 text-center shadow-sm py-16">
        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Package className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-gray-900">Product Management Module</h3>
        <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
          Detailed product inventory, approval workflows, category mapping, and stock management will be rendered here in Phase 4.
        </p>
      </div>
    </div>
  );
};
