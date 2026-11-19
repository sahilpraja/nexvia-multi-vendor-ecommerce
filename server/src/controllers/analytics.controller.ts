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

export const getDashboardStats = async (
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const [
      totalProducts,
      activeProducts,
      draftProducts,
      totalCategories,
      totalVendors,
      approvedVendors,
      pendingVendors,
      suspendedVendors,
      gmvResult,
      totalOrders,
      recentProducts,
      recentVendors,
      pendingVendorsList,
      categoriesWithCount,
      allVendorsForChart,
    ] = await Promise.all([
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.product.count({ where: { status: 'ACTIVE', deletedAt: null } }),
      prisma.product.count({ where: { status: 'DRAFT', deletedAt: null } }),
      prisma.category.count(),
      prisma.vendorProfile.count(),
      prisma.vendorProfile.count({ where: { status: 'APPROVED' } }),
      prisma.vendorProfile.count({ where: { status: 'PENDING' } }),
      prisma.vendorProfile.count({ where: { status: 'SUSPENDED' } }),
      prisma.order.aggregate({
        where: { paymentStatus: 'PAID' },
        _sum: { total: true },
      }),
      prisma.order.count(),
      prisma.product.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          vendor: { select: { id: true, storeName: true } },
          category: { select: { id: true, name: true } },
          images: { orderBy: { position: 'asc' }, take: 1 },
        },
      }),
      prisma.vendorProfile.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: { select: { id: true, name: true, email: true } },
          _count: { select: { products: true, subOrders: true } },
        },
      }),
      prisma.vendorProfile.findMany({
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.category.findMany({
        take: 6,
        select: {
          id: true,
          name: true,
          _count: { select: { products: true } },
        },
        orderBy: { products: { _count: 'desc' } },
      }),
      prisma.vendorProfile.findMany({
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const productStatusDistribution = [
      { status: 'Active', count: activeProducts, color: '#10B981' },
      { status: 'Draft / Inactive', count: draftProducts, color: '#6B7280' },
    ];

    const vendorStatusDistribution = [
      { status: 'Approved', count: approvedVendors, color: '#10B981' },
      { status: 'Pending Review', count: pendingVendors, color: '#F59E0B' },
      { status: 'Suspended', count: suspendedVendors, color: '#EF4444' },
    ];

    const vendorRegMap = new Map<string, number>();
    for (const v of allVendorsForChart) {
      const dateKey = v.createdAt.toISOString().split('T')[0];
      vendorRegMap.set(dateKey, (vendorRegMap.get(dateKey) || 0) + 1);
    }
    const vendorRegistrationChart = Array.from(vendorRegMap.entries()).map(([date, count]) => ({
      date,
      registrations: count,
    }));

    return sendResponse(res, 200, true, 'Admin dashboard statistics', {
      products: {
        total: totalProducts,
        active: activeProducts,
        pendingOrDraft: draftProducts,
        statusDistribution: productStatusDistribution,
      },
      categories: {
        total: totalCategories,
        topCategories: categoriesWithCount.map((c) => ({
          id: c.id,
          name: c.name,
          productCount: c._count.products,
        })),
      },
      vendors: {
        total: totalVendors,
        approved: approvedVendors,
        pending: pendingVendors,
        suspended: suspendedVendors,
        statusDistribution: vendorStatusDistribution,
        registrationChart: vendorRegistrationChart,
      },
      orders: {
        total: totalOrders,
        totalRevenue: Math.round(Number(gmvResult._sum.total || 0) * 100) / 100,
      },
      recentProducts: recentProducts.map((p) => ({
        id: p.id,
        title: p.title,
        price: Number(p.price),
        stock: p.stock,
        status: p.status,
        sku: p.sku,
        categoryName: p.category.name,
        vendorName: p.vendor.storeName,
        imageUrl: p.images[0]?.url || '',
        createdAt: p.createdAt,
      })),
      recentVendors: recentVendors.map((v) => ({
        id: v.id,
        storeName: v.storeName,
        ownerName: v.user.name,
        email: v.user.email,
        status: v.status,
        productCount: v._count.products,
        createdAt: v.createdAt,
      })),
      pendingVendorsList: pendingVendorsList.map((v) => ({
        id: v.id,
        storeName: v.storeName,
        ownerName: v.user.name,
        email: v.user.email,
        status: v.status,
        createdAt: v.createdAt,
      })),
    });
  } catch (error) {
    return next(error);
  }
};

