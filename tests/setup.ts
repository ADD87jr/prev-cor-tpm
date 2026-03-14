/// <reference types="vitest" />
import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect method with methods from react-testing-library
expect.extend(matchers);

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.DATABASE_URL = 'file:./prisma/test.db';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing';
process.env.ADMIN_PASSWORD = 'test-password';

// Mock fetch globally
global.fetch = vi.fn();

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    order: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    siteSettings: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    $disconnect: vi.fn(),
  },
}));
