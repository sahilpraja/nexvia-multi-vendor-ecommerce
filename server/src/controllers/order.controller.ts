import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { OrderService } from '../services/order.service.js';
import { InvoiceService } from '../services/invoice.service.js';
import { ApiError, sendResponse } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export const checkout = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user!.userId;
    const { addressId, address, couponCode } = req.body;

    let resolvedAddressId = addressId;

    // If inline address data is provided, create it first
    if (!resolvedAddressId && address) {
      const { line1, line2, city, state, postalCode, country, phone } = address;
      if (!line1 || !city || !state || !postalCode || !phone) {
        return next(ApiError.badRequest('Address requires line1, city, state, postalCode and phone'));
      }
      const created = await prisma.address.create({
        data: { userId, line1, line2: line2 || '', city, state, postalCode, country: country || 'US', phone },
      });
      resolvedAddressId = created.id;
    }

    if (!resolvedAddressId) {
      return next(ApiError.badRequest('Shipping address is required'));
    }

    const orderResult = await OrderService.checkout(userId, resolvedAddressId, couponCode);
    return sendResponse(res, 201, true, 'Order created successfully', orderResult);
  } catch (error) {
    return next(error);
  }
};

export const listCustomerOrders = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const customerId = req.user!.userId;
    const orders = await prisma.order.findMany({
      where: { customerId },
      include: {
        address: true,
        subOrders: {
          include: {
            vendor: { select: { id: true, storeName: true } },
            orderItems: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sendResponse(res, 200, true, 'Orders retrieved', orders);
  } catch (error) {
    return next(error);
  }
};

export const getOrderById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        address: true,
        subOrders: {
          include: {
            vendor: { select: { id: true, storeName: true } },
            orderItems: true,
          },
        },
        payment: true,
      },
    });

    if (!order) {
      return next(ApiError.notFound('Order not found'));
    }

    if (!isAdmin && order.customerId !== userId) {
      return next(ApiError.forbidden('You are not authorized to view this order'));
    }

    return sendResponse(res, 200, true, 'Order retrieved', order);
  } catch (error) {
    return next(error);
  }
};

export const cancelOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const result = await OrderService.cancelOrder(id, userId);
    return sendResponse(res, 200, true, result.message);
  } catch (error) {
    return next(error);
  }
};

export const downloadInvoice = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';

    const pdfDoc = await InvoiceService.generateInvoicePdf(id, userId, isAdmin);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${id.slice(0, 8)}.pdf`);

    pdfDoc.pipe(res);
  } catch (error) {
    return next(error);
  }
};

export const listVendorSubOrders = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const vendorId = req.user!.vendorId!;
    const status = req.query.status as any;

    const where: any = { vendorId };
    if (status) {
      where.status = status;
    }

    const subOrders = await prisma.subOrder.findMany({
      where,
      include: {
        order: {
          include: {
            address: true,
            customer: { select: { name: true, email: true } },
          },
        },
        orderItems: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return sendResponse(res, 200, true, 'Vendor sub-orders retrieved', subOrders);
  } catch (error) {
    return next(error);
  }
};

export const updateSubOrderStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const vendorId = req.user!.vendorId!;
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return next(ApiError.badRequest('New status is required'));
    }

    const updated = await OrderService.advanceSubOrderStatus(id, vendorId, status);
    return sendResponse(res, 200, true, `Sub-order status updated to ${status}`, updated);
  } catch (error) {
    return next(error);
  }
};
