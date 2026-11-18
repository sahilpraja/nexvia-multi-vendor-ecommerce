describe('Cart Calculation & Validation Unit Tests', () => {
  const calculateCartTotals = (items: Array<{ price: number; quantity: number }>) => {
    let subtotal = 0;
    let totalOriginalPrice = 0;
    let itemCount = 0;

    for (const item of items) {
      const originalPrice = Math.round(item.price * 1.15 * 100) / 100;
      subtotal += item.price * item.quantity;
      totalOriginalPrice += originalPrice * item.quantity;
      itemCount += item.quantity;
    }

    const roundedSubtotal = Math.round(subtotal * 100) / 100;
    const roundedOriginal = Math.round(totalOriginalPrice * 100) / 100;
    const productDiscount = Math.max(0, Math.round((roundedOriginal - roundedSubtotal) * 100) / 100);
    const deliveryCharges = roundedSubtotal === 0 || roundedSubtotal >= 100 ? 0 : 9.99;
    const total = Math.round((roundedSubtotal + deliveryCharges) * 100) / 100;

    return {
      subtotal: roundedSubtotal,
      totalOriginalPrice: roundedOriginal,
      productDiscount,
      deliveryCharges,
      itemCount,
      total,
    };
  };

  test('correctly calculates subtotal, discounts, and free shipping for cart >= $100', () => {
    const totals = calculateCartTotals([
      { price: 120.0, quantity: 1 },
      { price: 40.0, quantity: 2 },
    ]);

    expect(totals.subtotal).toBe(200.0);
    expect(totals.itemCount).toBe(3);
    expect(totals.deliveryCharges).toBe(0); // Free shipping over 100
    expect(totals.total).toBe(200.0);
    expect(totals.productDiscount).toBeGreaterThan(0);
  });

  test('applies $9.99 delivery fee for cart under $100', () => {
    const totals = calculateCartTotals([{ price: 49.99, quantity: 1 }]);

    expect(totals.subtotal).toBe(49.99);
    expect(totals.deliveryCharges).toBe(9.99);
    expect(totals.total).toBe(59.98);
  });

  test('prevents quantity from going below 1', () => {
    const clampQty = (qty: number) => Math.max(1, qty);
    expect(clampQty(0)).toBe(1);
    expect(clampQty(-5)).toBe(1);
    expect(clampQty(3)).toBe(3);
  });

  test('prevents adding products beyond available stock', () => {
    const canAdd = (currentInCart: number, toAdd: number, availableStock: number) => {
      return currentInCart + toAdd <= availableStock;
    };

    expect(canAdd(2, 1, 5)).toBe(true);
    expect(canAdd(4, 2, 5)).toBe(false);
  });
});
