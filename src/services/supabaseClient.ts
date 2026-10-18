import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzsfbxvygvxcbyipjzjo.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6c2ZieHZ5Z3Z4Y2J5aXBqempvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2MjQ2NzQsImV4cCI6MjEwMDIwMDY3NH0.v7Dyoc4fTARnnQDeh2Db1Z_2LHzLfT5AsnF3agNp3m8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface SupabaseResponse<T> {
  data: T | null;
  error: Error | null;
  count?: number;
}

// In-memory persistent database simulator for seamless local CMS editing & Supabase fallback
class MockSupabaseDB {
  private storage: Record<string, any[]> = {};

  initTable<T>(tableName: string, initialData: T[]) {
    if (!this.storage[tableName]) {
      this.storage[tableName] = [...initialData];
    }
  }

  getAll<T>(tableName: string): T[] {
    return (this.storage[tableName] as T[]) || [];
  }

  getById<T extends { id: string }>(tableName: string, id: string): T | undefined {
    return this.getAll<T>(tableName).find((item) => item.id === id);
  }

  insert<T extends { id?: string }>(tableName: string, newItem: T): T {
    const list = this.getAll<T>(tableName);
    const itemWithId = {
      ...newItem,
      id: newItem.id || `${tableName.slice(0, 3)}-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    this.storage[tableName] = [itemWithId, ...list];
    return itemWithId as T;
  }

  update<T extends { id: string }>(tableName: string, id: string, updates: Partial<T>): T | null {
    const list = this.getAll<T>(tableName);
    const index = list.findIndex((item) => item.id === id);
    if (index === -1) return null;

    const updatedItem = {
      ...list[index],
      ...updates,
      updatedAt: new Date().toISOString().split('T')[0],
    };
    list[index] = updatedItem;
    this.storage[tableName] = [...list];
    return updatedItem;
  }

  delete<T extends { id: string }>(tableName: string, id: string): boolean {
    const list = this.getAll<T>(tableName);
    const initialLen = list.length;
    const filtered = list.filter((item) => item.id !== id);
    this.storage[tableName] = filtered;
    return filtered.length < initialLen;
  }

  deleteMany<T extends { id: string }>(tableName: string, ids: string[]): number {
    const list = this.getAll<T>(tableName);
    const filtered = list.filter((item) => !ids.includes(item.id));
    const deletedCount = list.length - filtered.length;
    this.storage[tableName] = filtered;
    return deletedCount;
  }
}

export const mockDB = new MockSupabaseDB();
