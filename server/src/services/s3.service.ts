import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import path from 'path';
import { s3Client } from '../config/s3.js';
import { config } from '../config/index.js';
import { ApiError } from '../utils/apiResponse.js';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export interface PresignRequest {
  fileName: string;
  fileType: string;
  fileSize: number;
}

export const generatePresignedUploadUrl = async (req: PresignRequest) => {
  if (!ALLOWED_MIME_TYPES.includes(req.fileType)) {
    throw ApiError.badRequest('Invalid file type. Allowed: jpg, png, webp');
  }

  if (req.fileSize > MAX_FILE_SIZE_BYTES) {
    throw ApiError.badRequest('File size exceeds the 5MB limit');
  }

  const ext = path.extname(req.fileName) || `.${req.fileType.split('/')[1]}`;
  const uniqueKey = `products/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;

  const command = new PutObjectCommand({
    Bucket: config.s3.bucketName,
    Key: uniqueKey,
    ContentType: req.fileType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: 600 });
  const fileUrl = `${config.s3.endpoint}/${config.s3.bucketName}/${uniqueKey}`;

  return {
    uploadUrl,
    fileUrl,
    key: uniqueKey,
  };
};
