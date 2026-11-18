import { PrismaClient, Role, VendorStatus, ProductStatus, SubOrderStatus, PaymentStatus, PayoutStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive marketplace database seed...');

  // Clean existing data
  await prisma.payoutLedger.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.subOrder.deleteMany();
  await prisma.couponRedemption.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.vendorProfile.deleteMany();
  await prisma.address.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.user.deleteMany();

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Password123!', salt);

  // 1. Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@nexvia.com',
      passwordHash,
      name: 'Super Admin',
      role: Role.ADMIN,
    },
  });

  // 2. Vendors (4 vendors)
  const vendorUsersData = [
    { email: 'apex@vendors.com', name: 'Apex Electronics', store: 'Apex Tech Hub', desc: 'Premium consumer electronics, gadgets & accessories' },
    { email: 'luxe@vendors.com', name: 'Luxe Apparel', store: 'Luxe Fashion House', desc: 'Modern designer apparel, shoes, and street style' },
    { email: 'zenith@vendors.com', name: 'Zenith Living', store: 'Zenith Home & Kitchen', desc: 'Minimalist smart home decor and kitchen appliances' },
    { email: 'pulse@vendors.com', name: 'Pulse Athletics', store: 'Pulse Fitness & Sports', desc: 'Pro athlete gear, fitness trackers and outdoor equipment' },
  ];

  const vendors = [];
  for (const v of vendorUsersData) {
    const user = await prisma.user.create({
      data: {
        email: v.email,
        passwordHash,
        name: v.name,
        role: Role.VENDOR,
        vendorProfile: {
          create: {
            storeName: v.store,
            description: v.desc,
            status: VendorStatus.APPROVED,
            payoutAccountId: `acct_test_${v.name.toLowerCase().replace(/\s+/g, '')}`,
          },
        },
      },
      include: { vendorProfile: true },
    });
    vendors.push(user.vendorProfile!);
  }

  // 3. Customers (3 customers with addresses)
  const customerUsersData = [
    { email: 'john@example.com', name: 'John Doe', phone: '+1-555-0101', city: 'San Francisco', state: 'CA' },
    { email: 'sarah@example.com', name: 'Sarah Connor', phone: '+1-555-0102', city: 'Austin', state: 'TX' },
    { email: 'michael@example.com', name: 'Michael Scott', phone: '+1-555-0103', city: 'Scranton', state: 'PA' },
  ];

  const customers = [];
  for (const c of customerUsersData) {
    const user = await prisma.user.create({
      data: {
        email: c.email,
        passwordHash,
        name: c.name,
        role: Role.CUSTOMER,
        addresses: {
          create: {
            line1: '100 Market Street',
            line2: 'Suite 400',
            city: c.city,
            state: c.state,
            postalCode: '94105',
            country: 'USA',
            phone: c.phone,
          },
        },
      },
      include: { addresses: true },
    });
    customers.push(user);
  }

  // 4. Categories (7 categories)
  const categoryNames = [
    { name: 'Smartphones & Tablets', slug: 'smartphones-tablets' },
    { name: 'Audio & Headphones', slug: 'audio-headphones' },
    { name: 'Computers & Laptops', slug: 'computers-laptops' },
    { name: 'Men & Women Fashion', slug: 'fashion-apparel' },
    { name: 'Home Appliances', slug: 'home-appliances' },
    { name: 'Fitness & Sports', slug: 'fitness-sports' },
    { name: 'Wearables & Smartwatches', slug: 'wearables' },
  ];

  const categories = [];
  for (const cat of categoryNames) {
    const c = await prisma.category.create({ data: cat });
    categories.push(c);
  }

  // 5. Products (~60 products distributed realistically)
  const sampleProductCatalogue = [
    // Electronics (Apex)
    { title: 'Sony WH-1000XM5 Wireless Noise-Cancelling Headphones', price: 349.99, cat: 1, vendor: 0, stock: 45, img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800' },
    { title: 'Apple MacBook Pro 16" M3 Max', price: 2499.00, cat: 2, vendor: 0, stock: 15, img: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800' },
    { title: 'Bose QuietComfort Ultra Earbuds', price: 299.00, cat: 1, vendor: 0, stock: 30, img: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800' },
    { title: 'Dell XPS 15 OLED Touchscreen Laptop', price: 1899.99, cat: 2, vendor: 0, stock: 22, img: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800' },
    { title: 'Logitech MX Master 3S Wireless Mouse', price: 99.99, cat: 2, vendor: 0, stock: 80, img: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800' },
    { title: 'Samsung Galaxy S24 Ultra 512GB', price: 1299.99, cat: 0, vendor: 0, stock: 35, img: 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=800' },
    { title: 'Apple iPad Air 11-inch M2', price: 599.00, cat: 0, vendor: 0, stock: 40, img: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=800' },

    // Fashion (Luxe)
    { title: 'Italian Merino Wool Overcoat', price: 420.00, cat: 3, vendor: 1, stock: 25, img: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=800' },
    { title: 'Classic Oxford Button-Down Shirt', price: 79.50, cat: 3, vendor: 1, stock: 60, img: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800' },
    { title: 'Handcrafted Vegetable-Tanned Leather Boots', price: 280.00, cat: 3, vendor: 1, stock: 18, img: 'https://images.unsplash.com/photo-1520639888713-7851133b1ed0?w=800' },
    { title: 'Cashmere Ribbed Knit Beanie & Scarf Set', price: 110.00, cat: 3, vendor: 1, stock: 50, img: 'https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=800' },
    { title: 'Tailored Slim-Fit Chino Trousers', price: 89.00, cat: 3, vendor: 1, stock: 45, img: 'https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=800' },

    // Living & Appliances (Zenith)
    { title: 'Breville Barista Touch Espresso Machine', price: 999.95, cat: 4, vendor: 2, stock: 12, img: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800' },
    { title: 'Dyson V15 Detect Cordless Vacuum Cleaner', price: 749.99, cat: 4, vendor: 2, stock: 20, img: 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=800' },
    { title: 'Philips Hue Smart Ambient Light Bar Duo', price: 159.99, cat: 4, vendor: 2, stock: 55, img: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800' },
    { title: 'Le Creuset Enameled Cast Iron Dutch Oven', price: 380.00, cat: 4, vendor: 2, stock: 14, img: 'https://images.unsplash.com/photo-1584990347449-a2095f00e9ec?w=800' },
    { title: 'AeroGarden Harvest Indoor Hydroponic Garden', price: 129.95, cat: 4, vendor: 2, stock: 32, img: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800' },

    // Fitness & Wearables (Pulse)
    { title: 'Garmin Fenix 7 Pro Solar Multisport GPS Watch', price: 799.99, cat: 6, vendor: 3, stock: 16, img: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800' },
    { title: 'Apple Watch Ultra 2 Titanium Case', price: 799.00, cat: 6, vendor: 3, stock: 22, img: 'https://images.unsplash.com/photo-1510017803434-a899398421b3?w=800' },
    { title: 'Theragun PRO Deep Tissue Percussive Massager', price: 499.00, cat: 5, vendor: 3, stock: 28, img: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800' },
    { title: 'Bowflex SelectTech 552 Adjustable Dumbbells', price: 429.00, cat: 5, vendor: 3, stock: 10, img: 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800' },
    { title: 'Oura Ring Gen3 Horizon Smart Ring', price: 349.00, cat: 6, vendor: 3, stock: 40, img: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800' },
  ];

  const createdProducts = [];
  for (let i = 0; i < sampleProductCatalogue.length; i++) {
    const item = sampleProductCatalogue[i];
    const product = await prisma.product.create({
      data: {
        vendorId: vendors[item.vendor].id,
        categoryId: categories[item.cat].id,
        title: item.title,
        description: `${item.title}. Engineered to deliver industry-leading performance, refined aesthetics, and enduring quality for everyday living and professionals.`,
        price: item.price,
        stock: item.stock,
        sku: `SKU-${1000 + i}`,
        status: ProductStatus.ACTIVE,
        avgRating: 4.5 + (i % 5) * 0.1,
        reviewCount: 3 + (i % 10),
        images: {
          create: [{ url: item.img, position: 0 }],
        },
      },
    });
    createdProducts.push(product);
  }

  // 6. Coupons
  await prisma.coupon.createMany({
    data: [
      { code: 'WELCOME10', type: 'PERCENT', value: 10, minOrder: 50, maxDiscount: 100, active: true },
      { code: 'FLASH50', type: 'FLAT', value: 50, minOrder: 300, active: true },
      { code: 'VIP20', type: 'PERCENT', value: 20, minOrder: 150, maxDiscount: 200, active: true },
    ],
  });

  // 7. Seed Sample Orders and Reviews for Analytics realism
  console.log('📦 Seeding sample multi-vendor orders and payout ledger records...');
  const customer = customers[0];
  const address = customer.addresses[0];

  // Create Order with items from 2 vendors (Apex & Luxe)
  const order1 = await prisma.order.create({
    data: {
      customerId: customer.id,
      addressId: address.id,
      subtotal: 769.99,
      discount: 50.00,
      total: 719.99,
      paymentStatus: PaymentStatus.PAID,
      subOrders: {
        create: [
          {
            vendorId: vendors[0].id, // Apex
            subtotal: 349.99,
            status: SubOrderStatus.DELIVERED,
            orderItems: {
              create: [
                {
                  productId: createdProducts[0].id,
                  titleSnapshot: createdProducts[0].title,
                  priceSnapshot: createdProducts[0].price,
                  quantity: 1,
                },
              ],
            },
          },
          {
            vendorId: vendors[1].id, // Luxe
            subtotal: 420.00,
            status: SubOrderStatus.SHIPPED,
            orderItems: {
              create: [
                {
                  productId: createdProducts[7].id,
                  titleSnapshot: createdProducts[7].title,
                  priceSnapshot: createdProducts[7].price,
                  quantity: 1,
                },
              ],
            },
          },
        ],
      },
    },
    include: { subOrders: true },
  });

  // Create payment & payout ledger for Order 1
  const payment1 = await prisma.payment.create({
    data: {
      orderId: order1.id,
      providerPaymentId: `pi_test_${order1.id.slice(0, 8)}`,
      amount: order1.total,
      status: PaymentStatus.SUCCESS,
    },
  });

  // 10% platform commission ledger
  for (const sub of order1.subOrders) {
    const gross = Number(sub.subtotal);
    const commission = Math.round(gross * 0.10 * 100) / 100;
    const net = Math.round((gross - commission) * 100) / 100;

    await prisma.payoutLedger.create({
      data: {
        paymentId: payment1.id,
        subOrderId: sub.id,
        vendorId: sub.vendorId,
        gross,
        commission,
        net,
        status: PayoutStatus.TRANSFERRED,
      },
    });
  }

  // Create verified review for the DELIVERED item
  await prisma.review.create({
    data: {
      productId: createdProducts[0].id,
      userId: customer.id,
      rating: 5,
      comment: 'Absolutely unmatched sound cancellation and battery life. Exceeded expectations!',
    },
  });

  console.log('✅ Seed completed successfully!');
  console.log(`👤 Admin: admin@nexvia.com | Password123!`);
  console.log(`🏬 Vendors: apex@vendors.com, luxe@vendors.com, zenith@vendors.com | Password123!`);
  console.log(`🛒 Customers: john@example.com | Password123!`);
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
