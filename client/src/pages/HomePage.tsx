import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  SlidersHorizontal,
  Star,
  ShoppingBag,
  CheckCircle,
  X,
  Layers,
  ArrowUpDown,
  Sparkles,
} from 'lucide-react';
import { api } from '../api/client.js';
import { Product, Category } from '../types/index.js';
import { useCart } from '../context/CartContext.js';
import { BannerSlider, BannerSlide } from '../components/home/BannerSlider.js';

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
  const productsSectionRef = useRef<HTMLDivElement>(null);

  // Fetch Categories
  useEffect(() => {
    api
      .get('/categories')
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
  }, [selectedCategory, inStockOnly, sortOption, minRating, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
    scrollToProducts();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setPage(1);
  };

  const scrollToProducts = () => {
    if (productsSectionRef.current) {
      productsSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleBannerCta = (slide: BannerSlide) => {
    if (slide.categoryFilter) {
      // Find matching category or set by name
      const matchingCat = categories.find(
        (c) => c.name.toLowerCase().includes(slide.categoryFilter!.toLowerCase())
      );
      if (matchingCat) {
        setSelectedCategory(matchingCat.name);
      } else {
        setSelectedCategory(slide.categoryFilter);
      }
    } else {
      setSelectedCategory('');
    }
    setPage(1);
    scrollToProducts();
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* ═══ 1. Premium Promotional Banner Carousel ═══ */}
      <section aria-label="Featured Promotions">
        <BannerSlider onSelectBannerCta={handleBannerCta} />
      </section>

      {/* ═══ 2. Compact Search & Quick Category Strip ═══ */}
      <section
        ref={productsSectionRef}
        className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-4 sm:p-5 space-y-3"
      >
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Compact Search Form */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex-1 flex items-center"
          >
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products, brands, tech, essentials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-24 py-2.5 sm:py-3 rounded-xl bg-gray-50/80 border border-gray-200 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-xs sm:text-sm font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  className="absolute right-20 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="submit"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition"
              >
                Search
              </button>
            </div>
          </form>

          {/* Active Filter Indicators */}
          {(selectedCategory || searchQuery || inStockOnly || minRating) && (
            <div className="flex items-center gap-2 self-start md:self-auto">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Filtered:</span>
              <button
                onClick={() => {
                  setSelectedCategory('');
                  setSearchQuery('');
                  setInStockOnly(false);
                  setMinRating(undefined);
                  setPage(1);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
              >
                <span>Reset Filters</span>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Quick Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar text-xs">
          <button
            onClick={() => {
              setSelectedCategory('');
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex-shrink-0 ${
              selectedCategory === ''
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Products
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setSelectedCategory(cat.name);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex-shrink-0 ${
                selectedCategory === cat.name
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </section>

      {/* ═══ 3. Main Filter & Products Layout ═══ */}
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
                setPage(1);
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Reset All
            </button>
          </div>

          {/* Categories Filter */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Categories</h3>
            <div className="space-y-1.5">
              <button
                onClick={() => {
                  setSelectedCategory('');
                  setPage(1);
                }}
                className={`w-full text-left text-xs font-medium py-2 px-3 rounded-xl transition ${
                  selectedCategory === ''
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                All Categories
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.name);
                    setPage(1);
                  }}
                  className={`w-full text-left text-xs font-medium py-2 px-3 rounded-xl transition ${
                    selectedCategory === cat.name
                      ? 'bg-blue-50 text-blue-700 font-bold'
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
            <label className="flex items-center space-x-2 text-xs font-medium text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => {
                  setInStockOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>In-stock items only</span>
            </label>
          </div>

          {/* Customer Rating Filter */}
          <div className="pt-4 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Customer Rating</h3>
            <div className="space-y-1.5">
              {[4, 3, 2].map((rating) => (
                <button
                  key={rating}
                  onClick={() => {
                    setMinRating(minRating === rating ? undefined : rating);
                    setPage(1);
                  }}
                  className={`w-full flex items-center justify-between text-xs py-1.5 px-2 rounded-xl transition ${
                    minRating === rating
                      ? 'bg-amber-50 text-amber-900 font-bold'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                        }`}
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
              {selectedCategory && (
                <span className="text-blue-600 font-bold ml-1">in {selectedCategory}</span>
              )}
            </p>

            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-gray-500">Sort by:</span>
              <select
                value={sortOption}
                onChange={(e) => {
                  setSortOption(e.target.value);
                  setPage(1);
                }}
                className="bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="relevance">Relevance</option>
                <option value="newest">Newest Arrivals</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>

          {/* Product Items Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-4 border border-gray-100 animate-pulse"
                >
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
              <p className="text-sm text-gray-500 mt-1">
                Try searching for something else or clearing category filters.
              </p>
              {(selectedCategory || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedCategory('');
                    setSearchQuery('');
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {products.map((product) => {
                const img =
                  product.imageUrl ||
                  product.images?.[0]?.url ||
                  'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600';
                const isOutOfStock = product.stock <= 0;

                return (
                  <div
                    key={product.id}
                    className="group bg-white rounded-2xl border border-gray-200/80 hover:border-blue-300 overflow-hidden shadow-sm hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Product Image */}
                      <Link
                        to={`/products/${product.id}`}
                        className="block relative aspect-square bg-gray-50 overflow-hidden"
                      >
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
                          {product.vendorName || product.vendor?.storeName || 'Verified Merchant'}
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
                          <span className="font-semibold text-gray-800">
                            {product.avgRating.toFixed(1)}
                          </span>
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
