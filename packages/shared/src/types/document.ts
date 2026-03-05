export interface Document {
  id: string;
  title: string;
  content: unknown;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}
