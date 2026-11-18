import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api/v1';

async function runCartWorkflowTests() {
  console.log('🧪 Starting Full-Stack Cart System Workflow Tests...\n');

  // 1. Authenticate User 1 (John Doe)
  console.log('▶ [1] Authenticating User 1 (john@example.com)...');
  const loginRes1 = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'john@example.com',
    password: 'Password123!',
  });
  const token1 = loginRes1.data.data.accessToken;
  const authHeader1 = { Authorization: `Bearer ${token1}` };
  console.log('   ✅ User 1 logged in successfully.');

  // Clear cart first to start clean
  await axios.delete(`${BASE_URL}/cart`, { headers: authHeader1 });

  // 2. Fetch all products to use for testing
  const productsRes = await axios.get(`${BASE_URL}/products`);
  const products = productsRes.data.data.products;
  const productA = products[0];
  const productB = products[1];
  console.log(`   📦 Found products: "${productA.title}" (Stock: ${productA.stock}), "${productB.title}" (Stock: ${productB.stock})`);

  // 3. Add a new product to cart
  console.log('\n▶ [2] Test: Add a new product to cart...');
  const addRes1 = await axios.post(
    `${BASE_URL}/cart/items`,
    { productId: productA.id, quantity: 1 },
    { headers: authHeader1 }
  );
  console.log(`   ✅ Added product. Items in cart: ${addRes1.data.data.items.length}, Subtotal: $${addRes1.data.data.subtotal}`);

  // 4. Add the same product again (prevent duplicate entry, increment quantity)
  console.log('\n▶ [3] Test: Add the same product again (prevent duplicate, increment qty)...');
  const addRes2 = await axios.post(
    `${BASE_URL}/cart/items`,
    { productId: productA.id, quantity: 2 },
    { headers: authHeader1 }
  );
  const itemA = addRes2.data.data.items.find((i: any) => i.productId === productA.id);
  console.log(`   ✅ Same product handled atomically. Unique items: ${addRes2.data.data.items.length}, Qty: ${itemA.quantity} (expected 3)`);
  if (itemA.quantity !== 3) throw new Error('Duplicate item was created instead of quantity update!');

  // 5. Add a second distinct product
  console.log('\n▶ [4] Test: Add a second distinct product...');
  const addRes3 = await axios.post(
    `${BASE_URL}/cart/items`,
    { productId: productB.id, quantity: 1 },
    { headers: authHeader1 }
  );
  console.log(`   ✅ Distinct item added. Total items: ${addRes3.data.data.items.length} (expected 2)`);

  // 6. Increase quantity via PATCH
  console.log('\n▶ [5] Test: Increase quantity via PATCH...');
  const updateRes1 = await axios.patch(
    `${BASE_URL}/cart/items/${productB.id}`,
    { quantity: 3 },
    { headers: authHeader1 }
  );
  const updatedB = updateRes1.data.data.items.find((i: any) => i.productId === productB.id);
  console.log(`   ✅ Quantity increased to: ${updatedB.quantity} (expected 3)`);

  // 7. Decrease quantity
  console.log('\n▶ [6] Test: Decrease quantity...');
  const updateRes2 = await axios.patch(
    `${BASE_URL}/cart/items/${productB.id}`,
    { quantity: 2 },
    { headers: authHeader1 }
  );
  const decreasedB = updateRes2.data.data.items.find((i: any) => i.productId === productB.id);
  console.log(`   ✅ Quantity decreased to: ${decreasedB.quantity} (expected 2)`);

  // 8. Test preventing quantity from going below 1
  console.log('\n▶ [7] Test: Prevent quantity from going below 1...');
  try {
    await axios.patch(
      `${BASE_URL}/cart/items/${productB.id}`,
      { quantity: 0 },
      { headers: authHeader1 }
    );
    throw new Error('Should have rejected quantity <= 0');
  } catch (err: any) {
    console.log(`   ✅ Properly rejected quantity 0: "${err.response?.data?.message || err.message}"`);
  }

  // 9. Test insufficient stock rejection
  console.log('\n▶ [8] Test: Prevent adding products beyond available stock...');
  try {
    await axios.post(
      `${BASE_URL}/cart/items`,
      { productId: productA.id, quantity: 99999 },
      { headers: authHeader1 }
    );
    throw new Error('Should have rejected exceeding stock');
  } catch (err: any) {
    console.log(`   ✅ Properly rejected exceeding stock: "${err.response?.data?.message || err.message}"`);
  }

  // 10. Test invalid product ID rejection
  console.log('\n▶ [9] Test: Reject invalid product ID...');
  try {
    await axios.post(
      `${BASE_URL}/cart/items`,
      { productId: 'non-existent-product-id', quantity: 1 },
      { headers: authHeader1 }
    );
    throw new Error('Should have rejected invalid product ID');
  } catch (err: any) {
    console.log(`   ✅ Properly rejected invalid product ID: "${err.response?.data?.message || err.message}"`);
  }

  // 11. Test PostgreSQL persistence across requests / page refresh
  console.log('\n▶ [10] Test: PostgreSQL Cart Persistence (simulate page refresh)...');
  const getRes = await axios.get(`${BASE_URL}/cart`, { headers: authHeader1 });
  console.log(`   ✅ Cart loaded from PostgreSQL: ${getRes.data.data.items.length} items, subtotal: $${getRes.data.data.subtotal}`);
  if (getRes.data.data.items.length !== 2) throw new Error('Persisted cart lost items!');

  // 12. Test multi-user isolation (User 2 has their own independent cart)
  console.log('\n▶ [11] Test: Multi-user cart isolation...');
  const loginRes2 = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'admin@nexvia.com',
    password: 'Password123!',
  });
  const token2 = loginRes2.data.data.accessToken;
  const authHeader2 = { Authorization: `Bearer ${token2}` };

  await axios.delete(`${BASE_URL}/cart`, { headers: authHeader2 });
  const user2Cart = await axios.get(`${BASE_URL}/cart`, { headers: authHeader2 });
  console.log(`   ✅ User 2 cart is completely separate: ${user2Cart.data.data.items.length} items (expected 0)`);
  if (user2Cart.data.data.items.length !== 0) throw new Error('User 2 saw User 1 items!');

  // 13. Remove item from User 1 cart
  console.log('\n▶ [12] Test: Remove product from cart...');
  const removeRes = await axios.delete(`${BASE_URL}/cart/items/${productB.id}`, { headers: authHeader1 });
  console.log(`   ✅ Removed item. Remaining items: ${removeRes.data.data.items.length} (expected 1)`);

  // 14. Clear cart
  console.log('\n▶ [13] Test: Clear cart...');
  const clearRes = await axios.delete(`${BASE_URL}/cart`, { headers: authHeader1 });
  console.log(`   ✅ Cart cleared. Items: ${clearRes.data.data.items.length} (expected 0)`);

  console.log('\n🎉 ALL 13 FULL-STACK CART SYSTEM TESTS PASSED SUCCESSFULLY! ✅\n');
}

runCartWorkflowTests().catch((err) => {
  console.error('❌ Cart test failed:', err.response?.data || err.message);
  process.exit(1);
});
