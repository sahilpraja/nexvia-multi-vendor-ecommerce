import { prisma } from '../config/prisma.js';
import { CartService } from '../services/cart.service.js';

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'john@example.com' } });
  console.log('User:', user?.id, user?.name);
  if (!user) return;
  const cart = await CartService.getCart(user.id);
  console.log('Cart items count:', cart.items.length);
  for (const item of cart.items) {
    const p = await prisma.product.findUnique({ where: { id: item.productId } });
    console.log(`Product: "${p?.title}", ID: ${p?.id}, Stock: ${p?.stock}, Cart Qty: ${item.quantity}, IsActive: ${p?.isActive}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
