import { Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';
import { sendResponse } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export const getAnalyticsSummary = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const [
      gmvResult,
      commissionResult,
      ordersCount,
      activeVendorsCount,
      customersCount,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
      prisma.payoutLedger.aggregate({
        where: { status: 'TRANSFERRED' },
        _sum: { commission: true },
      }),
      prisma.order.count(),
      prisma.vendorProfile.count({
        where: { status: 'APPROVED' },
      }),
      prisma.user.count({
        where: { role: 'CUSTOMER' },
      }),
    ]);

    const totalGMV = Number(gmvResult._sum.total || 0);
    const platformCommission = Number(commissionResult._sum.commission || 0);

    return sendResponse(res, 200, true, 'Admin analytics summary', {
      totalGMV: Math.round(totalGMV * 100) / 100,
      platformCommission: Math.round(platformCommission * 100) / 100,
      totalOrders: ordersCount,
      activeVendors: activeVendorsCount,
      totalCustomers: customersCount,
    });
  } catch (error) {
    return next(error);
  }
};

export const getRevenueOverTime = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const orders = await prisma.order.findMany({
      where: { paymentStatus: 'PAID' },
      select: {
        total: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const dailyRevenueMap = new Map<string, number>();

    for (const order of orders) {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      const prev = dailyRevenueMap.get(dateKey) || 0;
      dailyRevenueMap.set(dateKey, prev + Number(order.total));
    }

    const data = Array.from(dailyRevenueMap.entries()).map(([date, revenue]) => ({
      date,
      revenue: Math.round(revenue * 100) / 100,
    }));

    return sendResponse(res, 200, true, 'Revenue over time', data);
  } catch (error) {
    return next(error);
  }
};

export const getTopVendors = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const vendors = await prisma.vendorProfile.findMany({
      include: {
        payoutLedger: {
          where: { status: 'TRANSFERRED' },
        },
      },
      take: 5,
    });

    const result = vendors.map((v) => {
      const totalSales = v.payoutLedger.reduce((acc, curr) => acc + Number(curr.gross), 0);
      return {
        id: v.id,
        storeName: v.storeName,
        totalSales: Math.round(totalSales * 100) / 100,
      };
    }).sort((a, b) => b.totalSales - a.totalSales);

    return sendResponse(res, 200, true, 'Top vendors', result);
  } catch (error) {
    return next(error);
  }
};

export const getTopProducts = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { avgRating: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        price: true,
        stock: true,
        avgRating: true,
        reviewCount: true,
      },
    });

    return sendResponse(res, 200, true, 'Top products', products);
  } catch (error) {
    return next(error);
  }
};

export const exportCsv = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const orders = await prisma.order.findMany({
      include: {
        customer: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    let csv = 'Order ID,Date,Customer Name,Customer Email,Subtotal,Discount,Total,Payment Status\n';
    for (const o of orders) {
      csv += `"${o.id}","${o.createdAt.toISOString()}","${o.customer.name}","${o.customer.email}",${o.subtotal},${o.discount},${o.total},"${o.paymentStatus}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="analytics-orders.csv"');
    return res.status(200).send(csv);
  } catch (error) {
    return next(error);
  }
};
