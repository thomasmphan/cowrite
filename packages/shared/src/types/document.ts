import type { JsonValue } from './json.js';

export interface Document {
  id: string;
  title: string;
  content: JsonValue;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}
