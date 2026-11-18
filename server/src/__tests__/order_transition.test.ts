describe('Sub-Order State Machine Transitions (Milestone 5)', () => {
  type SubOrderStatus = 'PLACED' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

  const VALID_TRANSITIONS: Record<SubOrderStatus, SubOrderStatus[]> = {
    PLACED: ['PACKED', 'CANCELLED'],
    PACKED: ['SHIPPED'],
    SHIPPED: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
  };

  const validateTransition = (current: SubOrderStatus, next: SubOrderStatus) => {
    const allowed = VALID_TRANSITIONS[current];
    if (!allowed.includes(next)) {
      throw new Error(`Invalid transition from ${current} to ${next}`);
    }
    return next;
  };

  test('permits valid linear transitions (PLACED -> PACKED -> SHIPPED -> DELIVERED)', () => {
    let status: SubOrderStatus = 'PLACED';
    status = validateTransition(status, 'PACKED');
    expect(status).toBe('PACKED');

    status = validateTransition(status, 'SHIPPED');
    expect(status).toBe('SHIPPED');

    status = validateTransition(status, 'DELIVERED');
    expect(status).toBe('DELIVERED');
  });

  test('permits cancellation from PLACED', () => {
    const status: SubOrderStatus = 'PLACED';
    const next = validateTransition(status, 'CANCELLED');
    expect(next).toBe('CANCELLED');
  });

  test('rejects illegal skipping (PLACED directly to DELIVERED)', () => {
    expect(() => validateTransition('PLACED', 'DELIVERED')).toThrow(
      'Invalid transition from PLACED to DELIVERED'
    );
  });

  test('rejects backward transitions (SHIPPED to PACKED)', () => {
    expect(() => validateTransition('SHIPPED', 'PACKED')).toThrow(
      'Invalid transition from SHIPPED to PACKED'
    );
  });

  test('rejects transitions once delivered or cancelled', () => {
    expect(() => validateTransition('DELIVERED', 'SHIPPED')).toThrow();
    expect(() => validateTransition('CANCELLED', 'PACKED')).toThrow();
  });
});
