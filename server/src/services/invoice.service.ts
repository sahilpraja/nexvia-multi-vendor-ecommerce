import PDFDocument from 'pdfkit';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/apiResponse.js';

export class InvoiceService {
  static async generateInvoicePdf(orderId: string, requestUserId: string, isAdmin: boolean) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        address: true,
        subOrders: {
          include: {
            vendor: { select: { storeName: true } },
            orderItems: true,
          },
        },
      },
    });

    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    if (!isAdmin && order.customerId !== requestUserId) {
      throw ApiError.forbidden('You are not authorized to download this invoice');
    }

    const doc = new PDFDocument({ margin: 50 });

    // Header
    doc
      .fontSize(22)
      .fillColor('#2563eb')
      .text('NEXVIA MARKETPLACE', { align: 'left' })
      .fontSize(10)
      .fillColor('#64748b')
      .text('Official Commercial Order Invoice', { align: 'left' })
      .moveDown(1);

    // Invoice Meta
    const invoiceNumber = `INV-${order.id.slice(0, 8).toUpperCase()}`;
    const invoiceDate = new Date(order.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    doc
      .fillColor('#0f172a')
      .fontSize(11)
      .text(`Invoice Number: ${invoiceNumber}`, { bold: true } as any)
      .text(`Order ID: ${order.id}`)
      .text(`Date: ${invoiceDate}`)
      .text(`Payment Status: ${order.paymentStatus}`)
      .moveDown(1);

    // Billed To & Shipped To
    doc
      .fontSize(12)
      .fillColor('#1e293b')
      .text('Billed & Shipped To:')
      .fontSize(10)
      .fillColor('#475569')
      .text(`Customer: ${order.customer.name} (${order.customer.email})`)
      .text(`Address: ${order.address.line1}${order.address.line2 ? ', ' + order.address.line2 : ''}`)
      .text(`${order.address.city}, ${order.address.state} ${order.address.postalCode}, ${order.address.country}`)
      .text(`Phone: ${order.address.phone}`)
      .moveDown(1.5);

    // Line items by vendor
    doc
      .fontSize(12)
      .fillColor('#0f172a')
      .text('Items Ordered by Vendor:')
      .moveDown(0.5);

    for (const sub of order.subOrders) {
      doc
        .fontSize(11)
        .fillColor('#2563eb')
        .text(`Vendor: ${sub.vendor.storeName} (Sub-Order #${sub.id.slice(0, 8)})`)
        .moveDown(0.2);

      for (const item of sub.orderItems) {
        const itemLine = `  • ${item.titleSnapshot}  x${item.quantity}  @  $${Number(item.priceSnapshot).toFixed(2)}  =  $${(Number(item.priceSnapshot) * item.quantity).toFixed(2)}`;
        doc
          .fontSize(10)
          .fillColor('#334155')
          .text(itemLine);
      }
      doc.moveDown(0.5);
    }

    doc.moveDown(1);

    // Totals Section
    doc
      .fontSize(10)
      .fillColor('#0f172a')
      .text(`Subtotal: $${Number(order.subtotal).toFixed(2)}`, { align: 'right' })
      .text(`Discount: -$${Number(order.discount).toFixed(2)}`, { align: 'right' })
      .fontSize(13)
      .fillColor('#16a34a')
      .text(`Total Paid: $${Number(order.total).toFixed(2)}`, { align: 'right' })
      .moveDown(2);

    // Footer
    doc
      .fontSize(9)
      .fillColor('#94a3b8')
      .text('Thank you for shopping with Nexvia Marketplace.', { align: 'center' });

    doc.end();
    return doc;
  }
}
