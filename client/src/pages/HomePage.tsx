import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, Star, ShoppingBag, CheckCircle, ShieldCheck } from 'lucide-react';
import { api } from '../api/client.js';
import { Product, Category } from '../types/index.js';
import { useCart } from '../context/CartContext.js';

export const HomePage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortOption, setSortOption] = useState('relevance');
  const [minRating, setMinRating] = useState<number | undefined>();
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const { addToCart } = useCart();
  const [addingId, setAddingId] = useState<string | null>(null);

  // Fetch Categories
  useEffect(() => {
    api.get('/categories')
      .then((res) => setCategories(res.data.data))
      .catch(() => {});
  }, []);

  // Fetch Products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        limit: 12,
        sort: sortOption,
      };

      if (searchQuery) params.q = searchQuery;
      if (selectedCategory) params.category = selectedCategory;
      if (inStockOnly) params.inStock = true;
      if (minRating) params.minRating = minRating;

      const res = await api.get('/products', { params });
      setProducts(res.data.data.products);
      setTotalPages(res.data.data.pagination.totalPages);
      setTotalCount(res.data.data.pagination.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, inStockOnly, sortOption, minRating, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleQuickAdd = async (productId: string) => {
    try {
      setAddingId(productId);
      await addToCart(productId, 1);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-3xl p-8 sm:p-12 mb-10 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md text-blue-100 mb-4">
            <ShieldCheck className="w-4 h-4 mr-1.5 text-blue-300" /> Multi-Vendor Verified Marketplace
          </span>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            Discover Exceptional Products from Top Independent Vendors
          </h1>
          <p className="mt-4 text-blue-100 text-base sm:text-lg">
            Directly supporting vetted merchants with transparent checkout and split fulfillment.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-xl">
            <div className="relative flex-grow">
              <Search className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search headphones, laptops, apparel, sneakers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 shadow-lg text-sm"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-blue-500 hover:bg-blue-600 font-semibold rounded-xl transition text-white shadow-md flex items-center justify-center space-x-2 text-sm"
            >
              <span>Search</span>
            </button>
          </form>
        </div>
      </div>

      {/* Main Filter & Products Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1 space-y-6 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm h-fit">
          <div className="flex items-center justify-between pb-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900 flex items-center">
              <SlidersHorizontal className="w-4 h-4 mr-2 text-blue-600" /> Filters
            </h2>
            <button
              onClick={() => {
                setSelectedCategory('');
                setInStockOnly(false);
                setMinRating(undefined);
                setSearchQuery('');
                setSortOption('relevance');
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Reset All
            </button>
          </div>

          {/* Categories Filter */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Categories</h3>
            <div className="space-y-2">
              <button
                onClick={() => { setSelectedCategory(''); setPage(1); }}
                className={`w-full text-left text-sm py-1.5 px-3 rounded-lg transition ${
                  selectedCategory === ''
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.name); setPage(1); }}
                  className={`w-full text-left text-sm py-1.5 px-3 rounded-lg transition ${
                    selectedCategory === cat.name
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Availability */}
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Availability</h3>
            <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => { setInStockOnly(e.target.checked); setPage(1); }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>In-stock items only</span>
            </label>
          </div>

          {/* Customer Rating Filter */}
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Minimum Rating</h3>
            <div className="space-y-1.5">
              {[4, 3, 2].map((rating) => (
                <button
                  key={rating}
                  onClick={() => { setMinRating(minRating === rating ? undefined : rating); setPage(1); }}
                  className={`w-full flex items-center justify-between text-xs py-1.5 px-2 rounded-lg transition ${
                    minRating === rating ? 'bg-amber-50 text-amber-900 font-semibold' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                      />
                    ))}
                    <span className="ml-2 text-gray-700">& up</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Product Grid & Controls */}
        <div className="lg:col-span-3">
          {/* Top Sort & Count Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 mb-6 border-b border-gray-200 gap-3">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{products.length}</span> of{' '}
              <span className="font-semibold text-gray-900">{totalCount}</span> products
            </p>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-gray-500">Sort by:</span>
              <select
                value={sortOption}
                onChange={(e) => { setSortOption(e.target.value); setPage(1); }}
                className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="relevance">Relevance</option>
                <option value="newest">Newest Arrivals</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>

          {/* Product Items */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="bg-white rounded-2xl p-4 border border-gray-100 animate-pulse">
                  <div className="bg-gray-200 h-48 rounded-xl mb-4"></div>
                  <div className="bg-gray-200 h-4 rounded w-3/4 mb-2"></div>
                  <div className="bg-gray-200 h-4 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-200">
              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-gray-800">No matching products found</h3>
              <p className="text-sm text-gray-500 mt-1">Try broadening your search or adjusting filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {products.map((product) => {
                const img = product.imageUrl || product.images?.[0]?.url || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';
                const isOutOfStock = product.stock <= 0;

                return (
                  <div
                    key={product.id}
                    className="group bg-white rounded-2xl border border-gray-200/80 hover:border-blue-300 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Product Image */}
                      <Link to={`/products/${product.id}`} className="block relative aspect-square bg-gray-50 overflow-hidden">
                        <img
                          src={img}
                          alt={product.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        {isOutOfStock && (
                          <div className="absolute top-3 left-3 bg-red-600/90 backdrop-blur-sm text-white text-[11px] font-bold px-2 py-0.5 rounded-full uppercase">
                            Out of Stock
                          </div>
                        )}
                        {product.stock > 0 && product.stock <= 5 && (
                          <div className="absolute top-3 left-3 bg-amber-500/90 backdrop-blur-sm text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                            Only {product.stock} left
                          </div>
                        )}
                      </Link>

                      {/* Product Info */}
                      <div className="p-4">
                        <div className="text-xs text-blue-600 font-medium mb-1">
                          {product.vendorName || product.vendor?.storeName || 'Vendor'}
                        </div>
                        <Link
                          to={`/products/${product.id}`}
                          className="block font-semibold text-gray-900 group-hover:text-blue-600 transition text-sm line-clamp-2"
                        >
                          {product.title}
                        </Link>

                        {/* Rating */}
                        <div className="flex items-center space-x-1 mt-2 text-xs text-gray-500">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-semibold text-gray-800">{product.avgRating.toFixed(1)}</span>
                          <span>({product.reviewCount})</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Pricing & Action */}
                    <div className="p-4 pt-0 flex items-center justify-between border-t border-gray-100 mt-2">
                      <div>
                        <span className="text-lg font-black text-gray-900">
                          ${Number(product.price).toFixed(2)}
                        </span>
                      </div>

                      <button
                        onClick={() => handleQuickAdd(product.id)}
                        disabled={isOutOfStock || addingId === product.id}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white font-semibold text-xs transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                      >
                        {addingId === product.id ? (
                          <CheckCircle className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <span>+ Add</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center space-x-2 mt-10">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 px-2">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
