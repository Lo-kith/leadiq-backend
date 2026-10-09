import multer from 'multer';
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { maxCsvBytes, env } from '../config/env.js';
import { AppError } from './errors.js';

const ALLOWED_EXTENSIONS = ['.csv', '.txt'];

const storage = multer.memoryStorage();

const uploader = multer({
  storage,
  limits: { fileSize: maxCsvBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();
    const extOk = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
    const mimeOk = [
      'text/csv',
      'text/plain',
      'application/csv',
      'application/vnd.ms-excel',
      'application/octet-stream',
    ].includes(file.mimetype);
    if (extOk || mimeOk) {
      cb(null, true);
    } else {
      cb(AppError.badRequest('Only .csv files are allowed'));
    }
  },
});

const single = uploader.single('file');

export const uploadCsv: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  single(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        next(AppError.payloadTooLarge(`CSV exceeds the ${env.maxCsvSizeMb}MB limit`));
        return;
      }
      next(AppError.badRequest(err.message));
      return;
    }
    if (err) {
      next(err);
      return;
    }
    next();
  });
};
