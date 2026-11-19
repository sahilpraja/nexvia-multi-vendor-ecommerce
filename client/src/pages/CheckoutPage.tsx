import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  CreditCard,
  Lock,
  AlertCircle,
  Truck,
  Package,
  ArrowRight,
  Check,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Banknote,
  Sparkles,
  ChevronRight,
  X,
  Loader2,
  CheckCircle2,
  Tag,
  Building,
  Phone,
  User,
  Info,
} from 'lucide-react';
import { useCart } from '../context/CartContext.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../api/client.js';
import { paymentService } from '../services/paymentService.js';
import { Address } from '../types/index.js';

type CheckoutStep = 1 | 2 | 3;
type PaymentOption = 'STRIPE' | 'COD';

export const CheckoutPage: React.FC = () => {
  const { cart, refreshCart } = useCart();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const couponCode = (location.state as any)?.couponCode;

  // Active step
  const [activeStep, setActiveStep] = useState<CheckoutStep>(1);

  // Address state
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // Address Modal state
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [addressForm, setAddressForm] = useState({
    fullName: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'US',
    phone: '',
    isDefault: false,
  });
  const [savingAddress, setSavingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);

  // Payment method selection
  const [paymentMethod, setPaymentMethod] = useState<PaymentOption>('STRIPE');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // PIN code COD validation rule
  const selectedAddress = useMemo(
    () => addresses.find((a) => a.id === selectedAddressId),
    [addresses, selectedAddressId]
  );

  const isCodAvailable = useMemo(() => {
    if (!selectedAddress) return true;
    const pin = selectedAddress.postalCode?.trim() || '';
    return pin.length >= 3;
  }, [selectedAddress]);

  // Fetch addresses and refresh cart
  const fetchAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const res = await api.get('/addresses');
      const list: Address[] = res.data.data || [];
      setAddresses(list);

      // Auto-select default or first address
      if (list.length > 0) {
        const defaultAddr = list.find((a) => a.isDefault) || list[0];
        setSelectedAddressId(defaultAddr.id);
      }
    } catch (err: any) {
      console.error('Error fetching addresses:', err);
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: location } });
      return;
    }
    refreshCart();
    fetchAddresses();
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Group items by vendor for multi-vendor sub-orders breakdown
  const vendorGroups = useMemo(() => {
    return cart.items.reduce((acc, item) => {
      const vName = item.vendorName || 'Independent Merchant';
      if (!acc[vName]) acc[vName] = [];
      acc[vName].push(item);
      return acc;
    }, {} as Record<string, typeof cart.items>);
  }, [cart.items]);

  // Open Add Address Modal
  const handleOpenAddAddress = () => {
    setEditingAddress(null);
    setAddressForm({
      fullName: user?.name || '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
      phone: '',
      isDefault: addresses.length === 0,
    });
    setAddressError(null);
    setIsAddressModalOpen(true);
  };

  // Open Edit Address Modal
  const handleOpenEditAddress = (addr: Address) => {
    setEditingAddress(addr);
    setAddressForm({
      fullName: addr.fullName || user?.name || '',
      line1: addr.line1 || '',
      line2: addr.line2 || '',
      city: addr.city || '',
      state: addr.state || '',
      postalCode: addr.postalCode || '',
      country: addr.country || 'US',
      phone: addr.phone || '',
      isDefault: !!addr.isDefault,
    });
    setAddressError(null);
    setIsAddressModalOpen(true);
  };

  // Save Address (Create or Edit)
  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.line1.trim() || !addressForm.city.trim() || !addressForm.state.trim() || !addressForm.postalCode.trim() || !addressForm.phone.trim()) {
      setAddressError('Please fill out all required address fields.');
      return;
    }

    try {
      setSavingAddress(true);
      setAddressError(null);

      if (editingAddress) {
        await api.patch(`/addresses/${editingAddress.id}`, addressForm);
      } else {
        const res = await api.post('/addresses', addressForm);
        setSelectedAddressId(res.data.data.id);
      }

      await fetchAddresses();
      setIsAddressModalOpen(false);
    } catch (err: any) {
      setAddressError(err.response?.data?.message || 'Failed to save delivery address.');
    } finally {
      setSavingAddress(false);
    }
  };

  // Delete Address
  const handleDeleteAddress = async (addressId: string) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;
    try {
      await api.delete(`/addresses/${addressId}`);
      await fetchAddresses();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete address.');
    }
  };

  // Place Order (Stripe or COD)
  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      setCheckoutError('Please select or add a delivery address to proceed.');
      setActiveStep(1);
      return;
    }

    if (cart.items.length === 0) {
      setCheckoutError('Your shopping cart is empty.');
      return;
    }

    if (paymentMethod === 'COD' && !isCodAvailable) {
      setCheckoutError('Cash on Delivery is unavailable for this delivery postal code.');
      return;
    }

    try {
      setPlacingOrder(true);
      setCheckoutError(null);

      // Step 1: Create Order & Vendor Sub-orders on backend
      const checkoutRes = await api.post('/checkout', {
        addressId: selectedAddressId,
        couponCode,
        paymentMethod,
      });

      const { parentOrder } = checkoutRes.data.data;

      // Step 2: Handle chosen payment workflow
      if (paymentMethod === 'COD') {
        // COD Order placed successfully -> Navigate directly to Order Details / Confirmation
        await refreshCart();
        navigate(`/orders/${parentOrder.id}`, {
          state: { codSuccess: true, orderId: parentOrder.id },
        });
      } else {
        // Stripe Online Payment -> Initialize Stripe Hosted Checkout
        const session = await paymentService.createCheckoutSession(parentOrder.id);

        if (session.sessionUrl) {
          window.location.href = session.sessionUrl;
        } else {
          navigate(`/payment/success?session_id=${session.sessionId}`);
        }
      }
    } catch (err: any) {
      setCheckoutError(
        err.response?.data?.message || 'Checkout failed. Please verify inventory and details.'
      );
      setPlacingOrder(false);
      refreshCart();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* ═══ Header Breadcrumb ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <nav className="text-xs text-gray-400 mb-1 flex items-center space-x-1.5 font-medium">
            <Link to="/cart" className="hover:text-blue-600 transition">Shopping Cart</Link>
            <span>/</span>
            <span className="text-gray-900 font-semibold">Checkout</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Checkout & Payment
          </h1>
        </div>

        {/* Stepper Tabs */}
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-2xl border border-gray-200 shadow-sm text-xs font-bold">
          <button
            onClick={() => setActiveStep(1)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
              activeStep === 1
                ? 'bg-blue-600 text-white'
                : selectedAddressId
                ? 'text-emerald-700 bg-emerald-50'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <span>1. Address</span>
            {selectedAddressId && <Check className="w-3.5 h-3.5" />}
          </button>
          <span className="text-gray-300">/</span>
          <button
            onClick={() => selectedAddressId && setActiveStep(2)}
            disabled={!selectedAddressId}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition disabled:opacity-40 ${
              activeStep === 2
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>2. Order Review</span>
          </button>
          <span className="text-gray-300">/</span>
          <button
            onClick={() => selectedAddressId && setActiveStep(3)}
            disabled={!selectedAddressId}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition disabled:opacity-40 ${
              activeStep === 3
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>3. Payment</span>
          </button>
        </div>
      </div>

      {/* Global Error Banner */}
      {checkoutError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center space-x-3 text-red-700 text-xs sm:text-sm font-semibold">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{checkoutError}</span>
        </div>
      )}

      {/* ═══ Main Checkout Content ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Columns: Step-by-Step Sections */}
        <div className="lg:col-span-7 space-y-6">
          {/* ───────────────── STEP 1: Delivery Address ───────────────── */}
          <div
            className={`bg-white rounded-3xl border transition shadow-sm p-6 sm:p-8 space-y-5 ${
              activeStep === 1 ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                    selectedAddressId
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {selectedAddressId ? <Check className="w-4 h-4" /> : '1'}
                </span>
                <h2 className="text-base font-bold text-gray-900">
                  Select Delivery Address
                </h2>
              </div>

              {activeStep !== 1 && selectedAddress && (
                <button
                  onClick={() => setActiveStep(1)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 transition"
                >
                  Change
                </button>
              )}
            </div>

            {activeStep === 1 ? (
              <div className="space-y-4">
                {loadingAddresses ? (
                  <div className="py-8 flex justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {addresses.map((addr) => {
                      const isSelected = addr.id === selectedAddressId;
                      return (
                        <div
                          key={addr.id}
                          onClick={() => setSelectedAddressId(addr.id)}
                          className={`p-4 rounded-2xl border-2 transition cursor-pointer relative flex flex-col justify-between ${
                            isSelected
                              ? 'border-blue-600 bg-blue-50/20 shadow-sm'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="font-bold text-xs text-gray-900 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-gray-400" />
                                {addr.fullName || 'Customer'}
                              </span>
                              {addr.isDefault && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  Default
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                              {addr.line1}
                              {addr.line2 ? `, ${addr.line2}` : ''}
                            </p>
                            <p className="text-xs text-gray-600">
                              {addr.city}, {addr.state} {addr.postalCode}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {addr.phone}
                            </p>
                          </div>

                          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                            <span
                              className={`text-[11px] font-bold ${
                                isSelected ? 'text-blue-600' : 'text-gray-400'
                              }`}
                            >
                              {isSelected ? 'Deliver to this address' : 'Select'}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditAddress(addr);
                                }}
                                className="p-1 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-gray-100"
                                title="Edit Address"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteAddress(addr.id);
                                }}
                                className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-gray-100"
                                title="Delete Address"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* Add Address Card */}
                    <button
                      type="button"
                      onClick={handleOpenAddAddress}
                      className="p-5 rounded-2xl border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/20 transition flex flex-col items-center justify-center text-center space-y-1.5 min-h-[140px]"
                    >
                      <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Plus className="w-5 h-5" />
                      </div>
                      <span className="text-xs font-bold text-gray-800">Add New Address</span>
                      <span className="text-[10px] text-gray-400">Save address for delivery</span>
                    </button>
                  </div>
                )}

                {addresses.length > 0 && selectedAddressId && (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setActiveStep(2)}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                    >
                      <span>Continue to Order Review</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // Collapsed Address State
              selectedAddress && (
                <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-xs flex items-start justify-between">
                  <div>
                    <span className="font-bold text-gray-900 block">
                      {selectedAddress.fullName || 'Customer'} — {selectedAddress.phone}
                    </span>
                    <p className="text-gray-600 mt-0.5">
                      {selectedAddress.line1}, {selectedAddress.city}, {selectedAddress.state}{' '}
                      {selectedAddress.postalCode}
                    </p>
                  </div>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200/60 text-[10px]">
                    Verified
                  </span>
                </div>
              )
            )}
          </div>

          {/* ───────────────── STEP 2: Multi-Vendor Order Review ───────────────── */}
          <div
            className={`bg-white rounded-3xl border transition shadow-sm p-6 sm:p-8 space-y-5 ${
              activeStep === 2 ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center space-x-3">
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                    activeStep > 2
                      ? 'bg-emerald-600 text-white'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {activeStep > 2 ? <Check className="w-4 h-4" /> : '2'}
                </span>
                <h2 className="text-base font-bold text-gray-900">
                  Review Multi-Vendor Items ({cart.itemCount} items)
                </h2>
              </div>

              {activeStep !== 2 && selectedAddressId && (
                <button
                  onClick={() => setActiveStep(2)}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 transition"
                >
                  Edit / Review
                </button>
              )}
            </div>

            {activeStep === 2 ? (
              <div className="space-y-4">
                {Object.entries(vendorGroups).map(([vendorName, items]) => {
                  const vendorSubtotal = items.reduce((acc, i) => acc + i.itemTotal, 0);
                  return (
                    <div
                      key={vendorName}
                      className="rounded-2xl border border-gray-200/80 bg-gray-50/50 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-gray-200/60 text-xs">
                        <span className="font-black text-gray-900 flex items-center gap-1.5 uppercase tracking-wide">
                          <Package className="w-4 h-4 text-blue-600" />
                          Merchant Sub-Order: {vendorName}
                        </span>
                        <span className="font-extrabold text-blue-700">
                          ${vendorSubtotal.toFixed(2)}
                        </span>
                      </div>

                      <div className="divide-y divide-gray-100">
                        {items.map((item) => (
                          <div
                            key={item.productId}
                            className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.title}
                                  className="w-12 h-12 rounded-xl object-cover border border-gray-200 bg-white flex-shrink-0"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                                  <Package className="w-5 h-5" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 truncate max-w-xs">{item.title}</p>
                                <p className="text-[11px] text-gray-500">
                                  Qty: <strong className="text-gray-900">{item.quantity}</strong> × $
                                  {Number(item.price).toFixed(2)}
                                </p>
                              </div>
                            </div>
                            <span className="font-extrabold text-gray-900 whitespace-nowrap">
                              ${item.itemTotal.toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <div className="pt-2 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setActiveStep(1)}
                    className="text-xs font-bold text-gray-500 hover:text-gray-700"
                  >
                    ← Back to Address
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStep(3)}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm transition flex items-center gap-1.5"
                  >
                    <span>Proceed to Payment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500">
                {cart.itemCount} item{cart.itemCount === 1 ? '' : 's'} grouped across{' '}
                {Object.keys(vendorGroups).length} independent merchant{Object.keys(vendorGroups).length === 1 ? '' : 's'}.
              </div>
            )}
          </div>

          {/* ───────────────── STEP 3: Payment Method Selection ───────────────── */}
          <div
            className={`bg-white rounded-3xl border transition shadow-sm p-6 sm:p-8 space-y-5 ${
              activeStep === 3 ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3 pb-3 border-b border-gray-100">
              <span className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">
                3
              </span>
              <h2 className="text-base font-bold text-gray-900">
                Payment Method Selection
              </h2>
            </div>

            <div className="space-y-4">
              {/* Option A: Stripe Online Payment */}
              <div
                onClick={() => setPaymentMethod('STRIPE')}
                className={`p-5 rounded-2xl border-2 cursor-pointer transition flex items-start justify-between ${
                  paymentMethod === 'STRIPE'
                    ? 'border-blue-600 bg-blue-50/20 shadow-sm'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 flex-shrink-0 mt-0.5">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-black text-gray-900">
                        Online Payment (Stripe Checkout)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                        Instant Confirmation
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 leading-relaxed max-w-md">
                      Credit / Debit Card, Apple Pay, Google Pay, or Link. Redirects to official 256-bit SSL encrypted Stripe payment page.
                    </p>
                    <div className="mt-2.5 flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase">
                      <span className="bg-gray-100 px-2 py-0.5 rounded">Visa</span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded">Mastercard</span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded">Amex</span>
                      <span className="bg-gray-100 px-2 py-0.5 rounded">Apple Pay</span>
                    </div>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 flex-shrink-0 ${
                    paymentMethod === 'STRIPE' ? 'border-blue-600' : 'border-gray-300'
                  }`}
                >
                  {paymentMethod === 'STRIPE' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  )}
                </div>
              </div>

              {/* Option B: Cash on Delivery (COD) */}
              <div
                onClick={() => isCodAvailable && setPaymentMethod('COD')}
                className={`p-5 rounded-2xl border-2 transition flex items-start justify-between ${
                  !isCodAvailable
                    ? 'border-gray-200 bg-gray-50 opacity-60 cursor-not-allowed'
                    : paymentMethod === 'COD'
                    ? 'border-emerald-600 bg-emerald-50/20 shadow-sm cursor-pointer'
                    : 'border-gray-200 hover:border-gray-300 bg-white cursor-pointer'
                }`}
              >
                <div className="flex items-start space-x-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 flex-shrink-0 mt-0.5">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-black text-gray-900">
                        Cash on Delivery (COD)
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Pay on Delivery
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 leading-relaxed max-w-md">
                      Pay cash upon delivery at your doorstep. Order is placed immediately and marked as paid only after physical delivery.
                    </p>

                    {selectedAddress && (
                      <div className="mt-2 text-[11px]">
                        {isCodAvailable ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            Available for PIN Code {selectedAddress.postalCode}
                          </span>
                        ) : (
                          <span className="text-red-600 font-bold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            COD unavailable for PIN Code {selectedAddress.postalCode}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-1 flex-shrink-0 ${
                    paymentMethod === 'COD' ? 'border-emerald-600' : 'border-gray-300'
                  }`}
                >
                  {paymentMethod === 'COD' && (
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  )}
                </div>
              </div>

              {/* Security Banner */}
              <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-[11px] text-gray-500 flex items-center space-x-2">
                <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>
                  All payments are protected by 256-bit encryption. Card credentials are never stored on Nexvia servers.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Sticky Order Summary & Action */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 sm:p-7 rounded-3xl border border-gray-200 shadow-sm space-y-5 sticky top-24">
            <h2 className="text-base font-bold text-gray-900 pb-3 border-b border-gray-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Package className="w-4 h-4 text-blue-600" />
                Price Details
              </span>
              <span className="text-xs font-semibold text-gray-400">
                {cart.itemCount} items
              </span>
            </h2>

            {/* Price Breakdown */}
            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Items Total</span>
                <span className="font-bold text-gray-900">${cart.subtotal.toFixed(2)}</span>
              </div>

              {cart.totalOriginalPrice && cart.totalOriginalPrice > cart.subtotal && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Product Savings</span>
                  <span>-${(cart.totalOriginalPrice - cart.subtotal).toFixed(2)}</span>
                </div>
              )}

              {couponCode && (
                <div className="flex justify-between text-emerald-700 font-bold bg-emerald-50 p-2 rounded-xl border border-emerald-200/60">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5" />
                    Coupon Code ({couponCode})
                  </span>
                  <span>Applied</span>
                </div>
              )}

              <div className="flex justify-between text-gray-600">
                <span>Estimated Delivery</span>
                <span className="font-bold text-emerald-600">FREE</span>
              </div>

              {paymentMethod === 'COD' && (
                <div className="flex justify-between text-gray-600">
                  <span>COD Handling Charge</span>
                  <span className="font-bold text-gray-900">$0.00</span>
                </div>
              )}

              {/* Total Payable */}
              <div className="pt-3 border-t border-gray-100 flex justify-between items-baseline">
                <div>
                  <span className="text-sm font-black text-gray-900 block">Total Amount</span>
                  <span className="text-[10px] text-gray-400">Inclusive of all applicable taxes</span>
                </div>
                <span className="text-2xl font-black text-blue-600">
                  ${cart.subtotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Delivery Destination Reminder */}
            {selectedAddress && (
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-gray-700 flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="font-bold text-gray-900">Delivering to:</span>
                  <p className="text-[11px] text-gray-600 truncate">
                    {selectedAddress.line1}, {selectedAddress.city} {selectedAddress.postalCode}
                  </p>
                </div>
              </div>
            )}

            {/* CTA Button */}
            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={placingOrder || cart.items.length === 0 || !selectedAddressId}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-6 rounded-2xl shadow-xl shadow-blue-500/20 transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 text-sm group"
            >
              {placingOrder ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {paymentMethod === 'COD' ? 'Placing COD Order...' : 'Connecting to Stripe...'}
                  </span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5" />
                  <span>
                    {paymentMethod === 'COD' ? 'Confirm COD Order' : 'Pay with Stripe Checkout'}
                  </span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="text-center text-[10px] text-gray-400">
              Guaranteed 100% safe checkout powered by Nexvia & Stripe
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Add / Edit Address Modal ═══ */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsAddressModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 sm:p-7 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                {editingAddress ? 'Edit Delivery Address' : 'Add New Delivery Address'}
              </h3>
              <button
                onClick={() => setIsAddressModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {addressError && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                {addressError}
              </div>
            )}

            <form onSubmit={handleSaveAddress} className="mt-4 space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={addressForm.fullName}
                  onChange={(e) => setAddressForm({ ...addressForm, fullName: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +1 555-0199"
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                  Street Address *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 742 Evergreen Terrace"
                  value={addressForm.line1}
                  onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                  Apartment, Suite, Unit (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apt 4B"
                  value={addressForm.line2}
                  onChange={(e) => setAddressForm({ ...addressForm, line2: e.target.value })}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    placeholder="City"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    placeholder="State"
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                    PIN / Postal Code *
                  </label>
                  <input
                    type="text"
                    placeholder="Postal Code"
                    value={addressForm.postalCode}
                    onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-gray-500 uppercase tracking-wider mb-1">
                    Country
                  </label>
                  <input
                    type="text"
                    value={addressForm.country}
                    onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addressForm.isDefault}
                    onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="text-xs text-gray-700">Set as my default delivery address</span>
                </label>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingAddress && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingAddress ? 'Update Address' : 'Save & Select'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
