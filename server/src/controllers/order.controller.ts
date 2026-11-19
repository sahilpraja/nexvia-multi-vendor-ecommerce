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
    const { addressId, address, couponCode, paymentMethod = 'STRIPE' } = req.body;

    let resolvedAddressId = addressId;

    // If inline address data is provided, create it first
    if (!resolvedAddressId && address) {
      const { fullName, line1, line2, city, state, postalCode, country, phone } = address;
      if (!line1 || !city || !state || !postalCode || !phone) {
        return next(ApiError.badRequest('Address requires line1, city, state, postalCode and phone'));
      }
      const created = await prisma.address.create({
        data: {
          userId,
          fullName: fullName?.trim() || req.user!.email,
          line1: line1.trim(),
          line2: line2?.trim() || '',
          city: city.trim(),
          state: state.trim(),
          postalCode: postalCode.trim(),
          country: country?.trim() || 'US',
          phone: phone.trim(),
          isDefault: true,
        },
      });
      resolvedAddressId = created.id;
    }

    if (!resolvedAddressId) {
      return next(ApiError.badRequest('Shipping address is required'));
    }

    const orderResult = await OrderService.checkout(
      userId,
      resolvedAddressId,
      couponCode,
      paymentMethod === 'COD' ? 'COD' : 'STRIPE'
    );
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
        statusHistories: {
          orderBy: { createdAt: 'desc' },
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
        customer: { select: { id: true, name: true, email: true } },
        address: true,
        subOrders: {
          include: {
            vendor: { select: { id: true, storeName: true } },
            orderItems: true,
          },
        },
        statusHistories: {
          orderBy: { createdAt: 'desc' },
        },
        payment: true,
      },
    });

    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    if (!isAdmin && order.customerId !== userId) {
      throw ApiError.forbidden('You are not authorized to view this order');
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

/* =========================================================================
   ADMIN ORDER MANAGEMENT CONTROLLER ENDPOINTS
========================================================================= */

/**
 * GET /api/v1/admin/orders
 * Admin: List all customer orders with searching and filtering
 */
export const listAdminOrders = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const search = req.query.search as string | undefined;
    const status = req.query.status as string | undefined;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;

    const result = await OrderService.listAdminOrders({ search, status, page, limit });
    return sendResponse(res, 200, true, 'Admin orders retrieved successfully', result);
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/admin/orders/:id
 * Admin: Get complete order details with history & customer address
 */
export const getAdminOrderById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const order = await OrderService.getAdminOrderById(id);
    return sendResponse(res, 200, true, 'Order details retrieved', order);
  } catch (error) {
    return next(error);
  }
};

/**
 * PATCH /api/v1/admin/orders/:id/status
 * Admin: Update order status, courier info, tracking number, and append history
 */
export const updateAdminOrderStatus = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const { status, courierName, trackingNumber, note, force } = req.body;

    if (!status) {
      return next(ApiError.badRequest('Status is required'));
    }

    const adminUser = {
      id: req.user!.userId,
      email: req.user!.email,
      name: (req.user as any).name || 'Admin',
    };

    const updatedOrder = await OrderService.updateOrderStatusByAdmin(
      id,
      { status, courierName, trackingNumber, note, force },
      adminUser
    );

    return sendResponse(res, 200, true, `Order status successfully updated to ${status}`, updatedOrder);
  } catch (error) {
    return next(error);
  }
};
