import { create } from 'zustand';
import { api } from '@/lib/api-client';

interface DocumentItem {
  id: string;
  name: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number;
  status: string;
  thumbnailKey: string | null;
  tags: string[];
  isFavorite: boolean;
  version: number;
  folderId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface DocumentState {
  documents: DocumentItem[];
  pagination: Pagination | null;
  isLoading: boolean;
  viewMode: 'grid' | 'list';
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  setViewMode: (mode: 'grid' | 'list') => void;
  fetchDocuments: (params?: Record<string, string>) => Promise<void>;
  uploadDocument: (file: File, folderId?: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  pagination: null,
  isLoading: false,
  viewMode: 'grid',
  sortBy: 'updatedAt',
  sortOrder: 'desc',

  setViewMode: (mode) => set({ viewMode: mode }),

  fetchDocuments: async (params = {}) => {
    set({ isLoading: true });
    try {
      const { sortBy, sortOrder } = get();
      const { data } = await api.get('/documents', {
        params: { sortBy, sortOrder, ...params },
      });
      set({ documents: data.documents, pagination: data.pagination });
    } finally {
      set({ isLoading: false });
    }
  },

  uploadDocument: async (file, folderId) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) formData.append('folderId', folderId);

    await api.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    await get().fetchDocuments();
  },

  deleteDocument: async (id) => {
    await api.delete(`/documents/${id}`);
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
    }));
  },

  toggleFavorite: async (id) => {
    const doc = get().documents.find((d) => d.id === id);
    if (!doc) return;
    await api.patch(`/documents/${id}`, { isFavorite: !doc.isFavorite });
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, isFavorite: !d.isFavorite } : d,
      ),
    }));
  },
}));
