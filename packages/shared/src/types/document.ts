export type DocumentStatus = 'PROCESSING' | 'READY' | 'ERROR' | 'DELETED';

export interface Document {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number;
  status: DocumentStatus;
  storageKey: string;
  thumbnailKey?: string;
  metadata?: DocumentMetadata;
  isPasswordProtected: boolean;
  folderId?: string;
  ownerId: string;
  tags: string[];
  isFavorite: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface DocumentMetadata {
  author?: string;
  title?: string;
  subject?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
}

export interface Folder {
  id: string;
  name: string;
  parentId?: string;
  ownerId: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
}

export type ConversionFormat =
  | 'PDF_TO_DOCX'
  | 'PDF_TO_XLSX'
  | 'PDF_TO_PPTX'
  | 'PDF_TO_JPG'
  | 'PDF_TO_PNG'
  | 'PDF_TO_TIFF'
  | 'DOCX_TO_PDF'
  | 'XLSX_TO_PDF'
  | 'PPTX_TO_PDF'
  | 'JPG_TO_PDF'
  | 'PNG_TO_PDF';

export type ConversionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type ActivityAction =
  | 'UPLOAD'
  | 'VIEW'
  | 'DOWNLOAD'
  | 'EDIT'
  | 'DELETE'
  | 'RESTORE'
  | 'SHARE'
  | 'UNSHARE'
  | 'COMMENT'
  | 'CONVERT'
  | 'MERGE'
  | 'SPLIT'
  | 'SIGN'
  | 'ENCRYPT'
  | 'MOVE'
  | 'RENAME';
