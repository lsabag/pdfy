export type CommentType = 'TEXT' | 'HIGHLIGHT' | 'STICKY_NOTE' | 'STAMP';

export interface Comment {
  id: string;
  content: string;
  type: CommentType;
  pageNumber: number;
  position: { x: number; y: number; width: number; height: number };
  highlightColor?: string;
  documentId: string;
  authorId: string;
  parentId?: string;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
}
