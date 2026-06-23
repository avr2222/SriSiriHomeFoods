/* ============================================================
   Sri Siri Home Foods — assembles the `store` object that the
   existing CustomerApp / OwnerApp / POSView components expect,
   backed by Supabase + React Query instead of in-memory state.
   ============================================================ */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../supabase/client.js';
import { useAuth } from './useAuth.jsx';
import { useCart } from '../lib/cart.js';
import {
  productFromDb, orderFromDb, expenseFromDb, workerFromDb,
  couponFromDb, deliveryFromDb, customerFromDb,
} from './mappers.js';

const EXPENSE_CATS = ['Worker Salary', 'Power Bill', 'Raw Groceries', 'Packaging', 'Gas / Fuel', 'Rent', 'Transport', 'Miscellaneous'];

export function useStore({ owner = false } = {}) {
  const qc = useQueryClient();
  const { user, profile } = useAuth();
  const uid = user?.id || null;

  // ---- toast ----
  const [toastMsg, setToastMsg] = useState(null);
  const toastTimer = useRef(null);
  const toast = useCallback((msg) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2400);
  }, []);

  // ---- queries ----
  const categoriesQ = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('sort');
      if (error) throw error;
      return data.map(c => ({ id: c.id, name: c.name, tint: c.tint, icon: c.icon }));
    },
  });

  const productsQ = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products').select('*, product_variants(*)').order('sort');
      if (error) throw error;
      return data.map(productFromDb);
    },
  });

  const couponsQ = useQuery({
    queryKey: ['coupons', owner ? 'all' : 'active'],
    queryFn: async () => {
      // Owner manages every coupon; the storefront only sees active ones
      // (so an inactive coupon can't be applied in the cart).
      let q = supabase.from('coupons').select('*');
      if (!owner) q = q.eq('active', true);
      const { data, error } = await q.order('code');
      if (error) throw error;
      return data.map(couponFromDb);
    },
  });

  const deliveryQ = useQuery({
    queryKey: ['delivery'],
    queryFn: async () => {
      const { data, error } = await supabase.from('delivery_settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return data ? deliveryFromDb(data) : { freeThreshold: 500, flatCharge: 40 };
    },
  });

  const ordersQ = useQuery({
    queryKey: ['orders', owner ? 'all' : uid],
    enabled: owner || !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders').select('*, order_items(*)').order('created_at', { ascending: false });
      if (error) throw error;
      return data.map(o => orderFromDb(o, uid));
    },
  });

  const expensesQ = useQuery({
    queryKey: ['expenses'], enabled: owner,
    queryFn: async () => {
      const { data, error } = await supabase.from('expenses').select('*').order('spent_on', { ascending: false });
      if (error) throw error;
      return data.map(expenseFromDb);
    },
  });

  const workersQ = useQuery({
    queryKey: ['workers'], enabled: owner,
    queryFn: async () => {
      const { data, error } = await supabase.from('workers').select('*').order('name');
      if (error) throw error;
      return data.map(workerFromDb);
    },
  });

  const customersQ = useQuery({
    queryKey: ['customers'], enabled: owner,
    queryFn: async () => {
      const { data, error } = await supabase.from('customers_summary').select('*').order('spent', { ascending: false });
      if (error) throw error;
      return data.map(customerFromDb);
    },
  });

  // ---- realtime: owner order inbox ----
  useEffect(() => {
    if (!owner) return;
    const ch = supabase
      .channel('orders-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' },
        () => qc.invalidateQueries({ queryKey: ['orders'] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [owner, qc]);

  // ---- cart (client-side) ----
  const products = productsQ.data || [];
  const coupons = couponsQ.data || [];
  const delivery = deliveryQ.data || { freeThreshold: 500, flatCharge: 40 };
  const { cart, cartLines, cartCount, cartTotals, cartActions } = useCart({ products, coupons, delivery });

  // ---- mutations ----
  async function placeOrder(addr, pay /*, slot */) {
    const lines = cartLines();
    // Totals are recomputed server-side from product_variants/coupons —
    // we only send variant ids + quantities (+ coupon code).
    const payload = {
      addr, pay,
      coupon_code: cart.coupon?.code || null,
      items: lines.map(l => ({ variant_id: l.v.id, qty: l.qty })),
    };
    const { data, error } = await supabase.rpc('place_order', { p: payload });
    if (error) { toast('Could not place order'); throw error; }
    cartActions.clear();
    qc.invalidateQueries({ queryKey: ['orders'] });
    return '#' + data.order_no;
  }

  async function updateOrder(id, status, worker) {
    const current = (ordersQ.data || []).find(o => o.id === id);
    if (!current) return;
    const patch = { status };
    if (worker !== undefined) patch.worker = worker;
    const { error } = await supabase.from('orders').update(patch).eq('id', current._uuid);
    if (error) { toast('Update failed'); throw error; }
    qc.invalidateQueries({ queryKey: ['orders'] });
    toast('Order ' + id + ' → ' + status);
  }

  async function counterSale({ items, customer, phone, pay, discount }) {
    const payload = {
      customer: customer || 'Walk-in customer', phone: phone || '', pay, discount: +discount || 0,
      items: items.map(i => ({ name: i.name, size: i.size, qty: i.qty, price: i.price, cost: i.cost })),
    };
    const { data, error } = await supabase.rpc('counter_sale', { p: payload });
    if (error) { toast('Could not record sale'); throw error; }
    qc.invalidateQueries({ queryKey: ['orders'] });
    return orderFromDb({ ...data, order_items: payload.items.map(i => ({ product_name: i.name, ...i })) }, uid);
  }

  async function addExpense({ cat, amount, payee, note }) {
    const { error } = await supabase.from('expenses').insert({ cat, amount, payee, note, spent_on: new Date().toISOString().slice(0, 10), recurring: false });
    if (error) { toast('Could not log expense'); throw error; }
    qc.invalidateQueries({ queryKey: ['expenses'] });
  }

  async function payWorker(w) {
    await addExpense({ cat: 'Worker Salary', amount: w.salary - w.advance, payee: w.name, note: 'Salary paid' });
    const { error } = await supabase.from('workers').update({ advance: 0 }).eq('id', w.id);
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ['workers'] });
    toast('Paid ' + w.name + ' · ₹' + Math.round(w.salary - w.advance).toLocaleString('en-IN'));
  }

  async function setDelivery(thr, chg) {
    const { error } = await supabase.from('delivery_settings').update({ free_threshold: thr, flat_charge: chg }).eq('id', 1);
    if (error) { toast('Could not save'); throw error; }
    qc.invalidateQueries({ queryKey: ['delivery'] });
  }

  function deriveStockState(variants) {
    const anyMto = variants.some(v => v.mto);
    const totalStock = variants.reduce((s, v) => s + (v.mto ? 0 : (+v.stock || 0)), 0);
    return anyMto && totalStock === 0 ? 'mto' : (totalStock === 0 ? 'out' : (totalStock <= 5 ? 'limited' : 'in'));
  }

  async function addProduct(p) {
    const variants = (p.variants && p.variants.length ? p.variants : [{ size: p.size || '250g', price: p.price, cost: p.cost, stock: p.stock, mto: p.mto }])
      .map(v => ({ size: (v.size || '1 unit').trim(), price: +v.price || 0, cost: +v.cost || 0, stock: +v.stock || 0, mto: !!v.mto }));
    const { data: prod, error } = await supabase.from('products').insert({
      name: p.name, cat: p.cat, description: p.desc || 'Freshly made to order.',
      rating: 5.0, reviews: 0, stock_state: deriveStockState(variants), badge: 'New', tint: p.tint || '#c2611f',
      image_url: p.image_url || null,
    }).select().single();
    if (error) { toast('Could not add product'); throw error; }
    const { error: vErr } = await supabase.from('product_variants').insert(variants.map((v, i) => ({ ...v, product_id: prod.id, sort: i })));
    if (vErr) throw vErr;
    qc.invalidateQueries({ queryKey: ['products'] });
  }

  async function updateProduct(id, data) {
    const existing = (products).find(p => p.id === id);
    const variants = (data.variants || existing?.variants || []).map(v => ({ size: (v.size || '1 unit').trim(), price: +v.price || 0, cost: +v.cost || 0, stock: +v.stock || 0, mto: !!v.mto }));
    const seasonal = existing?.stockState === 'seasonal';
    const stock_state = seasonal ? 'seasonal' : deriveStockState(variants);
    const patch = {};
    if (data.name != null) patch.name = data.name;
    if (data.cat != null) patch.cat = data.cat;
    if (data.desc != null) patch.description = data.desc;
    if (data.tint != null) patch.tint = data.tint;
    if (data.image_url !== undefined) patch.image_url = data.image_url;
    patch.stock_state = stock_state;
    const { error } = await supabase.from('products').update(patch).eq('id', id);
    if (error) { toast('Could not update'); throw error; }
    if (data.variants) {
      await supabase.from('product_variants').delete().eq('product_id', id);
      await supabase.from('product_variants').insert(variants.map((v, i) => ({ ...v, product_id: id, sort: i })));
    }
    qc.invalidateQueries({ queryKey: ['products'] });
  }

  async function deleteProduct(id) {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { toast('Could not delete'); throw error; }
    qc.invalidateQueries({ queryKey: ['products'] });
  }

  // ---- expenses (edit / delete) ----
  async function updateExpense(id, { cat, amount, payee, note }) {
    const { error } = await supabase.from('expenses').update({ cat, amount: +amount || 0, payee, note }).eq('id', id);
    if (error) { toast('Could not update expense'); throw error; }
    qc.invalidateQueries({ queryKey: ['expenses'] });
  }
  async function deleteExpense(id) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) { toast('Could not delete expense'); throw error; }
    qc.invalidateQueries({ queryKey: ['expenses'] });
  }

  // ---- workers (CRUD + advance) ----
  async function addWorker(w) {
    const { error } = await supabase.from('workers').insert({
      name: w.name, role: w.role, salary: +w.salary || 0, advance: +w.advance || 0,
      join_date: w.join || null, status: w.status || 'Active', attendance: +w.attendance || 100,
    });
    if (error) { toast('Could not add worker'); throw error; }
    qc.invalidateQueries({ queryKey: ['workers'] });
  }
  async function updateWorker(id, w) {
    const patch = {};
    if (w.name != null) patch.name = w.name;
    if (w.role != null) patch.role = w.role;
    if (w.salary != null) patch.salary = +w.salary || 0;
    if (w.advance != null) patch.advance = +w.advance || 0;
    if (w.join != null) patch.join_date = w.join;
    if (w.status != null) patch.status = w.status;
    if (w.attendance != null) patch.attendance = +w.attendance || 0;
    const { error } = await supabase.from('workers').update(patch).eq('id', id);
    if (error) { toast('Could not update worker'); throw error; }
    qc.invalidateQueries({ queryKey: ['workers'] });
  }
  async function deleteWorker(id) {
    const { error } = await supabase.from('workers').delete().eq('id', id);
    if (error) { toast('Could not delete worker'); throw error; }
    qc.invalidateQueries({ queryKey: ['workers'] });
  }
  async function recordAdvance(w, amount) {
    const amt = +amount || 0;
    if (amt <= 0) return;
    await addExpense({ cat: 'Worker Salary', amount: amt, payee: w.name, note: 'Advance' });
    const { error } = await supabase.from('workers').update({ advance: (w.advance || 0) + amt }).eq('id', w.id);
    if (error) { toast('Could not record advance'); throw error; }
    qc.invalidateQueries({ queryKey: ['workers'] });
    toast('Advance ₹' + Math.round(amt).toLocaleString('en-IN') + ' to ' + w.name);
  }

  // ---- coupons (CRUD) ----
  async function addCoupon(c) {
    const { error } = await supabase.from('coupons').insert({
      code: (c.code || '').trim().toUpperCase(), type: c.type, value: +c.value || 0,
      min: +c.min || 0, description: c.desc, free_ship: !!c.freeShip, active: c.active !== false,
    });
    if (error) { toast('Could not create coupon'); throw error; }
    qc.invalidateQueries({ queryKey: ['coupons'] });
  }
  async function updateCoupon(code, c) {
    const patch = {};
    if (c.type != null) patch.type = c.type;
    if (c.value != null) patch.value = +c.value || 0;
    if (c.min != null) patch.min = +c.min || 0;
    if (c.desc != null) patch.description = c.desc;
    if (c.freeShip != null) patch.free_ship = !!c.freeShip;
    if (c.active != null) patch.active = !!c.active;
    const { error } = await supabase.from('coupons').update(patch).eq('code', code);
    if (error) { toast('Could not update coupon'); throw error; }
    qc.invalidateQueries({ queryKey: ['coupons'] });
  }
  async function deleteCoupon(code) {
    const { error } = await supabase.from('coupons').delete().eq('code', code);
    if (error) { toast('Could not delete coupon'); throw error; }
    qc.invalidateQueries({ queryKey: ['coupons'] });
  }

  // ---- categories (CRUD) ----
  const slugify = (s) => (s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || ('cat' + Date.now());
  async function addCategory(c) {
    const id = (c.id || slugify(c.name));
    const sort = (categoriesQ.data || []).length + 1;
    const { error } = await supabase.from('categories').insert({ id, name: c.name, tint: c.tint || '#c2611f', icon: c.icon || 'tag', sort });
    if (error) { toast('Could not add category'); throw error; }
    qc.invalidateQueries({ queryKey: ['categories'] });
  }
  async function updateCategory(id, c) {
    const patch = {};
    if (c.name != null) patch.name = c.name;
    if (c.tint != null) patch.tint = c.tint;
    if (c.icon != null) patch.icon = c.icon;
    const { error } = await supabase.from('categories').update(patch).eq('id', id);
    if (error) { toast('Could not update category'); throw error; }
    qc.invalidateQueries({ queryKey: ['categories'] });
  }
  async function deleteCategory(id) {
    const { error } = await supabase.from('categories').delete().eq('id', id);
    if (error) { toast(error.message?.includes('foreign key') ? 'In use by products — reassign first' : 'Could not delete category'); throw error; }
    qc.invalidateQueries({ queryKey: ['categories'] });
  }

  return {
    // data
    products,
    categories: categoriesQ.data || [],
    coupons,
    orders: ordersQ.data || [],
    expenses: expensesQ.data || [],
    workers: workersQ.data || [],
    customers: customersQ.data || [],
    delivery,
    expenseCats: EXPENSE_CATS,
    // cart
    cart, cartLines, cartCount, cartTotals, cartActions,
    // mutations
    placeOrder, updateOrder, counterSale, addExpense, payWorker, setDelivery, addProduct, updateProduct, deleteProduct,
    updateExpense, deleteExpense,
    addWorker, updateWorker, deleteWorker, recordAdvance,
    addCoupon, updateCoupon, deleteCoupon,
    addCategory, updateCategory, deleteCategory,
    // misc
    toast, toastMsg,
    user: profile ? { id: uid, name: profile.name, phone: profile.phone } : null,
    loading: productsQ.isLoading,
  };
}
