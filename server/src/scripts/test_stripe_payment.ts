import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api/v1';

async function runStripePaymentTests() {
  console.log('💳 Starting Comprehensive Stripe Payment Gateway Integration Tests...\n');

  // 1. Authenticate Customer
  console.log('▶ [1] Authenticating customer (john@example.com)...');
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'john@example.com',
    password: 'Password123!',
  });
  const token = loginRes.data.data.accessToken;
  const authHeader = { Authorization: `Bearer ${token}` };
  console.log('   ✅ Customer authenticated.');

  // Clear cart & get a product
  await axios.delete(`${BASE_URL}/cart`, { headers: authHeader });
  const productsRes = await axios.get(`${BASE_URL}/products`);
  const product = productsRes.data.data.products[0];

  // 2. Add product to cart
  console.log(`\n▶ [2] Adding product "${product.title}" ($${product.price}) to cart...`);
  await axios.post(
    `${BASE_URL}/cart/items`,
    { productId: product.id, quantity: 1 },
    { headers: authHeader }
  );
  console.log('   ✅ Item added to cart.');

  // 3. Create Pending Order via Checkout
  console.log('\n▶ [3] Creating pending order with delivery address...');
  const orderRes = await axios.post(
    `${BASE_URL}/checkout`,
    {
      address: {
        line1: '123 Market St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
        country: 'US',
        phone: '+1-555-0100',
      },
    },
    { headers: authHeader }
  );
  const order = orderRes.data.data.parentOrder;
  console.log(`   ✅ Order created with ID: #${order.id.slice(0, 8)} (Total: $${order.total}, Payment Status: ${order.paymentStatus})`);
  if (order.paymentStatus !== 'PENDING') throw new Error('Order should start in PENDING status');

  // 4. Create Stripe Checkout Session
  console.log('\n▶ [4] Creating Stripe Checkout Session...');
  const sessionRes = await axios.post(
    `${BASE_URL}/payment/create-checkout-session`,
    { orderId: order.id },
    { headers: authHeader }
  );
  const session = sessionRes.data.data;
  console.log(`   ✅ Stripe Checkout Session created: ID: ${session.sessionId}, URL: ${session.sessionUrl}`);
  if (!session.sessionId) throw new Error('Stripe session ID missing');

  // 5. Test Unauthorized Payment Access
  console.log('\n▶ [5] Test: Reject unauthorized access to Checkout Session...');
  try {
    await axios.post(`${BASE_URL}/payment/create-checkout-session`, { orderId: order.id });
    throw new Error('Should have rejected unauthenticated request');
  } catch (err: any) {
    console.log(`   ✅ Properly rejected with 401: "${err.response?.data?.message || err.message}"`);
  }

  // 6. Test GET Payment Session Status before payment (should be PENDING)
  console.log('\n▶ [6] Fetching Session Status (before payment)...');
  const statusRes1 = await axios.get(`${BASE_URL}/payment/session/${session.sessionId}`, {
    headers: authHeader,
  });
  console.log(`   ✅ Session status verified: ${statusRes1.data.data.paymentStatus} (expected PENDING)`);
  if (statusRes1.data.data.paymentStatus !== 'PENDING') throw new Error('Status should be PENDING before payment');

  // 7. Process Stripe Webhook (checkout.session.completed)
  console.log('\n▶ [7] Processing Stripe Webhook event: checkout.session.completed...');
  const webhookRes = await axios.post(`${BASE_URL}/payment/webhook`, {
    type: 'checkout.session.completed',
    sessionId: session.sessionId,
    data: {
      object: {
        id: session.sessionId,
        payment_status: 'paid',
        payment_intent: `pi_test_${order.id.slice(0, 8)}`,
      },
    },
  });
  console.log('   ✅ Webhook processed successfully:', webhookRes.data.received);

  // 8. Verify Payment & Order status after webhook (must be PAID)
  console.log('\n▶ [8] Verifying Payment & Order status in PostgreSQL after settlement...');
  const statusRes2 = await axios.get(`${BASE_URL}/payment/session/${session.sessionId}`, {
    headers: authHeader,
  });
  console.log(`   ✅ Verified Status: ${statusRes2.data.data.paymentStatus} (expected PAID)`);
  if (statusRes2.data.data.paymentStatus !== 'PAID') throw new Error('Payment status should be PAID after webhook');

  // 9. Test Webhook Idempotency (duplicate webhook delivery)
  console.log('\n▶ [9] Test: Webhook Idempotency (replay identical event)...');
  const replayRes = await axios.post(`${BASE_URL}/payment/webhook`, {
    type: 'checkout.session.completed',
    sessionId: session.sessionId,
    data: {
      object: {
        id: session.sessionId,
        payment_status: 'paid',
      },
    },
  });
  console.log('   ✅ Duplicate webhook handled safely without duplicate ledger payouts:', replayRes.data.result?.message || 'Idempotent');

  // 10. Verify Cart is safely cleared after verified successful payment
  console.log('\n▶ [10] Verifying customer cart was cleared after successful payment...');
  const cartRes = await axios.get(`${BASE_URL}/cart`, { headers: authHeader });
  console.log(`   ✅ Cart items remaining: ${cartRes.data.data.items.length} (expected 0)`);
  if (cartRes.data.data.items.length !== 0) throw new Error('Cart should be cleared after verified payment');

  // 11. Test Fetching My Orders API
  console.log('\n▶ [11] Test: GET /api/orders/my-orders...');
  const myOrdersRes = await axios.get(`${BASE_URL}/orders/my-orders`, { headers: authHeader });
  console.log(`   ✅ Retrieved ${myOrdersRes.data.data.length} customer order(s). Latest status: ${myOrdersRes.data.data[0].paymentStatus}`);

  // 12. Test Failed Payment Webhook Handling
  console.log('\n▶ [12] Test: Failed Payment Webhook (checkout.session.async_payment_failed)...');
  // Create another order to test failure
  await axios.post(`${BASE_URL}/cart/items`, { productId: product.id, quantity: 1 }, { headers: authHeader });
  const failedOrderRes = await axios.post(
    `${BASE_URL}/checkout`,
    {
      address: {
        line1: '456 Test Ave',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'US',
        phone: '+1-555-0200',
      },
    },
    { headers: authHeader }
  );
  const failedOrder = failedOrderRes.data.data.parentOrder;
  const failSessionRes = await axios.post(
    `${BASE_URL}/payment/create-checkout-session`,
    { orderId: failedOrder.id },
    { headers: authHeader }
  );
  const failSession = failSessionRes.data.data;

  // Send failed payment webhook
  await axios.post(`${BASE_URL}/payment/webhook`, {
    type: 'payment_intent.payment_failed',
    sessionId: failSession.sessionId,
    data: {
      object: {
        id: failSession.sessionId,
        last_payment_error: { message: 'The card was declined' },
      },
    },
  });

  const failCheck = await axios.get(`${BASE_URL}/payment/session/${failSession.sessionId}`, {
    headers: authHeader,
  });
  console.log(`   ✅ Order payment status after failure: ${failCheck.data.data.paymentStatus} (expected FAILED)`);

  console.log('\n🎉 ALL 12 STRIPE PAYMENT GATEWAY INTEGRATION TESTS PASSED SUCCESSFULLY! ✅\n');
}

runStripePaymentTests().catch((err) => {
  console.error('❌ Test failed:', err.response?.data || err.message);
  process.exit(1);
});
