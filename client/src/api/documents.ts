import { apiClient } from './client';

interface Document {
  id: string;
  title: string;
  content: unknown;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export async function listDocuments(): Promise<Document[]> {
  const response = await apiClient.get('/api/documents');
  if (!response.ok) {
    throw new Error('Failed to fetch documents');
  }
  return response.json();
}

export async function createDocument(title: string): Promise<Document> {
  const response = await apiClient.post('/api/documents', { title });
  if (!response.ok) {
    throw new Error('Failed to create document');
  }
  return response.json();
}

export async function getDocument(id: string): Promise<Document> {
  const response = await apiClient.get(`/api/documents/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch document');
  }
  return response.json();
}

export async function updateDocument(
  id: string,
  data: { title?: string; content?: unknown },
): Promise<Document> {
  const response = await apiClient.patch(`/api/documents/${id}`, { data });
  if (!response.ok) {
    throw new Error('Failed to update document');
  }
  return response.json();
}

export async function deleteDocument(id: string): Promise<void> {
  const response = await apiClient.delete(`/api/documents/${id}`);
  if (!response.ok) {
    throw new Error('Failed to delete document');
  }
}
