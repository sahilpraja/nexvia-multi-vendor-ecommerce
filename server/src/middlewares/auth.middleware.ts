import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ApiError } from '../utils/apiResponse.js';
import { verifyAccessToken, TokenPayload } from '../utils/token.js';
import { prisma } from '../config/prisma.js';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export const authenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(ApiError.unauthorized('Authentication token is required'));
    }

    const token = authHeader.split(' ')[1];
    try {
      const decoded = verifyAccessToken(token);
      req.user = decoded;
      return next();
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        return next(new ApiError(401, 'Access token expired'));
      }
      return next(ApiError.unauthorized('Invalid access token'));
    }
  } catch (error) {
    return next(error);
  }
};

export const optionalAuthenticate = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = verifyAccessToken(token);
        req.user = decoded;
      } catch {
        // Token invalid/expired - continue as guest
      }
    }
    return next();
  } catch {
    return next();
  }
};

export const requireRole = (allowedRoles: Role[]) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('You do not have permission to access this resource'));
    }

    return next();
  };
};

export const requireApprovedVendor = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return next(ApiError.unauthorized('Authentication required'));
  }

  if (req.user.role !== 'VENDOR' && req.user.role !== 'ADMIN') {
    return next(ApiError.forbidden('Vendor access required'));
  }

  if (req.user.role === 'ADMIN') {
    return next();
  }

  const vendor = await prisma.vendorProfile.findUnique({
    where: { userId: req.user.userId },
  });

  if (!vendor) {
    return next(ApiError.forbidden('No vendor profile found for this account'));
  }

  if (vendor.status !== 'APPROVED') {
    return next(ApiError.forbidden(`Vendor store status is ${vendor.status}. Only approved vendors can manage products.`));
  }

  req.user.vendorId = vendor.id;
  return next();
};
