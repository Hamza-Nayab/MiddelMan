declare module "compression";
declare module "multer";

declare namespace Express {
  interface Request {
    file?: {
      mimetype: string;
      size: number;
      buffer: Buffer;
      [key: string]: unknown;
    };
  }
}
