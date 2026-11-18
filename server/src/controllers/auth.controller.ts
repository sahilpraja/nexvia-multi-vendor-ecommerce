import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { ApiError, sendResponse } from '../utils/apiResponse.js';
import {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} from '../utils/token.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';
import { CartService } from '../services/cart.service.js';

const COOKIE_NAME = 'refreshToken';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const register = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return next(ApiError.conflict('User with this email already exists'));
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role || 'CUSTOMER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    // Auto-create vendor profile in PENDING status if registering as VENDOR
    let vendorId: string | undefined;
    if (user.role === 'VENDOR') {
      const vendor = await prisma.vendorProfile.create({
        data: {
          userId: user.id,
          storeName: `${user.name}'s Store`,
          status: 'PENDING',
        },
      });
      vendorId = vendor.id;
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      vendorId,
    });

    const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);

    return sendResponse(res, 201, true, 'User registered successfully', {
      user,
      accessToken,
    });
  } catch (error) {
    return next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { vendorProfile: true },
    });

    if (!user) {
      return next(ApiError.unauthorized('Invalid email or password'));
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return next(ApiError.unauthorized('Invalid email or password'));
    }

    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      vendorId: user.vendorProfile?.id,
    });

    const { token: refreshToken, tokenHash, expiresAt } = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);

    // Auto-merge guest cart items into authenticated user cart
    const guestHeader = req.headers['x-guest-session-id'] as string;
    if (guestHeader) {
      await CartService.mergeGuestCart(`guest_${guestHeader}`, user.id);
    }

    return sendResponse(res, 200, true, 'Logged in successfully', {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        vendorProfile: user.vendorProfile,
      },
      accessToken,
    });
  } catch (error) {
    return next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const incomingRefreshToken = req.cookies?.[COOKIE_NAME];
    if (!incomingRefreshToken) {
      return next(ApiError.unauthorized('No refresh token provided'));
    }

    const tokenHash = hashToken(incomingRefreshToken);
    const storedToken = await prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          include: { vendorProfile: true },
        },
      },
    });

    if (!storedToken) {
      // Possible token reuse or revoked token - clear cookie
      res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
      return next(ApiError.unauthorized('Refresh token invalid or expired'));
    }

    // Token rotation: Revoke current refresh token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Generate fresh pair
    const newAccessToken = generateAccessToken({
      userId: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
      vendorId: storedToken.user.vendorProfile?.id,
    });

    const { token: newRefreshToken, tokenHash: newTokenHash, expiresAt } = generateRefreshToken();

    await prisma.refreshToken.create({
      data: {
        userId: storedToken.user.id,
        tokenHash: newTokenHash,
        expiresAt,
      },
    });

    res.cookie(COOKIE_NAME, newRefreshToken, COOKIE_OPTIONS);

    return sendResponse(res, 200, true, 'Token refreshed successfully', {
      accessToken: newAccessToken,
    });
  } catch (error) {
    return next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const incomingRefreshToken = req.cookies?.[COOKIE_NAME];
    if (incomingRefreshToken) {
      const tokenHash = hashToken(incomingRefreshToken);
      await prisma.refreshToken.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
    return sendResponse(res, 200, true, 'Logged out successfully');
  } catch (error) {
    return next(error);
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        vendorProfile: true,
      },
    });

    if (!user) {
      return next(ApiError.notFound('User not found'));
    }

    return sendResponse(res, 200, true, 'User profile retrieved', user);
  } catch (error) {
    return next(error);
  }
};
