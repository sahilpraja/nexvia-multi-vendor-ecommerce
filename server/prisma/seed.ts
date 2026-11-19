import { PrismaClient, ProductStatus, Role, VendorStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEMO_PASSWORD = 'Password123!';

const categories = [
  { name: 'Audio & Headphones', slug: 'audio-headphones' },
  { name: 'Computers & Laptops', slug: 'computers-laptops' },
  { name: 'Home Appliances', slug: 'home-appliances' },
  { name: 'Fitness & Sports', slug: 'fitness-sports' },
];

const products = [
  { sku: 'DEMO-WONDER-001', title: 'Studio Wireless Headphones', category: 'audio-headphones', price: 129.99, stock: 32, image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800' },
  { sku: 'DEMO-WONDER-002', title: 'Portable Bluetooth Speaker', category: 'audio-headphones', price: 79.99, stock: 48, image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800' },
  { sku: 'DEMO-WONDER-003', title: 'Everyday Laptop Backpack', category: 'computers-laptops', price: 54.5, stock: 25, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800' },
  { sku: 'DEMO-WONDER-004', title: 'Compact Mechanical Keyboard', category: 'computers-laptops', price: 89, stock: 19, image: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800' },
  { sku: 'DEMO-WONDER-005', title: 'Pour-Over Coffee Maker', category: 'home-appliances', price: 42, stock: 36, image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800' },
  { sku: 'DEMO-WONDER-006', title: 'Insulated Travel Tumbler', category: 'home-appliances', price: 24.99, stock: 60, image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800' },
  { sku: 'DEMO-WONDER-007', title: 'Adjustable Yoga Mat', category: 'fitness-sports', price: 35, stock: 41, image: 'https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=800' },
  { sku: 'DEMO-WONDER-008', title: 'Fitness Resistance Band Set', category: 'fitness-sports', price: 18.5, stock: 75, image: 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=800' },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@nexvia.com' },
    update: { name: 'Nexvia Demo Admin', role: Role.ADMIN, passwordHash },
    create: { email: 'admin@nexvia.com', name: 'Nexvia Demo Admin', role: Role.ADMIN, passwordHash },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: { name: 'Casey Customer', role: Role.CUSTOMER, passwordHash },
    create: { email: 'customer@example.com', name: 'Casey Customer', role: Role.CUSTOMER, passwordHash },
  });

  const wonder = await prisma.user.upsert({
    where: { email: 'wonder@vendors.com' },
    update: { name: 'Wonder', role: Role.VENDOR, passwordHash },
    create: { email: 'wonder@vendors.com', name: 'Wonder', role: Role.VENDOR, passwordHash },
  });

  const vendor = await prisma.vendorProfile.upsert({
    where: { userId: wonder.id },
    update: { storeName: 'Wonder Goods', description: 'Useful finds for work, home, and everyday adventures.', status: VendorStatus.APPROVED },
    create: {
      userId: wonder.id,
      storeName: 'Wonder Goods',
      description: 'Useful finds for work, home, and everyday adventures.',
      status: VendorStatus.APPROVED,
    },
  });

  const categoryBySlug = new Map<string, string>();
  for (const category of categories) {
    const saved = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category,
    });
    categoryBySlug.set(category.slug, saved.id);
  }

  for (const item of products) {
    const categoryId = categoryBySlug.get(item.category)!;
    const existing = await prisma.product.findUnique({ where: { sku: item.sku } });
    if (existing) {
      await prisma.product.update({
        where: { sku: item.sku },
        data: {
          vendorId: vendor.id,
          categoryId,
          title: item.title,
          description: `${item.title}: a quality everyday essential from Wonder Goods.`,
          price: item.price,
          stock: item.stock,
          status: ProductStatus.ACTIVE,
          deletedAt: null,
        },
      });
      if (!(await prisma.productImage.findFirst({ where: { productId: existing.id } }))) {
        await prisma.productImage.create({ data: { productId: existing.id, url: item.image, position: 0 } });
      }
    } else {
      await prisma.product.create({
        data: {
          sku: item.sku,
          vendorId: vendor.id,
          categoryId,
          title: item.title,
          description: `${item.title}: a quality everyday essential from Wonder Goods.`,
          price: item.price,
          stock: item.stock,
          status: ProductStatus.ACTIVE,
          avgRating: 4.7,
          reviewCount: 12,
          images: { create: [{ url: item.image, position: 0 }] },
        },
      });
    }
  }

  const address = await prisma.address.findFirst({ where: { userId: customer.id } });
  if (!address) {
    await prisma.address.create({
      data: {
        userId: customer.id,
        line1: '100 Market Street',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
        country: 'USA',
        phone: '+1-555-0100',
      },
    });
  }

  console.log('Demo data is ready. Existing marketplace records were preserved.');
  console.log(`Admin: ${admin.email} | ${DEMO_PASSWORD}`);
  console.log(`Customer: ${customer.email} | ${DEMO_PASSWORD}`);
  console.log(`Wonder vendor: ${wonder.email} | ${DEMO_PASSWORD}`);
  console.log(`Products: ${products.length} demo products in Wonder Goods`);
}

main()
  .catch((error) => {
    console.error('Seed error:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
