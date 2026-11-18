describe('Platform Commission and Split Logic (Milestone 6)', () => {
  const calculateCommissionAndNet = (subtotal: number, rate = 0.10) => {
    const gross = Math.round(subtotal * 100) / 100;
    const commission = Math.round(gross * rate * 100) / 100;
    const net = Math.round((gross - commission) * 100) / 100;
    return { gross, commission, net };
  };

  test('calculates standard 10% platform commission on sub-order', () => {
    const { gross, commission, net } = calculateCommissionAndNet(100.00);
    expect(gross).toBe(100.00);
    expect(commission).toBe(10.00);
    expect(net).toBe(90.00);
    expect(commission + net).toBe(gross);
  });

  test('accurately rounds split on fractional values', () => {
    const { gross, commission, net } = calculateCommissionAndNet(349.99);
    expect(gross).toBe(349.99);
    expect(commission).toBe(35.00);
    expect(net).toBe(314.99);
    expect(commission + net).toBe(gross);
  });

  test('multi-vendor subtotal split equals parent order total without leakage', () => {
    const vendor1 = calculateCommissionAndNet(349.99);
    const vendor2 = calculateCommissionAndNet(420.00);

    const totalGross = vendor1.gross + vendor2.gross;
    const totalCommission = vendor1.commission + vendor2.commission;
    const totalVendorNet = vendor1.net + vendor2.net;

    expect(totalGross).toBe(769.99);
    expect(totalCommission).toBe(77.00);
    expect(totalVendorNet).toBe(692.99);
    expect(totalCommission + totalVendorNet).toBe(totalGross);
  });
});
