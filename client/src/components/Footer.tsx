import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-20 py-8 text-center text-sm text-gray-500">
      <div className="max-w-7xl mx-auto px-4">
        <p className="font-medium text-gray-700">Nexvia Multi-Vendor E-Commerce Marketplace (FS-01)</p>
        <p className="mt-1 text-xs">
          Built with React, TypeScript, Tailwind CSS, Express, PostgreSQL, Redis, Elasticsearch & MinIO.
        </p>
      </div>
    </footer>
  );
};
