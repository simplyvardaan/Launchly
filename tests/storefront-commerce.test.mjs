import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addCartItem,
  addRecentlyViewed,
  formatStoreCurrency,
  getCartTotals,
  getCoupon,
  toggleStoreItem,
  updateCartItemQuantity,
} from '../src/lib/storefrontCommerce.ts';

const product = { id: 'fresh-crate:spinach', name: 'Baby Spinach', price: 129, category: 'Greens', detail: 'Freshly picked.' };

test('cart additions combine matching products and quantity updates remove zero counts', () => {
  const one = addCartItem([], product);
  const two = addCartItem(one, product, 2);
  assert.equal(two.length, 1);
  assert.equal(two[0].quantity, 3);
  assert.deepEqual(updateCartItemQuantity(two, product.id, -3), []);
  assert.throws(() => addCartItem([], { ...product, price: -1 }), /non-negative price/);
});

test('store coupons are scoped to their matching ecommerce store', () => {
  assert.deepEqual(getCoupon('fresh-crate', ' fresh10 '), { code: 'FRESH10', percent: 10 });
  assert.equal(getCoupon('volt-gear', 'FRESH10'), undefined);
  assert.deepEqual(getCoupon('volt-gear', 'VOLT15'), { code: 'VOLT15', percent: 15 });
});

test('cart totals calculate discounts, delivery, tax estimates, and free-shipping progress', () => {
  const items = addCartItem([], product, 4);
  const totals = getCartTotals(items, 'fresh-crate', 'FRESH10', 0.05);
  assert.equal(totals.subtotal, 516);
  assert.equal(totals.discount, 52);
  assert.equal(totals.shipping, 499);
  assert.equal(totals.tax, 23);
  assert.equal(totals.total, 986);
  assert.equal(totals.amountToFreeShipping, 1036);
  assert.throws(() => getCartTotals(items, 'fresh-crate', undefined, 1.2), /between 0 and 1/);
});

test('wishlist, comparison, recent items, and currency formatting work deterministically', () => {
  assert.deepEqual(toggleStoreItem(['a'], 'b'), ['a', 'b']);
  assert.deepEqual(toggleStoreItem(['a', 'b'], 'a'), ['b']);
  assert.deepEqual(addRecentlyViewed(['a', 'b'], 'a'), ['a', 'b']);
  assert.deepEqual(addRecentlyViewed(['a', 'b'], 'c', 2), ['c', 'a']);
  assert.equal(formatStoreCurrency(100, 'INR'), '₹100');
  assert.match(formatStoreCurrency(8400, 'USD'), /^\$100\.00$/);
  assert.equal(formatStoreCurrency(NaN, 'INR'), '₹0');
  assert.equal(formatStoreCurrency(-100, 'INR'), '₹0');
});
