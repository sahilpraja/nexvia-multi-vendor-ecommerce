import React from 'react';
import { FolderTree, Plus, Search } from 'lucide-react';

export const AdminCategoriesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <FolderTree className="w-7 h-7 text-indigo-600" />
            <span>Category Management</span>
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Create, edit, nest, and organize marketplace categories with safety deletion guards.
          </p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-gray-200 text-center shadow-sm py-16">
        <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <FolderTree className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-gray-900">Category Management Module</h3>
        <p className="text-xs text-gray-500 max-w-md mx-auto mt-1">
          Complete CRUD operations, slug generator, and parent-child hierarchy tree will be rendered here in Phase 5.
        </p>
      </div>
    </div>
  );
};
