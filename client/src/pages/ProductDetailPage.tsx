import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Star, ShieldCheck, Truck, RefreshCw, ShoppingCart, MessageSquare, AlertCircle } from 'lucide-react';
import { api } from '../api/client.js';
import { Product } from '../types/index.js';
import { useCart } from '../context/CartContext.js';
import { useAuth } from '../context/AuthContext.js';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  // Review Form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  const { addToCart } = useCart();
  const { user } = useAuth();

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/products/${id}`);
      setProduct(res.data.data);
      if (res.data.data.images && res.data.data.images.length > 0) {
        setSelectedImage(res.data.data.images[0].url);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const handleAddToCart = async () => {
    if (!product) return;
    try {
      setAdding(true);
      await addToCart(product.id, quantity);
    } finally {
      setAdding(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    try {
      setSubmittingReview(true);
      setReviewError(null);
      setReviewSuccess(null);

      await api.post(`/products/${product.id}/reviews`, {
        rating,
        comment,
      });

      setReviewSuccess('Thank you! Your verified review has been posted.');
      setComment('');
      fetchProduct(); // refresh product & reviews
    } catch (err: any) {
      setReviewError(
        err.response?.data?.message || 'Failed to submit review. (Verified buyers with delivered orders only)'
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-gray-800">Product not found</h2>
        <Link to="/" className="text-blue-600 underline mt-2 inline-block">
          Return to Marketplace
        </Link>
      </div>
    );
  }

  const primaryImage =
    selectedImage ||
    product.imageUrl ||
    product.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Breadcrumb */}
      <nav className="text-xs text-gray-500 mb-6 flex items-center space-x-2">
        <Link to="/" className="hover:text-blue-600">Home</Link>
        <span>/</span>
        <span>{product.category?.name || 'Catalog'}</span>
        <span>/</span>
        <span className="text-gray-900 font-medium truncate max-w-xs">{product.title}</span>
      </nav>

      {/* Main Product Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 bg-white p-8 rounded-3xl border border-gray-200/80 shadow-sm">
        {/* Left: Gallery */}
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 mb-4">
            <img src={primaryImage} alt={product.title} className="w-full h-full object-cover" />
          </div>

          {product.images && product.images.length > 1 && (
            <div className="flex space-x-3 overflow-x-auto pb-2">
              {product.images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setSelectedImage(img.url)}
                  className={`w-20 h-20 rounded-xl overflow-hidden border-2 flex-shrink-0 ${
                    selectedImage === img.url ? 'border-blue-600' : 'border-gray-200'
                  }`}
                >
                  <img src={img.url} alt="thumbnail" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Product Actions */}
        <div className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                Sold by: {product.vendor?.storeName || 'Verified Merchant'}
              </span>
              <span className="text-xs text-gray-400">SKU: {product.sku}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mt-3 leading-snug">
              {product.title}
            </h1>

            {/* Ratings */}
            <div className="flex items-center space-x-2 mt-3">
              <div className="flex text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(product.avgRating) ? 'fill-amber-400' : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm font-semibold text-gray-900">{product.avgRating.toFixed(1)}</span>
              <span className="text-sm text-gray-500">({product.reviewCount} customer reviews)</span>
            </div>

            {/* Price */}
            <div className="mt-6 flex items-baseline space-x-3">
              <span className="text-3xl sm:text-4xl font-black text-gray-900">
                ${Number(product.price).toFixed(2)}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-green-100 text-green-800">
                In Stock & Ready to Ship
              </span>
            </div>

            {/* Description */}
            <div className="mt-6 border-t border-gray-100 pt-6">
              <h3 className="text-sm font-bold text-gray-900">Product Description</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{product.description}</p>
            </div>
          </div>

          {/* Action Area */}
          <div className="mt-8 border-t border-gray-100 pt-6 space-y-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3.5 py-2 hover:bg-gray-100 font-bold text-gray-600"
                >
                  -
                </button>
                <span className="px-4 py-2 text-sm font-bold text-gray-900">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  className="px-3.5 py-2 hover:bg-gray-100 font-bold text-gray-600"
                >
                  +
                </button>
              </div>

              <button
                type="button"
                onClick={handleAddToCart}
                disabled={product.stock <= 0 || adding}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>{adding ? 'Adding...' : 'Add to Shopping Cart'}</span>
              </button>
            </div>

            {/* Perks */}
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-500 pt-2">
              <div className="flex items-center space-x-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Direct vendor dispatch</span>
              </div>
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Escrow payment protection</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Reviews & Write Review Section */}
      <div className="mt-12 bg-white p-8 rounded-3xl border border-gray-200/80 shadow-sm">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <MessageSquare className="w-5 h-5 mr-2 text-blue-600" /> Verified Customer Reviews
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Reviews List */}
          <div className="lg:col-span-2 space-y-4">
            {(!product.reviews || product.reviews.length === 0) ? (
              <p className="text-sm text-gray-500 italic">No reviews yet for this product. Be the first verified buyer to leave feedback!</p>
            ) : (
              product.reviews.map((rev) => (
                <div key={rev.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">{rev.user.name}</span>
                    <span className="text-xs text-gray-400">
                      {new Date(rev.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-amber-400' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  {rev.comment && <p className="text-sm text-gray-700 mt-1">{rev.comment}</p>}
                </div>
              ))
            )}
          </div>

          {/* Write a Review Box */}
          <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 h-fit">
            <h3 className="text-sm font-bold text-gray-900 mb-2">Write a Review</h3>
            <p className="text-xs text-gray-500 mb-4">
              Per platform policy, only customers with a <strong>DELIVERED</strong> order of this item may submit a verified review.
            </p>

            {reviewSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl">
                {reviewSuccess}
              </div>
            )}

            {reviewError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start space-x-1.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{reviewError}</span>
              </div>
            )}

            {user ? (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Rating</label>
                  <select
                    value={rating}
                    onChange={(e) => setRating(Number(e.target.value))}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={5}>5 Stars - Outstanding</option>
                    <option value={4}>4 Stars - Very Good</option>
                    <option value={3}>3 Stars - Average</option>
                    <option value={2}>2 Stars - Below Average</option>
                    <option value={1}>1 Star - Poor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Comment (Optional)</label>
                  <textarea
                    rows={3}
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Describe your experience with this product..."
                    className="w-full bg-white border border-gray-300 rounded-xl p-3 text-sm focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-xs transition shadow-sm disabled:opacity-50"
                >
                  {submittingReview ? 'Verifying & Submitting...' : 'Submit Verified Review'}
                </button>
              </form>
            ) : (
              <p className="text-xs text-gray-500">
                Please <Link to="/login" className="text-blue-600 underline font-semibold">sign in</Link> to leave a review.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
