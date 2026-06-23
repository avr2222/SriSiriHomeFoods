/* ============================================================
   Sri Siri Home Foods — client-side cart (localStorage)
   Cart is pre-checkout state; it stays on the device until an
   order is placed. Ported from the in-memory store in App.jsx.
   ============================================================ */
import { useState, useEffect, useCallback } from 'react';

const KEY = 'sri.cart.v1';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { items: [], coupon: null };
}

export function useCart({ products, coupons, delivery }) {
  const [cart, setCart] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch { /* ignore */ }
  }, [cart]);

  const cartLines = useCallback(() => {
    return cart.items
      .map(it => {
        const p = (products || []).find(x => x.id === it.pid);
        if (!p) return null;
        return { p, v: p.variants[it.vi], qty: it.qty, pid: it.pid, vi: it.vi };
      })
      .filter(Boolean);
  }, [cart.items, products]);

  const cartCount = useCallback(() => cart.items.reduce((s, i) => s + i.qty, 0), [cart.items]);

  const cartTotals = useCallback(() => {
    const lines = cartLines();
    const subtotal = lines.reduce((s, l) => s + l.v.price * l.qty, 0);
    let discount = 0, freeShip = false;
    if (cart.coupon) {
      const c = cart.coupon;
      if (subtotal >= c.min) {
        if (c.freeShip) freeShip = true;
        else if (c.type === 'percent') discount = Math.round(subtotal * c.value / 100);
        else discount = c.value;
      }
    }
    const dlv = delivery || { freeThreshold: 500, flatCharge: 40 };
    const deliveryFee = subtotal >= dlv.freeThreshold || freeShip ? 0 : (subtotal > 0 ? dlv.flatCharge : 0);
    const total = Math.max(0, subtotal - discount) + deliveryFee;
    return { subtotal, discount, delivery: deliveryFee, total };
  }, [cartLines, cart.coupon, delivery]);

  const cartActions = {
    add(pid, vi, qty) {
      setCart(c => {
        const items = [...c.items];
        const i = items.findIndex(x => x.pid === pid && x.vi === vi);
        if (i >= 0) items[i] = { ...items[i], qty: items[i].qty + qty };
        else items.push({ pid, vi, qty });
        return { ...c, items };
      });
    },
    setQty(idx, qty) {
      setCart(c => {
        const items = [...c.items];
        if (qty <= 0) items.splice(idx, 1);
        else items[idx] = { ...items[idx], qty };
        return { ...c, items };
      });
    },
    clear() { setCart({ items: [], coupon: null }); },
    applyCoupon(code) {
      const c = (coupons || []).find(x => x.code === code.trim().toUpperCase());
      if (!c) return { ok: false, msg: 'Invalid coupon code' };
      const sub = cartTotals().subtotal;
      if (sub < c.min) return { ok: false, msg: 'Add ₹' + Math.round(c.min - sub).toLocaleString('en-IN') + ' to use ' + c.code };
      setCart(cc => ({ ...cc, coupon: c }));
      return { ok: true };
    },
    removeCoupon() { setCart(c => ({ ...c, coupon: null })); },
  };

  return { cart, cartLines, cartCount, cartTotals, cartActions };
}
