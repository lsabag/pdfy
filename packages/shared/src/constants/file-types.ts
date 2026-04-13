export const ACCEPTED_PDF_TYPES = ['application/pdf'] as const;

export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/webp',
] as const;

export const ACCEPTED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/tiff',
] as const;

export const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100MB

export const PDF_MAGIC_BYTES = Buffer.from('%PDF');

export const FILE_EXTENSIONS: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/tiff': '.tiff',
};
