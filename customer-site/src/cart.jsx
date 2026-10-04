import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api.js';
import { useAuth } from './auth.jsx';

/**
 * One cart, two homes. Signed-in shoppers get the database cart (prices always
 * recomputed on the server); guests keep theirs in the browser until they sign
 * in, at which point it is merged across.
 */
const GUEST_KEY = 'aarambh_guest_cart';

const EMPTY = {
  items: [],
  itemCount: 0,
  totals: {
    subtotalPaise: 0,
    discountPaise: 0,
    taxPaise: 0,
    netPaise: 0,
    deliveryChargePaise: 0,
    grandTotalPaise: 0,
  },
  memberDiscountPct: 0,
  tierKey: 'none',
  issues: [],
};

const CartContext = createContext({
  cart: EMPTY,
  loading: false,
  addItem: async () => {},
  updateItem: async () => {},
  removeItem: async () => {},
  refresh: async () => {},
  clearGuestCart: () => {},
});

function readGuestCart() {
  try {
    const raw = localStorage.getItem(GUEST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGuestCart(rows) {
  try {
    localStorage.setItem(GUEST_KEY, JSON.stringify(rows));
  } catch {
    /* storage can be full or blocked — the cart just will not survive a reload */
  }
}

/** Guests see list prices only; tax and member discounts are settled at checkout. */
function priceGuestCart(rows) {
  const items = rows.map((row) => {
    const lineSubtotalPaise = row.unitPricePaise * row.quantity;
    const taxPaise = Math.round((lineSubtotalPaise * (row.taxRatePct || 0)) / 100);
    return {
      ...row,
      memberDiscountPct: 0,
      memberUnitPricePaise: row.unitPricePaise,
      discountPaise: 0,
      lineSubtotalPaise,
      taxPaise,
      lineTotalPaise: lineSubtotalPaise + taxPaise,
      issue: null,
    };
  });

  const subtotalPaise = items.reduce((n, i) => n + i.lineSubtotalPaise, 0);
  const taxPaise = items.reduce((n, i) => n + i.taxPaise, 0);

  return {
    ...EMPTY,
    items,
    itemCount: items.reduce((n, i) => n + i.quantity, 0),
    totals: {
      subtotalPaise,
      discountPaise: 0,
      taxPaise,
      netPaise: subtotalPaise,
      deliveryChargePaise: 0,
      grandTotalPaise: subtotalPaise + taxPaise,
    },
  };
}

export function CartProvider({ children }) {
  const { user, ready } = useAuth();
  const [cart, setCart] = useState(EMPTY);
  const [loading, setLoading] = useState(false);
  const mergedFor = useRef(null);

  const refresh = useCallback(async () => {
    if (!ready) return;
    if (!user) {
      setCart(priceGuestCart(readGuestCart()));
      return;
    }
    setLoading(true);
    try {
      const data = await api.cart();
      setCart({ ...EMPTY, ...data });
    } catch {
      setCart(EMPTY);
    } finally {
      setLoading(false);
    }
  }, [ready, user]);

  // Sign-in: fold the browser cart into the account cart exactly once.
  useEffect(() => {
    if (!ready) return;

    if (!user) {
      mergedFor.current = null;
      setCart(priceGuestCart(readGuestCart()));
      return;
    }

    const accountId = user.id || user.email || 'account';
    if (mergedFor.current === accountId) return;
    mergedFor.current = accountId;

    const guestRows = readGuestCart();
    const run = async () => {
      setLoading(true);
      try {
        const data = guestRows.length
          ? await api.cartMerge(
              guestRows.map((r) => ({
                productId: r.productId,
                variantId: r.variantId || undefined,
                quantity: r.quantity,
              })),
            )
          : await api.cart();
        if (guestRows.length) writeGuestCart([]);
        setCart({ ...EMPTY, ...data });
      } catch {
        setCart(EMPTY);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [ready, user]);

  const addItem = useCallback(
    async ({ product, variant = null, quantity = 1 }) => {
      if (user) {
        const data = await api.cartAdd({
          productId: product.id,
          variantId: variant?.id || undefined,
          quantity,
        });
        setCart({ ...EMPTY, ...data });
        return data;
      }

      const rows = readGuestCart();
      const key = `${product.id}:${variant?.id || ''}`;
      const existing = rows.find((r) => `${r.productId}:${r.variantId || ''}` === key);
      const tracked = (variant?.stockStatus || product.stockStatus) !== 'not_tracked';
      const available = variant
        ? (variant.stockQuantity ?? (tracked ? 0 : 20))
        : (product.stockQuantity ?? (tracked ? 0 : 20));
      const max = Math.max(0, Math.min(Number(available) || 0, 20));
      const wanted = (existing?.quantity || 0) + quantity;
      if (tracked && wanted > max) {
        const err = new Error(
          max <= 0
            ? `${product.name} is out of stock`
            : `Only ${max} left of ${product.name}`,
        );
        err.status = 409;
        throw err;
      }
      const nextQty = wanted;

      if (existing) {
        existing.quantity = nextQty;
      } else {
        rows.push({
          id: key,
          productId: product.id,
          variantId: variant?.id || null,
          slug: product.slug,
          name: product.name,
          variantName: variant?.name || '',
          brand: product.brand || '',
          image: product.image || product.images?.[0]?.url || '',
          sku: variant?.sku || product.sku,
          quantity: nextQty,
          unitPricePaise: variant ? variant.pricePaise : product.pricePaise,
          taxRatePct: product.taxRatePct || 0,
          stockStatus: variant ? variant.stockStatus : product.stockStatus,
          availableQuantity: max,
          maxQuantity: Math.max(1, Math.min(max, 20)),
        });
      }

      writeGuestCart(rows);
      const next = priceGuestCart(rows);
      setCart(next);
      return next;
    },
    [user],
  );

  const updateItem = useCallback(
    async (itemId, quantity) => {
      if (user) {
        const data = await api.cartUpdate(itemId, quantity);
        setCart({ ...EMPTY, ...data });
        return data;
      }
      const rows = readGuestCart();
      const current = rows.find((r) => r.id === itemId);
      if (current && quantity > 0) {
        const max = current.maxQuantity ?? 20;
        if (quantity > max) {
          const err = new Error(`Only ${max} left of ${current.name}`);
          err.status = 409;
          throw err;
        }
      }
      const nextRows = rows
        .map((r) => (r.id === itemId ? { ...r, quantity } : r))
        .filter((r) => r.quantity > 0);
      writeGuestCart(nextRows);
      const next = priceGuestCart(nextRows);
      setCart(next);
      return next;
    },
    [user],
  );

  const removeItem = useCallback(
    async (itemId) => {
      if (user) {
        const data = await api.cartRemove(itemId);
        setCart({ ...EMPTY, ...data });
        return data;
      }
      const rows = readGuestCart().filter((r) => r.id !== itemId);
      writeGuestCart(rows);
      const next = priceGuestCart(rows);
      setCart(next);
      return next;
    },
    [user],
  );

  const clearGuestCart = useCallback(() => {
    writeGuestCart([]);
    if (!user) setCart(EMPTY);
  }, [user]);

  const value = useMemo(
    () => ({ cart, loading, addItem, updateItem, removeItem, refresh, clearGuestCart }),
    [cart, loading, addItem, updateItem, removeItem, refresh, clearGuestCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  return useContext(CartContext);
}

export default CartContext;
