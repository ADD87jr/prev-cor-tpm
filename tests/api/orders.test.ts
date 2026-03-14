/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Test pentru validarea datelor comenzii
describe('Order Validation', () => {
  
  it('should validate required fields', () => {
    const validateOrder = (order: Record<string, unknown>) => {
      const errors: string[] = [];
      
      if (!order.customerName) errors.push('customerName required');
      if (!order.customerEmail) errors.push('customerEmail required');
      if (!order.items || !Array.isArray(order.items) || order.items.length === 0) {
        errors.push('items required');
      }
      
      return { valid: errors.length === 0, errors };
    };

    // Test valid order
    const validOrder = {
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      items: [{ productId: 1, quantity: 1, price: 100 }]
    };
    expect(validateOrder(validOrder).valid).toBe(true);

    // Test invalid order - missing name
    const invalidOrder1 = {
      customerEmail: 'john@example.com',
      items: [{ productId: 1, quantity: 1, price: 100 }]
    };
    expect(validateOrder(invalidOrder1).valid).toBe(false);
    expect(validateOrder(invalidOrder1).errors).toContain('customerName required');

    // Test invalid order - no items
    const invalidOrder2 = {
      customerName: 'John Doe',
      customerEmail: 'john@example.com',
      items: []
    };
    expect(validateOrder(invalidOrder2).valid).toBe(false);
  });

  it('should validate email format', () => {
    const isValidEmail = (email: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.ro')).toBe(true);
    expect(isValidEmail('invalid-email')).toBe(false);
    expect(isValidEmail('missing@domain')).toBe(false);
    expect(isValidEmail('@nodomain.com')).toBe(false);
  });

  it('should calculate order total correctly', () => {
    const calculateTotal = (items: { price: number; quantity: number }[], shipping = 0, discount = 0) => {
      const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const tva = subtotal * 0.19;
      const total = subtotal + tva + shipping - discount;
      return { subtotal, tva, total: Math.max(0, total) };
    };

    const items = [
      { price: 100, quantity: 2 },
      { price: 50, quantity: 1 }
    ];

    const result = calculateTotal(items, 20, 10);
    expect(result.subtotal).toBe(250);
    expect(result.tva).toBeCloseTo(47.5);
    expect(result.total).toBeCloseTo(307.5);
  });

  it('should validate phone number format', () => {
    const isValidPhone = (phone: string) => {
      // Romanian phone format: 07xx xxx xxx or +40 7xx xxx xxx
      const cleaned = phone.replace(/\s|-/g, '');
      return /^(07[0-9]{8}|\+407[0-9]{8}|00407[0-9]{8})$/.test(cleaned);
    };

    expect(isValidPhone('0753055555')).toBe(true);
    expect(isValidPhone('07 53 055 555')).toBe(true);
    expect(isValidPhone('+40753055555')).toBe(true);
    expect(isValidPhone('123456')).toBe(false);
    expect(isValidPhone('0653055555')).toBe(false); // Invalid prefix
  });
});

describe('Product Pricing', () => {
  
  it('should calculate discount percentage correctly', () => {
    const calculateDiscount = (listPrice: number, salePrice: number) => {
      if (!listPrice || listPrice <= salePrice) return 0;
      return Math.round(((listPrice - salePrice) / listPrice) * 100);
    };

    expect(calculateDiscount(100, 80)).toBe(20);
    expect(calculateDiscount(200, 150)).toBe(25);
    expect(calculateDiscount(100, 100)).toBe(0);
    expect(calculateDiscount(0, 50)).toBe(0);
  });

  it('should format price correctly for display', () => {
    const formatPrice = (price: number) => {
      return new Intl.NumberFormat('ro-RO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(price);
    };

    expect(formatPrice(1234.5)).toBe('1.234,50');
    expect(formatPrice(100)).toBe('100,00');
    expect(formatPrice(99.99)).toBe('99,99');
  });

  it('should validate stock levels', () => {
    const checkStockLevel = (stock: number) => {
      if (stock <= 0) return 'out_of_stock';
      if (stock <= 3) return 'critical';
      if (stock <= 10) return 'low';
      return 'normal';
    };

    expect(checkStockLevel(0)).toBe('out_of_stock');
    expect(checkStockLevel(-1)).toBe('out_of_stock');
    expect(checkStockLevel(2)).toBe('critical');
    expect(checkStockLevel(5)).toBe('low');
    expect(checkStockLevel(50)).toBe('normal');
  });
});

describe('Authentication', () => {
  
  it('should validate password strength', () => {
    const validatePassword = (password: string) => {
      const checks = {
        length: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasLowercase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password)
      };
      
      const score = Object.values(checks).filter(Boolean).length;
      return {
        valid: checks.length && score >= 3,
        score,
        checks
      };
    };

    expect(validatePassword('Password123').valid).toBe(true);
    expect(validatePassword('weak').valid).toBe(false);
    expect(validatePassword('StrongP@ss1').score).toBe(5);
  });

  it('should sanitize input to prevent XSS', () => {
    const sanitizeInput = (input: string) => {
      return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    };

    expect(sanitizeInput('<script>alert("xss")</script>')).not.toContain('<script>');
    expect(sanitizeInput('Normal text')).toBe('Normal text');
    expect(sanitizeInput('Test "quotes"')).toBe('Test &quot;quotes&quot;');
  });
});

describe('Date Utilities', () => {
  
  it('should format date for display', () => {
    const formatDate = (date: Date | string) => {
      const d = new Date(date);
      return d.toLocaleDateString('ro-RO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    const testDate = new Date('2026-03-01');
    expect(formatDate(testDate)).toContain('2026');
    expect(formatDate(testDate)).toContain('martie');
  });

  it('should calculate days between dates', () => {
    const daysBetween = (date1: Date, date2: Date) => {
      const diff = Math.abs(date2.getTime() - date1.getTime());
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    const d1 = new Date('2026-03-01');
    const d2 = new Date('2026-03-08');
    expect(daysBetween(d1, d2)).toBe(7);
  });
});
