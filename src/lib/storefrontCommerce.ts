export type StoreProduct = {
  id: string;
  name: string;
  price: number;
  category: string;
  detail: string;
};

export type StoreCartItem = StoreProduct & { quantity: number };
export type StoreCurrency = 'INR' | 'USD' | 'EUR';

const couponRates: Record<string, { templateId: string; percent: number }> = {
  FRESH10: { templateId: 'fresh-crate', percent: 10 },
  VOLT15: { templateId: 'volt-gear', percent: 15 },
};

const currencyRates: Record<StoreCurrency, number> = {
  INR: 1,
  USD: 1 / 84,
  EUR: 1 / 92,
};

export function addCartItem(items: StoreCartItem[], product: StoreProduct, quantity = 1): StoreCartItem[] {
  if (!Number.isFinite(product.price) || product.price < 0 || !Number.isInteger(quantity) || quantity < 1) {
    throw new Error('Cart products require a non-negative price and a positive whole-number quantity.');
  }
  const existing = items.find((item) => item.id === product.id);
  return existing
    ? items.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item)
    : [...items, { ...product, quantity }];
}

export function updateCartItemQuantity(items: StoreCartItem[], productId: string, change: number): StoreCartItem[] {
  if (!Number.isInteger(change) || change === 0) return items;
  return items.flatMap((item) => {
    if (item.id !== productId) return [item];
    const quantity = item.quantity + change;
    return quantity > 0 ? [{ ...item, quantity }] : [];
  });
}

export function getCoupon(templateId: string, code: string) {
  const normalized = code.trim().toUpperCase();
  const coupon = couponRates[normalized];
  return coupon?.templateId === templateId ? { code: normalized, percent: coupon.percent } : undefined;
}

export function getCartTotals(items: StoreCartItem[], templateId: string, couponCode?: string, taxRate = 0) {
  if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 1) {
    throw new Error('Tax estimate rate must be between 0 and 1.');
  }
  const subtotal = items.reduce((total, item) => total + item.price * item.quantity, 0);
  const coupon = couponCode ? getCoupon(templateId, couponCode) : undefined;
  const discount = coupon ? Math.round(subtotal * coupon.percent / 100) : 0;
  const shippingThreshold = templateId === 'fresh-crate' ? 1500 : 20000;
  const shipping = subtotal === 0 || subtotal - discount >= shippingThreshold ? 0 : 499;
  const tax = Math.round((subtotal - discount) * taxRate);
  return {
    subtotal,
    discount,
    shipping,
    tax,
    total: Math.max(0, subtotal - discount + shipping + tax),
    amountToFreeShipping: Math.max(0, shippingThreshold - (subtotal - discount)),
    coupon,
  };
}

export function formatStoreCurrency(amountInRupees: number, currency: StoreCurrency = 'INR'): string {
  const safeAmount = Number.isFinite(amountInRupees) && amountInRupees >= 0 ? amountInRupees : 0;
  const rate = currencyRates[currency] ?? 1;
  const value = safeAmount * rate;
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyRates[currency] ? currency : 'INR',
    maximumFractionDigits: currency === 'INR' ? 0 : 2,
  }).format(value);
}

export function toggleStoreItem(items: string[], productId: string): string[] {
  return items.includes(productId) ? items.filter((id) => id !== productId) : [...items, productId];
}

export function addRecentlyViewed(items: string[], productId: string, limit = 12): string[] {
  if (!Number.isInteger(limit) || limit < 1) throw new Error('Recently viewed limit must be a positive integer.');
  return [productId, ...items.filter((id) => id !== productId)].slice(0, limit);
}
