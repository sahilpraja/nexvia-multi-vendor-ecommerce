import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api/v1';

async function runOrderStatusTests() {
  console.log('📦 Starting Comprehensive Order Status Management Tests...\n');

  // 1. Authenticate Customer & Admin
  console.log('▶ [1] Authenticating Customer & Admin users...');
  const custRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'john@example.com',
    password: 'Password123!',
  });
  const customerToken = custRes.data.data.accessToken;
  const customerHeader = { Authorization: `Bearer ${customerToken}` };

  const adminRes = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'admin@nexvia.com',
    password: 'Password123!',
  });
  const adminToken = adminRes.data.data.accessToken;
  const adminHeader = { Authorization: `Bearer ${adminToken}` };
  console.log('   ✅ Tokens acquired.');

  // 2. Test RBAC: Non-admin cannot access admin orders
  console.log('\n▶ [2] Test Role-Based Authorization: Customer cannot access /admin/orders...');
  try {
    await axios.get(`${BASE_URL}/admin/orders`, { headers: customerHeader });
    throw new Error('Customer should have been blocked');
  } catch (err: any) {
    console.log(`   ✅ Properly blocked with status ${err.response?.status}: "${err.response?.data?.message}"`);
    if (err.response?.status !== 403) throw new Error('Expected 403 Forbidden');
  }

  // 3. Create a fresh test order
  console.log('\n▶ [3] Customer placing a fresh test order...');
  const prodRes = await axios.get(`${BASE_URL}/products`);
  const product = prodRes.data.data.products[0];

  await axios.delete(`${BASE_URL}/cart`, { headers: customerHeader });
  await axios.post(
    `${BASE_URL}/cart/items`,
    { productId: product.id, quantity: 1 },
    { headers: customerHeader }
  );

  const orderRes = await axios.post(
    `${BASE_URL}/checkout`,
    {
      address: {
        line1: '100 Sunset Blvd',
        city: 'Los Angeles',
        state: 'CA',
        postalCode: '90001',
        country: 'US',
        phone: '+1-555-8888',
      },
    },
    { headers: customerHeader }
  );
  const testOrder = orderRes.data.data.parentOrder;
  console.log(`   ✅ Test order placed: #${testOrder.id.slice(0, 8)} (Status: ${testOrder.orderStatus})`);

  // 4. Admin lists orders & verifies status counts
  console.log('\n▶ [4] Admin fetching all orders with status count metrics...');
  const listRes = await axios.get(`${BASE_URL}/admin/orders`, { headers: adminHeader });
  console.log(`   ✅ Total orders: ${listRes.data.data.total}`);
  console.log('   ✅ Status breakdown:', listRes.data.data.statusCounts);

  // 5. Test search filter
  console.log('\n▶ [5] Testing search by Order ID and Customer Name...');
  const searchByIdRes = await axios.get(`${BASE_URL}/admin/orders?search=${testOrder.id.slice(0, 8)}`, {
    headers: adminHeader,
  });
  console.log(`   ✅ Search by ID returned ${searchByIdRes.data.data.orders.length} order(s)`);
  if (searchByIdRes.data.data.orders.length === 0) throw new Error('Search by ID failed');

  const searchByNameRes = await axios.get(`${BASE_URL}/admin/orders?search=John`, {
    headers: adminHeader,
  });
  console.log(`   ✅ Search by name "John" returned ${searchByNameRes.data.data.orders.length} order(s)`);

  // 6. Test invalid status transition rejection (PENDING -> DELIVERED)
  console.log('\n▶ [6] Testing invalid transition validation (PENDING -> DELIVERED)...');
  try {
    await axios.patch(
      `${BASE_URL}/admin/orders/${testOrder.id}/status`,
      { status: 'DELIVERED' },
      { headers: adminHeader }
    );
    throw new Error('Invalid transition should have been rejected');
  } catch (err: any) {
    console.log(`   ✅ Properly rejected invalid transition: "${err.response?.data?.message}"`);
  }

  // 7. Test valid lifecycle transitions step by step
  console.log('\n▶ [7] Executing valid lifecycle transitions: PENDING -> CONFIRMED -> PROCESSING...');
  await axios.patch(
    `${BASE_URL}/admin/orders/${testOrder.id}/status`,
    { status: 'CONFIRMED', note: 'Order confirmed and inventory locked' },
    { headers: adminHeader }
  );
  console.log('   ✅ Transitioned to CONFIRMED.');

  await axios.patch(
    `${BASE_URL}/admin/orders/${testOrder.id}/status`,
    { status: 'PROCESSING', note: 'Package is being processed by vendor warehouse' },
    { headers: adminHeader }
  );
  console.log('   ✅ Transitioned to PROCESSING.');

  // 8. Transition to SHIPPED with courier and tracking number
  console.log('\n▶ [8] Transitioning to SHIPPED with Courier and Tracking Number...');
  const shipRes = await axios.patch(
    `${BASE_URL}/admin/orders/${testOrder.id}/status`,
    {
      status: 'SHIPPED',
      courierName: 'FedEx Express',
      trackingNumber: 'FX-884920199',
      note: 'Package handed over to FedEx carrier facility',
    },
    { headers: adminHeader }
  );
  const shippedOrder = shipRes.data.data;
  console.log(`   ✅ Status: ${shippedOrder.orderStatus}, Courier: ${shippedOrder.courierName}, Tracking: ${shippedOrder.trackingNumber}`);
  if (shippedOrder.trackingNumber !== 'FX-884920199') throw new Error('Tracking number was not saved');

  // 9. Transition to OUT_FOR_DELIVERY -> DELIVERED
  console.log('\n▶ [9] Transitioning to OUT_FOR_DELIVERY -> DELIVERED...');
  await axios.patch(
    `${BASE_URL}/admin/orders/${testOrder.id}/status`,
    { status: 'OUT_FOR_DELIVERY', note: 'Courier out for delivery today' },
    { headers: adminHeader }
  );
  console.log('   ✅ Transitioned to OUT_FOR_DELIVERY.');

  const deliverRes = await axios.patch(
    `${BASE_URL}/admin/orders/${testOrder.id}/status`,
    { status: 'DELIVERED', note: 'Delivered and signed at front door' },
    { headers: adminHeader }
  );
  console.log('   ✅ Transitioned to DELIVERED.');

  // 10. Verify complete Order Status History Timeline
  console.log('\n▶ [10] Verifying Order Status History Timeline records...');
  const histories = deliverRes.data.data.statusHistories;
  console.log(`   ✅ Total history entries: ${histories.length}`);
  histories.forEach((h: any, idx: number) => {
    console.log(`      [${idx + 1}] ${h.status} at ${h.createdAt} by ${h.updatedBy}: "${h.note}"`);
  });
  if (histories.length < 5) throw new Error('Expected at least 5 history records');

  // 11. Verify Customer Tracking Page Endpoint reflects real-time updates
  console.log('\n▶ [11] Customer checking their order tracking details via GET /api/v1/orders/:id...');
  const customerViewRes = await axios.get(`${BASE_URL}/orders/${testOrder.id}`, {
    headers: customerHeader,
  });
  const customerOrder = customerViewRes.data.data;
  console.log(`   ✅ Customer sees: Status: ${customerOrder.orderStatus}, Carrier: ${customerOrder.courierName}, Tracking: ${customerOrder.trackingNumber}`);
  console.log(`   ✅ Customer receives all ${customerOrder.statusHistories.length} timeline entries.`);
  if (customerOrder.orderStatus !== 'DELIVERED') throw new Error('Customer does not see DELIVERED status');

  console.log('\n🎉 ALL 11 ORDER STATUS MANAGEMENT TESTS PASSED SUCCESSFULLY! ✅\n');
}

runOrderStatusTests().catch((err) => {
  console.error('❌ Test failed:', err.response?.data || err.message);
  process.exit(1);
});
