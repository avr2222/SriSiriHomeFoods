/* ============================================================
   Sri Siri Home Foods — DB row <-> UI shape mappers
   DB is snake_case; the existing components expect the shape
   defined in data/seed.js. Keep all translation here.
   ============================================================ */

export function relativeTime(iso) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const min = Math.round(diff / 60000);
  if (min < 1) return 'Just now';
  if (min < 60) return min + ' min ago';
  const hr = Math.round(min / 60);
  if (hr < 24) return hr + ' hr ago';
  const day = Math.round(hr / 24);
  if (day === 1) return 'Yesterday';
  return day + 'd ago';
}

export function productFromDb(p) {
  return {
    id: p.id,
    name: p.name,
    cat: p.cat,
    desc: p.description,
    rating: p.rating ?? 5.0,
    reviews: p.reviews ?? 0,
    badge: p.badge || undefined,
    tint: p.tint || '#c2611f',
    stockState: p.stock_state,
    season: p.season || undefined,
    image_url: p.image_url || null,
    variants: (p.product_variants || [])
      .slice()
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
      .map(v => ({ size: v.size, price: v.price, cost: v.cost, stock: v.stock ?? 0, mto: !!v.mto, id: v.id })),
  };
}

export function orderFromDb(o, currentUserId) {
  return {
    _uuid: o.id,
    created_at: o.created_at,
    id: '#' + o.order_no,
    customer: o.customer_name,
    phone: o.phone || '',
    addr: o.addr || '',
    items: (o.order_items || []).map(i => ({ name: i.product_name, size: i.size, qty: i.qty, price: i.price, cost: i.cost })),
    subtotal: o.subtotal,
    discount: o.discount,
    delivery: o.delivery_fee,
    total: o.total,
    status: o.status,
    pay: o.pay,
    channel: o.channel || undefined,
    worker: o.worker || null,
    time: relativeTime(o.created_at),
    mine: !!currentUserId && o.customer_id === currentUserId,
  };
}

export function expenseFromDb(e) {
  const d = e.spent_on ? new Date(e.spent_on) : null;
  const date = d ? d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '';
  return { id: e.id, cat: e.cat, amount: e.amount, payee: e.payee, note: e.note, date, spent_on: e.spent_on, recurring: !!e.recurring };
}

export function workerFromDb(w) {
  return { id: w.id, name: w.name, role: w.role, salary: w.salary, advance: w.advance, join: w.join_date, status: w.status, attendance: w.attendance };
}

export function couponFromDb(c) {
  return { code: c.code, type: c.type, value: c.value, min: c.min, desc: c.description, freeShip: !!c.free_ship };
}

export function deliveryFromDb(d) {
  return { freeThreshold: d.free_threshold, flatCharge: d.flat_charge };
}

export function customerFromDb(c) {
  return { id: c.id, name: c.name, phone: c.phone, orders: c.orders, spent: c.spent, last: c.last, seg: c.seg };
}
