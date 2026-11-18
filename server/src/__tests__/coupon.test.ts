describe('Coupon Pricing Engine Logic (Milestone 7)', () => {
  interface CouponRule {
    type: 'PERCENT' | 'FLAT';
    value: number;
    minOrder: number;
    maxDiscount?: number;
  }

  const applyCoupon = (subtotal: number, coupon: CouponRule) => {
    if (subtotal < coupon.minOrder) {
      throw new Error(`Minimum order of $${coupon.minOrder} required`);
    }

    let discount = 0;
    if (coupon.type === 'PERCENT') {
      discount = (subtotal * coupon.value) / 100;
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = Math.min(coupon.value, subtotal);
    }

    const total = Math.max(0, subtotal - discount);
    return {
      subtotal,
      discount: Math.round(discount * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  };

  test('applies percentage coupon correctly', () => {
    const coupon: CouponRule = { type: 'PERCENT', value: 10, minOrder: 50 };
    const result = applyCoupon(120, coupon);

    expect(result.discount).toBe(12.00);
    expect(result.total).toBe(108.00);
  });

  test('enforces maxDiscount cap on percentage coupon', () => {
    const coupon: CouponRule = { type: 'PERCENT', value: 20, minOrder: 100, maxDiscount: 50 };
    const result = applyCoupon(500, coupon);

    expect(result.discount).toBe(50.00);
    expect(result.total).toBe(450.00);
  });

  test('applies flat discount coupon correctly', () => {
    const coupon: CouponRule = { type: 'FLAT', value: 50, minOrder: 200 };
    const result = applyCoupon(250, coupon);

    expect(result.discount).toBe(50.00);
    expect(result.total).toBe(200.00);
  });

  test('throws error if minimum order threshold is not met', () => {
    const coupon: CouponRule = { type: 'FLAT', value: 50, minOrder: 200 };
    expect(() => applyCoupon(150, coupon)).toThrow('Minimum order of $200 required');
  });
});
