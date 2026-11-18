import { Response, NextFunction } from 'express';
import { generatePresignedUploadUrl } from '../services/s3.service.js';
import { sendResponse } from '../utils/apiResponse.js';
import { AuthenticatedRequest } from '../middlewares/auth.middleware.js';

export const presignUpload = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { fileName, fileType, fileSize } = req.body;
    const result = await generatePresignedUploadUrl({ fileName, fileType, fileSize });
    return sendResponse(res, 200, true, 'Pre-signed URL generated successfully', result);
  } catch (error) {
    return next(error);
  }
};
