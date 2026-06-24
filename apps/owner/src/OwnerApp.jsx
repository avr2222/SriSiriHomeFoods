/* ============================================================
   Sri Siri Home Foods — Owner cockpit (desktop)
   ============================================================ */
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Icon, fmt, uploadProductPhoto, toCSV, downloadCSV, useAuth } from '@sri/shared';
import POSView from './POSView.jsx';

/* Portal so modals escape any transformed (.fade-in) ancestor, but stay
   INSIDE #root so React's delegated events (onChange/onClick) still fire */
function Portal({ children }) {
  const [el] = useState(() => document.createElement('div'));
  useEffect(() => {
    const root = document.getElementById('root');
    root.appendChild(el);
    return () => { root.removeChild(el); };
  }, [el]);
  return createPortal(children, el);
}

/* multi-select helper for bulk delete */
function useBulk() {
  const [sel, setSel] = useState(() => new Set());
  return {
    sel,
    has: (id) => sel.has(id),
    toggle: (id) => setSel(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }),
    set: (ids) => setSel(new Set(ids)),
    clear: () => setSel(new Set()),
  };
}
function BulkBar({ n, noun, onDelete, onClear }) {
  if (!n) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '8px 12px', background: 'var(--maroon-soft)', border: '1px solid var(--rule-2)', borderRadius: 10 }}>
      <span style={{ fontSize: 13, fontWeight: 600 }}>{n} {noun}{n > 1 ? 's' : ''} selected</span>
      <div style={{ flex: 1 }} />
      <button className="btn ghost sm" onClick={onClear}>Clear</button>
      <button className="btn sm" style={{ background: 'var(--maroon)', boxShadow: 'none' }} onClick={onDelete}><Icon name="close" size={14} />Delete selected</button>
    </div>
  );
}
const cbStyle = { width: 16, height: 16, accentColor: 'var(--saffron)', cursor: 'pointer' };

/* derived numbers — period-aware, computed from real orders/expenses */
function rangeFor(period) {
  const now = new Date();
  let start, prevStart, prevEnd;
  if (period === 'Today') {
    start = new Date(now); start.setHours(0, 0, 0, 0);
    prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 1); prevEnd = start;
  } else if (period === 'Week') {
    start = new Date(now); const day = (start.getDay() + 6) % 7; // Monday = 0
    start.setDate(start.getDate() - day); start.setHours(0, 0, 0, 0);
    prevStart = new Date(start); prevStart.setDate(prevStart.getDate() - 7); prevEnd = start;
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1); prevEnd = start;
  }
  return { start, prevStart, prevEnd };
}
const orderTime = (o) => (o.created_at ? new Date(o.created_at).getTime() : 0);
const expenseTime = (e) => (e.spent_on ? new Date(e.spent_on + 'T00:00:00').getTime() : 0);
const pct = (cur, prev) => (prev > 0 ? Math.round((cur - prev) / prev * 100) : null);

function metrics(store, period = 'Month') {
  const { start, prevStart, prevEnd } = rangeFor(period);
  const s = start.getTime(), ps = prevStart.getTime(), pe = prevEnd.getTime();
  const ordersList = store.orders.filter(o => orderTime(o) >= s);
  const expensesList = store.expenses.filter(e => expenseTime(e) >= s);
  const revenue = ordersList.reduce((a, o) => a + o.subtotal - o.discount, 0);
  const cogs = ordersList.reduce((a, o) => a + o.items.reduce((x, i) => x + i.cost * i.qty, 0), 0);
  const exp = expensesList.reduce((a, e) => a + e.amount, 0);
  const net = revenue - cogs - exp;
  // previous period (for deltas)
  const prevOrders = store.orders.filter(o => orderTime(o) >= ps && orderTime(o) < pe);
  const prevRevenue = prevOrders.reduce((a, o) => a + o.subtotal - o.discount, 0);
  const prevExp = store.expenses.filter(e => expenseTime(e) >= ps && expenseTime(e) < pe).reduce((a, e) => a + e.amount, 0);
  return {
    revenue, cogs, exp, net, ordersList, expensesList,
    grossMargin: revenue ? Math.round((revenue - cogs) / revenue * 100) : 0,
    netMargin: revenue ? Math.round(net / revenue * 100) : 0,
    orders: ordersList.length,
    revDelta: pct(revenue, prevRevenue),
    expDelta: pct(exp, prevExp),
    newCount: store.orders.filter(o => o.status === 'new').length,
    active: store.orders.filter(o => ['new', 'preparing', 'out'].includes(o.status)).length,
  };
}

/* ---------------- DASHBOARD ---------------- */
function Kpi({ lab, val, icon, dir, delta }) {
  return (
    <div className="kpi-tile">
      <div className="lab"><Icon name={icon} size={14} style={{ color: 'var(--saffron)' }} />{lab}</div>
      <div className="val">{val}</div>
      {delta ? <div className={'delta' + (dir ? ' ' + dir : '')} style={!dir ? { color: 'var(--ink-faint)' } : {}}>{delta}</div> : null}
    </div>
  );
}

function Dashboard({ store, nav }) {
  const [period, setPeriod] = useState('Month');
  const m = metrics(store, period);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  // sales by weekday (Mon–Sun) from the period's real orders
  const sales = [0, 0, 0, 0, 0, 0, 0];
  m.ordersList.forEach(o => { const d = o.created_at ? (new Date(o.created_at).getDay() + 6) % 7 : 0; sales[d] += o.subtotal - o.discount; });
  const maxS = Math.max(1, ...sales);
  const todayIdx = (new Date().getDay() + 6) % 7;
  const expByCat = {};
  m.expensesList.forEach(e => { expByCat[e.cat] = (expByCat[e.cat] || 0) + e.amount; });
  const prodAgg = {};
  m.ordersList.forEach(o => o.items.forEach(i => { prodAgg[i.name] = (prodAgg[i.name] || 0) + i.qty; }));
  const topProducts = Object.entries(prodAgg).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const expEntries = Object.entries(expByCat).sort((a, b) => b[1] - a[1]);
  const expTotal = expEntries.reduce((s, e) => s + e[1], 0);
  const donutColors = ['#c2611f', '#1f5d43', '#8a2a33', '#a8821f', '#9a5a12', '#3a6d2a', '#7a3a8a', '#857c70'];
  let acc = 0;
  const segs = expEntries.map((e, i) => {
    const frac = e[1] / expTotal;
    const seg = `${donutColors[i % 8]} ${acc * 360}deg ${(acc + frac) * 360}deg`;
    acc += frac;
    return seg;
  });
  const preparing = store.orders.filter(o => o.status === 'preparing').length;
  const lowStock = store.products.filter(p => p.stockState === 'limited' || p.stockState === 'out').length;
  const recurringDue = store.expenses.filter(e => e.recurring).length;
  const plural = (n) => (n > 1 ? 's' : '');
  const queue = [
    m.newCount ? { label: m.newCount + ' new order' + plural(m.newCount) + ' to accept', tone: 'warn', go: () => nav('orders') } : null,
    preparing ? { label: preparing + ' order' + plural(preparing) + ' being prepared', tone: 'neutral', go: () => nav('orders') } : null,
    lowStock ? { label: lowStock + ' product' + plural(lowStock) + ' low on stock', tone: 'warn', go: () => nav('products') } : null,
    recurringDue ? { label: recurringDue + ' recurring expense' + plural(recurringDue), tone: 'neutral', go: () => nav('expenses') } : null,
  ].filter(Boolean);
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <div className="period">
          {['Today', 'Week', 'Month'].map(p => <button key={p} className={period === p ? 'active' : ''} onClick={() => setPeriod(p)}>{p}</button>)}
        </div>
      </div>
      {/* KPIs */}
      <div className="g-kpi" style={{ marginBottom: 18 }}>
        <Kpi lab="Revenue" val={fmt(m.revenue)} icon="rupee"
          dir={m.revDelta == null ? null : (m.revDelta >= 0 ? 'up' : 'down')}
          delta={m.revDelta == null ? 'No prior ' + period.toLowerCase() : (m.revDelta >= 0 ? '▲ ' : '▼ ') + Math.abs(m.revDelta) + '% vs last ' + period.toLowerCase()} />
        <Kpi lab="Expenses" val={fmt(m.exp)} icon="wallet"
          dir={m.expDelta == null ? null : (m.expDelta > 0 ? 'down' : 'up')}
          delta={m.expDelta == null ? 'No prior ' + period.toLowerCase() : (m.expDelta >= 0 ? '▲ ' : '▼ ') + Math.abs(m.expDelta) + '% vs last ' + period.toLowerCase()} />
        <Kpi lab="Net profit" val={fmt(m.net)} icon="trend" dir={m.net >= 0 ? 'up' : 'down'} delta={'Margin ' + m.netMargin + '%'} />
        <Kpi lab="Orders" val={String(m.orders)} icon="receipt" delta={m.newCount + ' awaiting action'} />
      </div>
      <div className="g-2-wide" style={{ marginBottom: 14 }}>
        {/* action queue */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Icon name="bell" size={17} style={{ color: 'var(--saffron)' }} /><b style={{ fontSize: 15 }}>Needs your attention</b>
          </div>
          {queue.length === 0 ? <div className="empty" style={{ padding: '14px 0' }}>All caught up 🎉</div> : null}
          {queue.map((r, i) => (
            <div key={i} onClick={r.go} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 0', borderBottom: i < queue.length - 1 ? '1px solid var(--rule)' : 'none', cursor: 'pointer' }}>
              <span className={'pill ' + r.tone} style={{ minWidth: 8, height: 8, padding: 0, width: 8, borderRadius: '50%' }} />
              <span style={{ fontSize: 13.5, fontWeight: 500, flex: 1 }}>{r.label}</span>
              <Icon name="chevR" size={16} style={{ color: 'var(--ink-faint)' }} />
            </div>
          ))}
        </div>
        {/* sales trend */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <b style={{ fontSize: 15 }}>Sales by day</b>
            <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontWeight: 600 }}>{fmt(m.revenue)}</span>
          </div>
          <div className="bars">
            {sales.map((s, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
                <div className="bar" style={{ width: '100%', height: (s / maxS * 100) + '%', background: i === todayIdx ? 'linear-gradient(180deg,var(--saffron),#e0903f)' : 'linear-gradient(180deg,#e7c39a,#edd3b3)' }} />
                <span style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 600 }}>{days[i]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="g-2-rev">
        {/* expense donut */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <b style={{ fontSize: 15 }}>Where money goes</b>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 14 }}>
            <div className="donut" style={{ background: segs.length ? `conic-gradient(${segs.join(',')})` : 'var(--rule)', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: '26%', background: 'var(--paper)', borderRadius: '50%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 9, color: 'var(--ink-faint)', fontWeight: 600 }}>TOTAL</div>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{fmt(expTotal)}</div>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              {expEntries.slice(0, 5).map((e, i) => (
                <div key={e[0]} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, marginBottom: 6 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: donutColors[i % 8], flex: '0 0 auto' }} />
                  <span style={{ flex: 1, color: 'var(--ink-soft)' }}>{e[0]}</span>
                  <b>{fmt(e[1])}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* top products */}
        <div className="card" style={{ padding: '18px 20px' }}>
          <b style={{ fontSize: 15 }}>Top products</b>
          {topProducts.length === 0 ? (
            <div className="empty" style={{ padding: '24px 10px' }}>No sales in this period yet.</div>
          ) : (
            <table className="tbl" style={{ marginTop: 10 }}>
              <tbody>
                {topProducts.map(([name, qty], i) => (
                  <tr key={name}>
                    <td style={{ width: 24, color: 'var(--ink-faint)', fontWeight: 700 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{name}</td>
                    <td style={{ textAlign: 'right', color: 'var(--ink-faint)' }}>{qty + ' sold'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- ORDERS ---------------- */
function ostatusPill(s) { return { new: 'warn', preparing: 'warn', out: 'solid-g', delivered: 'ok', cancelled: 'err' }[s] || 'neutral'; }
function ostatusLabel(s) { return { new: 'New', preparing: 'Preparing', out: 'Out for delivery', delivered: 'Delivered', cancelled: 'Cancelled' }[s] || s; }

function OrdersView({ store }) {
  const [tab, setTab] = useState('new');
  const [q, setQ] = useState('');
  const tabs = [['new', 'New'], ['preparing', 'Preparing'], ['out', 'Out'], ['delivered', 'Delivered'], ['all', 'All']];
  const counts = {};
  store.orders.forEach(o => counts[o.status] = (counts[o.status] || 0) + 1);
  const term = q.trim().toLowerCase();
  let list = tab === 'all' ? store.orders : store.orders.filter(o => o.status === tab);
  if (term) list = list.filter(o => (o.customer || '').toLowerCase().includes(term) || (o.phone || '').includes(term) || o.id.toLowerCase().includes(term) || o.items.some(i => i.name.toLowerCase().includes(term)));
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        {tabs.map(t => (
          <button key={t[0]} className={'chip' + (tab === t[0] ? ' active' : '')} onClick={() => setTab(t[0])}>
            {t[1]}{counts[t[0]] ? <span style={{ marginLeft: 2, opacity: .7 }}>{counts[t[0]]}</span> : null}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ position: 'relative' }}>
          <Icon name="search" size={15} style={{ position: 'absolute', left: 10, top: 9, color: 'var(--ink-faint)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search orders…" style={{ padding: '7px 12px 7px 32px', borderRadius: 9, border: '1.5px solid var(--rule-2)', fontSize: 13, background: 'var(--paper)', width: 220 }} />
        </div>
      </div>
      {list.length === 0 ? <div className="empty">{'No ' + tab + ' orders.'}</div> : (
        <div style={{ display: 'grid', gap: 11 }}>
          {list.map(o => (
            <div key={o.id} className="card" style={{ padding: '15px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <b style={{ fontSize: 15 }}>{o.id}</b>
                <span className={'pill ' + ostatusPill(o.status)}>{ostatusLabel(o.status)}</span>
                <span className="pill neutral">{o.pay}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-faint)', marginLeft: 'auto' }}>{o.time}</span>
              </div>
              <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Customer</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{o.customer}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{o.addr}</div>
                </div>
                <div style={{ flex: 1.3 }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Items</div>
                  <div style={{ fontSize: 13 }}>{o.items.map(i => i.qty + '× ' + i.name + ' (' + i.size + ')').join(', ')}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 4 }}>Total</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--saffron)' }}>{fmt(o.total)}</div>
                  {o.discount > 0 ? <div style={{ fontSize: 11, color: 'var(--green)' }}>{'−' + fmt(o.discount) + ' off'}</div> : null}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 9, alignItems: 'center', borderTop: '1px solid var(--rule)', paddingTop: 11 }}>
                {['new', 'preparing', 'out'].includes(o.status) ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-faint)' }}>
                    <Icon name="user" size={13} />
                    <select value={o.worker || ''} onChange={e => store.updateOrder(o.id, o.status, e.target.value || null)} style={{ fontSize: 12, padding: '5px 8px', border: '1px solid var(--rule-2)', borderRadius: 8, background: 'var(--paper)' }}>
                      <option value="">Unassigned</option>
                      {store.workers.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                    </select>
                  </span>
                ) : (o.worker ? <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}><Icon name="user" size={13} style={{ verticalAlign: '-2px', marginRight: 4 }} />{o.worker}</span> : <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>—</span>)}
                <div style={{ flex: 1 }} />
                {o.status === 'new' ? (
                  <>
                    <button className="btn ghost sm" onClick={() => store.updateOrder(o.id, 'cancelled')}>Reject</button>
                    <button className="btn sm dark" onClick={() => store.updateOrder(o.id, 'preparing')}>Accept</button>
                  </>
                ) : null}
                {o.status === 'preparing' ? <button className="btn sm" onClick={() => store.updateOrder(o.id, 'out')}>Mark out for delivery</button> : null}
                {o.status === 'out' ? <button className="btn sm dark" onClick={() => store.updateOrder(o.id, 'delivered')}>Mark delivered</button> : null}
                {o.status === 'delivered' ? <span className="pill ok"><Icon name="check" size={11} />Completed</span> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- PRODUCTS ---------------- */
function OStock({ p }) {
  const m = { in: ['ok', 'In stock'], limited: ['warn', 'Limited'], out: ['err', 'Out'], mto: ['neutral', 'Made to order'], seasonal: ['neutral', 'Seasonal'] };
  const v = m[p.stockState] || ['neutral', p.stockState];
  return <span className={'pill ' + v[0]}>{v[1]}</span>;
}

function ProductsView({ store }) {
  const [cat, setCat] = useState('all');
  const [add, setAdd] = useState(false);
  const [edit, setEdit] = useState(null);
  const [cats, setCats] = useState(false);
  const [restock, setRestock] = useState(null);
  const bulk = useBulk();
  const list = cat === 'all' ? store.products : store.products.filter(p => p.cat === cat);
  const allOn = list.length > 0 && list.every(p => bulk.has(p.id));
  async function delSelected() { if (confirm('Delete ' + bulk.sel.size + ' product(s)?')) { await store.deleteProducts([...bulk.sel]); bulk.clear(); store.toast('Deleted'); } }
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <button className={'chip' + (cat === 'all' ? ' active' : '')} onClick={() => setCat('all')}>All</button>
        {store.categories.map(c => <button key={c.id} className={'chip' + (cat === c.id ? ' active' : '')} onClick={() => setCat(c.id)}>{c.name}</button>)}
        <div style={{ flex: 1 }} />
        <button className="btn ghost sm" onClick={() => setCats(true)}><Icon name="grid" size={15} />Manage categories</button>
        <button className="btn sm" onClick={() => setAdd(true)}><Icon name="plus" size={15} />Add product</button>
      </div>
      <BulkBar n={bulk.sel.size} noun="product" onDelete={delSelected} onClear={bulk.clear} />
      <div className="card tbl-wrap">
        <table className="tbl">
          <thead>
            <tr><th style={{ width: 28 }}><input type="checkbox" style={cbStyle} checked={allOn} onChange={() => bulk.set(allOn ? [] : list.map(p => p.id))} /></th><th>Product</th><th>Category</th><th>Price</th><th>Cost</th><th>Margin</th><th>Stock</th><th></th></tr>
          </thead>
          <tbody>
            {list.map(p => {
              const v = p.variants[0];
              const margin = Math.round((v.price - v.cost) / v.price * 100);
              return (
                <tr key={p.id}>
                  <td><input type="checkbox" style={cbStyle} checked={bulk.has(p.id)} onChange={() => bulk.toggle(p.id)} /></td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 9, background: `linear-gradient(150deg,${p.tint},${p.tint}cc)`, flex: '0 0 auto' }} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{p.name}</div>
                        {p.badge ? <span className="pill solid-s" style={{ marginTop: 3 }}>{p.badge}</span> : null}
                      </div>
                    </div>
                  </td>
                  <td style={{ textTransform: 'capitalize', color: 'var(--ink-faint)' }}>{p.cat}</td>
                  <td style={{ fontWeight: 600 }}>{fmt(v.price)}{p.variants.length > 1 ? <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 500 }}>{' · ' + p.variants.length + ' sizes'}</span> : null}</td>
                  <td style={{ color: 'var(--ink-faint)' }}>{fmt(v.cost)}</td>
                  <td><span style={{ fontWeight: 700, color: margin > 45 ? 'var(--green)' : 'var(--saffron-d)' }}>{margin + '%'}</span></td>
                  <td><OStock p={p} /></td>
                  <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button onClick={() => setRestock(p)} title="Restock" style={{ color: 'var(--ink-faint)', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, marginRight: 12 }}><Icon name="box" size={16} />Restock</button>
                    <button onClick={() => setEdit(p)} title="Edit product" style={{ color: 'var(--ink-faint)', display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600 }}><Icon name="edit" size={16} />Edit</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {add ? <ProductModal store={store} close={() => setAdd(false)} /> : null}
      {edit ? <ProductModal store={store} product={edit} close={() => setEdit(null)} /> : null}
      {cats ? <CategoriesModal store={store} close={() => setCats(false)} /> : null}
      {restock ? <RestockModal store={store} product={restock} close={() => setRestock(null)} /> : null}
    </div>
  );
}

function RestockModal({ store, close, product }) {
  const [adds, setAdds] = useState(() => product.variants.map(() => ''));
  const set = (i, val) => setAdds(a => a.map((x, j) => (j === i ? val.replace(/[^\d]/g, '') : x)));
  const any = adds.some(a => +a > 0);
  async function save() {
    const variants = product.variants.map((v, i) => ({ ...v, stock: (+v.stock || 0) + (+adds[i] || 0) }));
    try { await store.updateProduct(product.id, { variants }); store.toast('Stock updated · ' + product.name); close(); }
    catch { /* toast shown by store */ }
  }
  return (
    <Portal>
      <div className="dscrim" onClick={close}>
        <div className="dmodal" style={{ width: 'min(480px,100%)' }} onClick={e => e.stopPropagation()}>
          <div className="dm-head"><h3>Restock · {product.name}</h3><button onClick={close}><Icon name="close" size={20} /></button></div>
          <div className="dm-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px', gap: 8, fontSize: 10, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 6 }}>
              <span>Size</span><span style={{ textAlign: 'right' }}>In stock</span><span style={{ textAlign: 'right' }}>Add</span>
            </div>
            {product.variants.map((v, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 90px 90px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{v.size}{v.mto ? <span className="muted" style={{ fontSize: 11 }}> · MTO</span> : null}</span>
                <span style={{ textAlign: 'right', fontSize: 13, color: 'var(--ink-faint)' }}>{v.mto ? '—' : v.stock}</span>
                <input value={adds[i]} disabled={v.mto} onChange={e => set(i, e.target.value)} placeholder="0" style={{ ...vinput, textAlign: 'right', opacity: v.mto ? .5 : 1 }} />
              </div>
            ))}
          </div>
          <div className="dm-foot">
            <button className="btn ghost" onClick={close}>Cancel</button>
            <button className="btn" disabled={!any} onClick={save}>Add stock</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

const CAT_ICONS = ['fire', 'sparkle', 'bolt', 'leaf', 'clock', 'star', 'tag', 'box'];
function CategoriesModal({ store, close }) {
  const [name, setName] = useState('');
  const [tint, setTint] = useState('#c2611f');
  const [icon, setIcon] = useState('tag');
  const [editId, setEditId] = useState(null);
  function reset() { setName(''); setTint('#c2611f'); setIcon('tag'); setEditId(null); }
  async function save() {
    if (!name.trim()) return;
    try {
      if (editId) { await store.updateCategory(editId, { name: name.trim(), tint, icon }); store.toast('Category updated'); }
      else { await store.addCategory({ name: name.trim(), tint, icon }); store.toast(name.trim() + ' added'); }
      reset();
    } catch { /* toast shown */ }
  }
  return (
    <Portal>
      <div className="dscrim" onClick={close}>
        <div className="dmodal" style={{ width: 'min(560px,100%)' }} onClick={e => e.stopPropagation()}>
          <div className="dm-head"><h3>Manage categories</h3><button onClick={close}><Icon name="close" size={20} /></button></div>
          <div className="dm-body">
            {store.categories.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 0', borderBottom: '1px solid var(--rule)' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: c.tint + '22', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={c.icon} size={16} style={{ color: c.tint }} /></div>
                <span style={{ flex: 1, fontWeight: 600, fontSize: 13.5 }}>{c.name}</span>
                <button onClick={() => { setEditId(c.id); setName(c.name); setTint(c.tint); setIcon(c.icon); }} title="Edit" style={{ color: 'var(--ink-faint)' }}><Icon name="edit" size={15} /></button>
                <button onClick={() => { if (confirm('Delete category ' + c.name + '?')) store.deleteCategory(c.id); }} title="Delete" style={{ color: 'var(--maroon)' }}><Icon name="close" size={15} /></button>
              </div>
            ))}
            <div style={{ marginTop: 16, fontSize: 11.5, fontWeight: 600 }}>{editId ? 'Edit category' : 'New category'}</div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginTop: 8 }}>
              <div className="field" style={{ flex: 1, marginBottom: 0 }}><label>Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Beverages" /></div>
              <div className="field" style={{ marginBottom: 0 }}><label>Colour</label><input type="color" value={tint} onChange={e => setTint(e.target.value)} style={{ width: 48, padding: 4, height: 40 }} /></div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {CAT_ICONS.map(ic => (
                <button key={ic} onClick={() => setIcon(ic)} className={'chip' + (icon === ic ? ' active' : '')} style={{ padding: '6px 9px' }}><Icon name={ic} size={15} /></button>
              ))}
            </div>
          </div>
          <div className="dm-foot">
            {editId ? <button className="btn ghost" onClick={reset} style={{ marginRight: 'auto' }}>Cancel edit</button> : null}
            <button className="btn ghost" onClick={close}>Close</button>
            <button className="btn" disabled={!name.trim()} onClick={save}>{editId ? 'Save changes' : 'Add category'}</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

const vinput = { width: '100%', padding: '9px 10px', border: '1.5px solid var(--rule-2)', borderRadius: 9, fontSize: 13.5, background: 'var(--paper)' };

function ProductModal({ store, close, product }) {
  const editing = !!product;
  const [name, setName] = useState(product ? product.name : '');
  const [cat, setCat] = useState(product ? product.cat : (store.categories[0]?.id || ''));
  const [desc, setDesc] = useState(product ? product.desc : '');
  const [variants, setVariants] = useState(product
    ? product.variants.map(v => ({ size: v.size, price: String(v.price), cost: String(v.cost), stock: String(v.stock || 0), mto: !!v.mto }))
    : [{ size: '250g', price: '', cost: '', stock: '', mto: false }]);
  const [confirmDel, setConfirmDel] = useState(false);
  const [photo, setPhoto] = useState(product ? (product.image_url || null) : null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);
  const categories = store.categories;
  const catObj = categories.find(c => c.id === cat) || { tint: '#c2611f' };

  async function onPickPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadProductPhoto(file);
      setPhoto(url);
      store.toast('Photo uploaded');
    } catch {
      store.toast('Photo upload failed');
    } finally {
      setUploading(false);
    }
  }

  const setV = (i, key, val) => setVariants(vs => vs.map((v, j) => j === i ? { ...v, [key]: val } : v));
  const addRow = () => setVariants(vs => [...vs, { size: '', price: '', cost: '', stock: '', mto: false }]);
  const removeRow = (i) => setVariants(vs => vs.length > 1 ? vs.filter((_, j) => j !== i) : vs);
  function variantIssue(v) {
    if (!v.size.trim()) return 'Add a size / unit for every row';
    if (!(+v.price > 0)) return 'Price must be greater than 0';
    if (!(+v.cost > 0)) return 'Enter a cost (greater than 0)';
    if (+v.cost >= +v.price) return 'Cost should be less than the price';
    if (!v.mto && !(+v.stock >= 0 && v.stock !== '')) return 'Enter stock (or turn on Made-to-order)';
    return null;
  }
  const firstIssue = !name.trim() ? 'Enter a product name'
    : !cat ? 'Pick a category'
      : (variants.map(variantIssue).find(Boolean) || null);
  const valid = !firstIssue;
  return (
    <Portal>
      <div className="dscrim" onClick={close}>
        <div className="dmodal" style={{ width: 'min(640px,100%)' }} onClick={e => e.stopPropagation()}>
          <div className="dm-head">
            <h3>{editing ? 'Edit product' : 'Add a product'}</h3>
            <button onClick={close}><Icon name="close" size={20} /></button>
          </div>
          <div className="dm-body">
            {/* photo + name row */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 4 }}>
              <div
                style={{ width: 96, height: 96, borderRadius: 12, flex: '0 0 auto', background: photo ? `center/cover no-repeat url(${JSON.stringify(photo)})` : `linear-gradient(150deg,${catObj.tint},${catObj.tint}cc)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', position: 'relative' }}
                onClick={() => fileRef.current?.click()}
              >
                {!photo ? <><Icon name="camera" size={24} /><span style={{ fontSize: 10, fontWeight: 600, marginTop: 5 }}>{uploading ? 'Uploading…' : 'Add photo'}</span></> : null}
                {photo && uploading ? <span style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600 }}>Uploading…</span> : null}
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPickPhoto} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="field" style={{ marginBottom: 10 }}>
                  <label>Product name</label>
                  <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Lemon Pickle" />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Short description</label>
                  <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Optional — what makes it special" />
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 600, margin: '14px 0 8px' }}>Category</div>
            {categories.length === 0 ? (
              <div style={{ background: 'var(--saffron-soft)', border: '1px solid var(--rule-2)', borderRadius: 10, padding: '11px 13px', fontSize: 12.5, color: 'var(--saffron-d)', marginBottom: 16 }}>
                No categories yet. Close this and use <b>Manage categories</b> to add one first — every product needs a category.
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
                {categories.map(c => <button key={c.id} className={'chip' + (cat === c.id ? ' active' : '')} onClick={() => setCat(c.id)}>{c.name}</button>)}
              </div>
            )}
            {/* variants editor */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '4px 0 8px' }}>
              <div style={{ fontSize: 11.5, fontWeight: 600 }}>Pack sizes & pricing</div>
              <span style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Add a row per size (250g · 500g · 1kg…)</span>
            </div>
            {/* header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 0.9fr 80px 24px', gap: 8, padding: '0 2px 6px', fontSize: 10, fontWeight: 600, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
              <span>Size / unit</span><span>Price ₹</span><span>Cost ₹</span><span>Stock</span><span>Made-to-order</span><span></span>
            </div>
            {variants.map((v, i) => {
              const margin = v.price && v.cost ? Math.round((v.price - v.cost) / v.price * 100) : null;
              return (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr 0.9fr 80px 24px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <input value={v.size} onChange={e => setV(i, 'size', e.target.value)} placeholder="250g" style={vinput} />
                  <div style={{ position: 'relative' }}>
                    <input type="number" value={v.price} onChange={e => setV(i, 'price', e.target.value)} placeholder="0" style={vinput} />
                    {margin !== null ? <span style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', fontSize: 9, fontWeight: 700, color: margin >= 45 ? 'var(--green)' : 'var(--saffron-d)' }}>{margin + '%'}</span> : null}
                  </div>
                  <input type="number" value={v.cost} onChange={e => setV(i, 'cost', e.target.value)} placeholder="0" style={vinput} />
                  <input type="number" disabled={v.mto} value={v.mto ? '' : v.stock} onChange={e => setV(i, 'stock', e.target.value)} placeholder={v.mto ? '—' : '0'} style={{ ...vinput, opacity: v.mto ? .5 : 1 }} />
                  <button onClick={() => setV(i, 'mto', !v.mto)} title="Made to order" style={{ justifySelf: 'center' }}>
                    <span style={{ width: 36, height: 21, borderRadius: 12, background: v.mto ? 'var(--green)' : 'var(--rule-2)', position: 'relative', display: 'block', transition: '.16s' }}>
                      <span style={{ position: 'absolute', top: 2, left: v.mto ? 17 : 2, width: 17, height: 17, borderRadius: '50%', background: '#fff', transition: '.16s' }} />
                    </span>
                  </button>
                  {variants.length > 1 ? <button onClick={() => removeRow(i)} style={{ color: 'var(--ink-faint)', justifySelf: 'center' }}><Icon name="close" size={15} /></button> : <span />}
                </div>
              );
            })}
            <button onClick={addRow} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--saffron-d)', marginTop: 2 }}><Icon name="plus" size={15} />Add another size</button>
            {firstIssue ? <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--err)', display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="bell" size={14} />{firstIssue}</div> : null}
          </div>
          <div className="dm-foot">
            {editing ? <button onClick={() => setConfirmDel(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: 'var(--maroon)', marginRight: 'auto' }}><Icon name="close" size={15} />Delete</button> : null}
            <button className="btn ghost" onClick={close}>Cancel</button>
            <button className="btn" disabled={!valid || uploading} onClick={async () => {
              try {
                if (editing) { await store.updateProduct(product.id, { name: name.trim(), cat, desc, variants, tint: catObj.tint, image_url: photo }); store.toast(name.trim() + ' updated'); }
                else { await store.addProduct({ name: name.trim(), cat, desc, variants, tint: catObj.tint, image_url: photo }); store.toast(name.trim() + ' added · ' + variants.length + ' size' + (variants.length > 1 ? 's' : '')); }
                close();
              } catch {
                // toast already shown by store mutation
              }
            }}>{editing ? 'Save changes' : 'Save product'}</button>
          </div>
          {confirmDel ? (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.96)', borderRadius: 18, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 30, textAlign: 'center' }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--maroon-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}><Icon name="close" size={26} style={{ color: 'var(--maroon)' }} /></div>
              <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>{'Delete “' + (product ? product.name : '') + '”?'}</div>
              <div style={{ fontSize: 13.5, color: 'var(--ink-faint)', marginBottom: 20, maxWidth: 340 }}>It will be removed from your catalog and the storefront. This can’t be undone.</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn ghost" onClick={() => setConfirmDel(false)}>Keep it</button>
                <button className="btn" style={{ background: 'var(--maroon)', boxShadow: 'none' }} onClick={() => { store.deleteProduct(product.id); store.toast(product.name + ' deleted'); close(); }}>Delete product</button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </Portal>
  );
}

/* ---------------- EXPENSES ---------------- */
function ExpensesView({ store }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const bulk = useBulk();
  const allOn = store.expenses.length > 0 && store.expenses.every(e => bulk.has(e.id));
  async function delSelected() { if (confirm('Delete ' + bulk.sel.size + ' expense(s)?')) { await store.deleteExpenses([...bulk.sel]); bulk.clear(); store.toast('Deleted'); } }
  const total = store.expenses.reduce((s, e) => s + e.amount, 0);
  const byCat = {};
  store.expenses.forEach(e => byCat[e.cat] = (byCat[e.cat] || 0) + e.amount);
  const biggest = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  const recurringList = store.expenses.filter(e => e.recurring);
  const recurringCats = [...new Set(recurringList.map(e => e.cat))];
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginBottom: 18 }}>
        <div className="kpi-tile" style={{ flex: '1 1 150px' }}>
          <div className="lab">Total this month</div>
          <div className="val">{fmt(total)}</div>
        </div>
        <div className="kpi-tile" style={{ flex: '1 1 150px' }}>
          <div className="lab">Biggest category</div>
          <div className="val" style={{ fontSize: 20 }}>{biggest ? biggest[0] : '—'}</div>
          <div className="delta" style={{ color: 'var(--ink-faint)' }}>{fmt(biggest ? biggest[1] : 0)}</div>
        </div>
        <div className="kpi-tile" style={{ flex: '1 1 150px' }}>
          <div className="lab">Recurring</div>
          <div className="val" style={{ fontSize: 20 }}>{recurringList.length} item{recurringList.length === 1 ? '' : 's'}</div>
          <div className="delta" style={{ color: 'var(--saffron-d)' }}>{recurringCats.slice(0, 3).join(' · ') || '—'}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'stretch' }}>
          <button className="btn" onClick={() => setOpen(true)} style={{ height: '100%', borderRadius: 13 }}><Icon name="plus" size={17} />Log expense</button>
        </div>
      </div>
      <BulkBar n={bulk.sel.size} noun="expense" onDelete={delSelected} onClear={bulk.clear} />
      <div className="card tbl-wrap">
        <table className="tbl">
          <thead>
            <tr><th style={{ width: 28 }}><input type="checkbox" style={cbStyle} checked={allOn} onChange={() => bulk.set(allOn ? [] : store.expenses.map(e => e.id))} /></th><th>Date</th><th>Category</th><th>Payee</th><th>Note</th><th></th><th style={{ textAlign: 'right' }}>Amount</th><th></th></tr>
          </thead>
          <tbody>
            {store.expenses.map(e => (
              <tr key={e.id}>
                <td><input type="checkbox" style={cbStyle} checked={bulk.has(e.id)} onChange={() => bulk.toggle(e.id)} /></td>
                <td style={{ color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>{e.date}</td>
                <td><span style={{ fontWeight: 600 }}>{e.cat}</span></td>
                <td style={{ color: 'var(--ink-soft)' }}>{e.payee}</td>
                <td style={{ color: 'var(--ink-faint)' }}>{e.note}</td>
                <td>{e.recurring ? <span className="pill neutral"><Icon name="clock" size={10} />Recurring</span> : null}</td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{fmt(e.amount)}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button onClick={() => setEdit(e)} title="Edit" style={{ color: 'var(--ink-faint)', marginRight: 10 }}><Icon name="edit" size={15} /></button>
                  <button onClick={() => { if (confirm('Delete this expense?')) store.deleteExpense(e.id); }} title="Delete" style={{ color: 'var(--maroon)' }}><Icon name="close" size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open ? <ExpenseModal store={store} close={() => setOpen(false)} /> : null}
      {edit ? <ExpenseModal store={store} expense={edit} close={() => setEdit(null)} /> : null}
    </div>
  );
}

function ExpenseModal({ store, close, expense }) {
  const editing = !!expense;
  const [cat, setCat] = useState(expense ? expense.cat : 'Raw Groceries');
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '');
  const [payee, setPayee] = useState(expense ? (expense.payee === '—' ? '' : expense.payee) : '');
  const [note, setNote] = useState(expense ? (expense.note === '—' ? '' : expense.note) : '');
  return (
    <Portal>
      <div className="dscrim" onClick={close}>
        <div className="dmodal" onClick={e => e.stopPropagation()}>
          <div className="dm-head">
            <h3>{editing ? 'Edit expense' : 'Log an expense'}</h3>
            <button onClick={close}><Icon name="close" size={20} /></button>
          </div>
          <div className="dm-body">
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Amount</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <span style={{ fontSize: 30, fontWeight: 700, color: 'var(--ink-faint)' }}>₹</span>
                <input autoFocus value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="0" style={{ border: 'none', outline: 'none', fontSize: 40, fontWeight: 700, width: 160, textAlign: 'center', background: 'transparent', fontFamily: 'var(--sans)' }} />
              </div>
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 600, marginBottom: 8 }}>Category</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
              {store.expenseCats.map(c => <button key={c} className={'chip' + (cat === c ? ' active' : '')} onClick={() => setCat(c)}>{c}</button>)}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div className="field" style={{ flex: 1 }}>
                <label>Payee</label>
                <input value={payee} onChange={e => setPayee(e.target.value)} placeholder="e.g. Rythu Bazaar" />
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Note</label>
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <button style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--saffron-d)', fontWeight: 600 }}><Icon name="camera" size={16} />Attach bill photo</button>
          </div>
          <div className="dm-foot">
            <button className="btn ghost" onClick={close}>Cancel</button>
            <button className="btn" disabled={!amount} onClick={async () => {
              try {
                if (editing) { await store.updateExpense(expense.id, { cat, amount: +amount, payee: payee || '—', note: note || '—' }); store.toast('Expense updated'); }
                else { await store.addExpense({ cat, amount: +amount, payee: payee || '—', note: note || '—' }); store.toast('Expense logged · ' + fmt(+amount)); }
                close();
              } catch { /* toast shown by store */ }
            }}>{editing ? 'Save changes' : 'Save expense'}</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/* ---------------- WORKERS ---------------- */
function WorkersView({ store }) {
  const [add, setAdd] = useState(false);
  const [edit, setEdit] = useState(null);
  const [advance, setAdvance] = useState(null);
  const bulk = useBulk();
  async function delSelected() { if (confirm('Delete ' + bulk.sel.size + ' worker(s)?')) { await store.deleteWorkers([...bulk.sel]); bulk.clear(); store.toast('Deleted'); } }
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ flex: 1 }} />
        <button className="btn sm" onClick={() => setAdd(true)}><Icon name="plus" size={15} />Add worker</button>
      </div>
      <BulkBar n={bulk.sel.size} noun="worker" onDelete={delSelected} onClear={bulk.clear} />
      {store.workers.length === 0 ? <div className="empty">No workers yet. Add your first one.</div> : (
        <div className="g-3">
          {store.workers.map(w => (
            <div key={w.id} className="card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <input type="checkbox" style={cbStyle} checked={bulk.has(w.id)} onChange={() => bulk.toggle(w.id)} />
                <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--green)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16 }}>{(w.name[0] || '?').toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{w.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{w.role}</div>
                </div>
                <button onClick={() => setEdit(w)} title="Edit" style={{ color: 'var(--ink-faint)' }}><Icon name="edit" size={16} /></button>
                <button onClick={() => { if (confirm('Delete ' + w.name + '?')) store.deleteWorker(w.id); }} title="Delete" style={{ color: 'var(--maroon)' }}><Icon name="close" size={16} /></button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderTop: '1px solid var(--rule)', fontSize: 13 }}>
                <span className="muted">Monthly salary</span><b>{fmt(w.salary)}</b>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 13 }}>
                <span className="muted">Advance taken</span><b style={{ color: w.advance ? 'var(--maroon)' : 'var(--ink)' }}>{w.advance ? fmt(w.advance) : '—'}</b>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn sm dark" style={{ flex: 1 }} onClick={() => store.payWorker(w)}>Pay salary</button>
                <button className="btn ghost sm" style={{ flex: 1 }} onClick={() => setAdvance(w)}>Advance</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {add ? <WorkerModal store={store} close={() => setAdd(false)} /> : null}
      {edit ? <WorkerModal store={store} worker={edit} close={() => setEdit(null)} /> : null}
      {advance ? <AdvanceModal store={store} worker={advance} close={() => setAdvance(null)} /> : null}
    </div>
  );
}

function WorkerModal({ store, close, worker }) {
  const editing = !!worker;
  const [name, setName] = useState(worker ? worker.name : '');
  const [role, setRole] = useState(worker ? worker.role : '');
  const [salary, setSalary] = useState(worker ? String(worker.salary) : '');
  const valid = name.trim() && salary;
  return (
    <Portal>
      <div className="dscrim" onClick={close}>
        <div className="dmodal" onClick={e => e.stopPropagation()}>
          <div className="dm-head"><h3>{editing ? 'Edit worker' : 'Add a worker'}</h3><button onClick={close}><Icon name="close" size={20} /></button></div>
          <div className="dm-body">
            <div className="field"><label>Name</label><input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ravi Teja" /></div>
            <div className="field"><label>Role</label><input value={role} onChange={e => setRole(e.target.value)} placeholder="e.g. Kitchen & Delivery" /></div>
            <div className="field"><label>Monthly salary (₹)</label><input type="number" value={salary} onChange={e => setSalary(e.target.value)} placeholder="0" /></div>
          </div>
          <div className="dm-foot">
            <button className="btn ghost" onClick={close}>Cancel</button>
            <button className="btn" disabled={!valid} onClick={async () => {
              try {
                if (editing) { await store.updateWorker(worker.id, { name: name.trim(), role, salary }); store.toast(name.trim() + ' updated'); }
                else { await store.addWorker({ name: name.trim(), role, salary }); store.toast(name.trim() + ' added'); }
                close();
              } catch { /* toast shown by store */ }
            }}>{editing ? 'Save changes' : 'Add worker'}</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

function AdvanceModal({ store, close, worker }) {
  const [amount, setAmount] = useState('');
  return (
    <Portal>
      <div className="dscrim" onClick={close}>
        <div className="dmodal" style={{ width: 'min(420px,100%)' }} onClick={e => e.stopPropagation()}>
          <div className="dm-head"><h3>Record advance · {worker.name}</h3><button onClick={close}><Icon name="close" size={20} /></button></div>
          <div className="dm-body">
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: 'var(--ink-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Advance amount</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color: 'var(--ink-faint)' }}>₹</span>
                <input autoFocus value={amount} onChange={e => setAmount(e.target.value.replace(/\D/g, ''))} placeholder="0" style={{ border: 'none', outline: 'none', fontSize: 36, fontWeight: 700, width: 150, textAlign: 'center', background: 'transparent', fontFamily: 'var(--sans)' }} />
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 6 }}>Current advance: {fmt(worker.advance || 0)} · logged as an expense</div>
            </div>
          </div>
          <div className="dm-foot">
            <button className="btn ghost" onClick={close}>Cancel</button>
            <button className="btn" disabled={!amount} onClick={async () => { try { await store.recordAdvance(worker, +amount); close(); } catch { /* toast shown */ } }}>Record advance</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/* ---------------- CUSTOMERS ---------------- */
const normPhone = (p) => (p || '').replace(/\D/g, '').slice(-10);
function customerStats(orders, phone) {
  const key = normPhone(phone);
  if (!key) return { orders: 0, spent: 0, last: '—', seg: 'New' };
  const os = orders.filter(o => normPhone(o.phone) === key);
  const spent = os.reduce((s, o) => s + o.total, 0);
  const last = os.length ? os.slice().sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0].time : '—';
  const seg = spent >= 6000 ? 'High-value' : (os.length <= 1 ? 'New' : 'Repeat');
  return { orders: os.length, spent, last, seg };
}

function CustomersView({ store }) {
  const [add, setAdd] = useState(false);
  const [edit, setEdit] = useState(null);
  const bulk = useBulk();
  const allOn = store.customers.length > 0 && store.customers.every(c => bulk.has(c.id));
  async function delSelected() { if (confirm('Delete ' + bulk.sel.size + ' customer(s)?')) { await store.deleteCustomers([...bulk.sel]); bulk.clear(); store.toast('Deleted'); } }
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ flex: 1 }} />
        <button className="btn sm" onClick={() => setAdd(true)}><Icon name="plus" size={15} />Add customer</button>
      </div>
      <BulkBar n={bulk.sel.size} noun="customer" onDelete={delSelected} onClear={bulk.clear} />
      {store.customers.length === 0 ? <div className="empty">No customers yet. Add one, or they'll appear here as you record their orders.</div> : (
        <div className="card tbl-wrap">
          <table className="tbl">
            <thead>
              <tr><th style={{ width: 28 }}><input type="checkbox" style={cbStyle} checked={allOn} onChange={() => bulk.set(allOn ? [] : store.customers.map(c => c.id))} /></th><th>Customer</th><th>Phone</th><th>Orders</th><th>Total spent</th><th>Last order</th><th>Segment</th><th></th></tr>
            </thead>
            <tbody>
              {store.customers.map(c => {
                const st = customerStats(store.orders, c.phone);
                return (
                  <tr key={c.id}>
                    <td><input type="checkbox" style={cbStyle} checked={bulk.has(c.id)} onChange={() => bulk.toggle(c.id)} /></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--maroon)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{(c.name[0] || '?').toUpperCase()}</div>
                        <b>{c.name}</b>
                      </div>
                    </td>
                    <td style={{ color: 'var(--ink-faint)' }}>{c.phone || '—'}</td>
                    <td>{st.orders}</td>
                    <td style={{ fontWeight: 700 }}>{fmt(st.spent)}</td>
                    <td style={{ color: 'var(--ink-faint)' }}>{st.last}</td>
                    <td><span className={'pill ' + (st.seg === 'High-value' ? 'solid-g' : st.seg === 'New' ? 'warn' : 'neutral')}>{st.seg}</span></td>
                    <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={() => setEdit(c)} title="Edit" style={{ color: 'var(--ink-faint)', marginRight: 10 }}><Icon name="edit" size={15} /></button>
                      <button onClick={() => { if (confirm('Delete ' + c.name + '?')) store.deleteCustomers([c.id]); }} title="Delete" style={{ color: 'var(--maroon)' }}><Icon name="close" size={15} /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {add ? <CustomerModal store={store} close={() => setAdd(false)} /> : null}
      {edit ? <CustomerModal store={store} customer={edit} close={() => setEdit(null)} /> : null}
    </div>
  );
}

function CustomerModal({ store, close, customer }) {
  const editing = !!customer;
  const [name, setName] = useState(customer ? customer.name : '');
  const [phone, setPhone] = useState(customer ? customer.phone : '');
  const [address, setAddress] = useState(customer ? customer.address : '');
  const [notes, setNotes] = useState(customer ? customer.notes : '');
  return (
    <Portal>
      <div className="dscrim" onClick={close}>
        <div className="dmodal" onClick={e => e.stopPropagation()}>
          <div className="dm-head"><h3>{editing ? 'Edit customer' : 'Add a customer'}</h3><button onClick={close}><Icon name="close" size={20} /></button></div>
          <div className="dm-body">
            <div className="field"><label>Name</label><input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Priya Sharma" /></div>
            <div className="field"><label>Phone</label><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98480 12345" /></div>
            <div className="field"><label>Address</label><input value={address} onChange={e => setAddress(e.target.value)} placeholder="Optional" /></div>
            <div className="field"><label>Notes</label><input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" /></div>
          </div>
          <div className="dm-foot">
            <button className="btn ghost" onClick={close}>Cancel</button>
            <button className="btn" disabled={!name.trim()} onClick={async () => {
              try {
                if (editing) { await store.updateCustomer(customer.id, { name: name.trim(), phone, address, notes }); store.toast('Customer updated'); }
                else { await store.addCustomer({ name: name.trim(), phone, address, notes }); store.toast(name.trim() + ' added'); }
                close();
              } catch { /* toast shown by store */ }
            }}>{editing ? 'Save changes' : 'Add customer'}</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/* ---------------- DELIVERY & OFFERS ---------------- */
function DeliveryView({ store }) {
  const [thr, setThr] = useState(store.delivery.freeThreshold);
  const [chg, setChg] = useState(store.delivery.flatCharge);
  const [addC, setAddC] = useState(false);
  const [editC, setEditC] = useState(null);
  const bulk = useBulk();
  async function delSelectedCoupons() { if (confirm('Delete ' + bulk.sel.size + ' coupon(s)?')) { await store.deleteCoupons([...bulk.sel]); bulk.clear(); store.toast('Deleted'); } }
  return (
    <div className="fade-in g-2">
      <div className="card" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
          <Icon name="truck" size={18} style={{ color: 'var(--saffron)' }} /><b style={{ fontSize: 16 }}>Delivery rules</b>
        </div>
        <p style={{ fontSize: 13, color: 'var(--ink-faint)', marginTop: 0 }}>Applied automatically at checkout for every customer.</p>
        <div className="field">
          <label>Free delivery above (₹)</label>
          <input type="number" value={thr} onChange={e => setThr(+e.target.value)} />
        </div>
        <div className="field">
          <label>Flat charge below threshold (₹)</label>
          <input type="number" value={chg} onChange={e => setChg(+e.target.value)} />
        </div>
        <div style={{ background: 'var(--cream)', border: '1px solid var(--rule)', borderRadius: 12, padding: '13px 15px', fontSize: 13, margin: '4px 0 14px' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 7 }}>
            <span className="pill ok">Preview</span><span className="muted">How customers see it</span>
          </div>
          <div>Order ≥ <b>{fmt(thr)}</b> → <b style={{ color: 'var(--green)' }}>Free delivery</b></div>
          <div style={{ marginTop: 3 }}>Order &lt; <b>{fmt(thr)}</b> → <b>{fmt(chg) + ' delivery'}</b></div>
        </div>
        <button className="btn" onClick={() => { store.setDelivery(thr, chg); store.toast('Delivery rules saved'); }}>Save rules</button>
      </div>
      <div className="card" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
          <Icon name="tag" size={18} style={{ color: 'var(--saffron)' }} /><b style={{ fontSize: 16 }}>Coupons & offers</b>
        </div>
        <BulkBar n={bulk.sel.size} noun="coupon" onDelete={delSelectedCoupons} onClear={bulk.clear} />
        {store.coupons.length === 0 ? <div className="empty" style={{ padding: '20px 0' }}>No coupons yet.</div> : null}
        {store.coupons.map(c => (
          <div key={c.code} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--rule)' }}>
            <input type="checkbox" style={cbStyle} checked={bulk.has(c.code)} onChange={() => bulk.toggle(c.code)} />
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--saffron-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="tag" size={18} style={{ color: 'var(--saffron)' }} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: 'var(--mono)', fontWeight: 600, fontSize: 13 }}>{c.code}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{c.desc}</div>
            </div>
            <button onClick={() => store.updateCoupon(c.code, { active: !c.active })} title={c.active ? 'Deactivate' : 'Activate'}>
              <span className={'pill ' + (c.active ? 'ok' : 'neutral')}>{c.active ? 'Active' : 'Inactive'}</span>
            </button>
            <button onClick={() => setEditC(c)} title="Edit" style={{ color: 'var(--ink-faint)' }}><Icon name="edit" size={15} /></button>
            <button onClick={() => { if (confirm('Delete coupon ' + c.code + '?')) store.deleteCoupon(c.code); }} title="Delete" style={{ color: 'var(--maroon)' }}><Icon name="close" size={15} /></button>
          </div>
        ))}
        <button className="btn ghost" style={{ marginTop: 14 }} onClick={() => setAddC(true)}><Icon name="plus" size={15} />Create coupon</button>
      </div>
      {addC ? <CouponModal store={store} close={() => setAddC(false)} /> : null}
      {editC ? <CouponModal store={store} coupon={editC} close={() => setEditC(null)} /> : null}
    </div>
  );
}

function CouponModal({ store, close, coupon }) {
  const editing = !!coupon;
  const [code, setCode] = useState(coupon ? coupon.code : '');
  const [type, setType] = useState(coupon ? coupon.type : 'percent');
  const [value, setValue] = useState(coupon ? String(coupon.value) : '');
  const [min, setMin] = useState(coupon ? String(coupon.min) : '0');
  const [freeShip, setFreeShip] = useState(coupon ? !!coupon.freeShip : false);
  const [desc, setDesc] = useState(coupon ? coupon.desc : '');
  const valid = code.trim() && (freeShip || value);
  return (
    <Portal>
      <div className="dscrim" onClick={close}>
        <div className="dmodal" onClick={e => e.stopPropagation()}>
          <div className="dm-head"><h3>{editing ? 'Edit coupon' : 'Create a coupon'}</h3><button onClick={close}><Icon name="close" size={20} /></button></div>
          <div className="dm-body">
            <div className="field"><label>Code</label><input autoFocus disabled={editing} value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="WELCOME10" style={{ fontFamily: 'var(--mono)', letterSpacing: '.04em' }} /></div>
            <div style={{ fontSize: 11.5, fontWeight: 600, margin: '4px 0 8px' }}>Type</div>
            <div style={{ display: 'flex', gap: 7, marginBottom: 12 }}>
              {[['percent', '% off'], ['flat', '₹ off'], ['freeship', 'Free delivery']].map(t => (
                <button key={t[0]} className={'chip' + ((t[0] === 'freeship' ? freeShip : (!freeShip && type === t[0])) ? ' active' : '')}
                  onClick={() => { if (t[0] === 'freeship') { setFreeShip(true); } else { setFreeShip(false); setType(t[0]); } }}>{t[1]}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              {!freeShip ? <div className="field" style={{ flex: 1 }}><label>{type === 'percent' ? 'Percent off' : 'Amount off (₹)'}</label><input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="0" /></div> : null}
              <div className="field" style={{ flex: 1 }}><label>Min order (₹)</label><input type="number" value={min} onChange={e => setMin(e.target.value)} placeholder="0" /></div>
            </div>
            <div className="field"><label>Description</label><input value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. 10% off your first order" /></div>
          </div>
          <div className="dm-foot">
            <button className="btn ghost" onClick={close}>Cancel</button>
            <button className="btn" disabled={!valid} onClick={async () => {
              const payload = { type: freeShip ? 'percent' : type, value: freeShip ? 0 : value, min, desc, freeShip };
              try {
                if (editing) { await store.updateCoupon(coupon.code, payload); store.toast(coupon.code + ' updated'); }
                else { await store.addCoupon({ code, ...payload }); store.toast(code.trim().toUpperCase() + ' created'); }
                close();
              } catch { /* toast shown by store */ }
            }}>{editing ? 'Save changes' : 'Create coupon'}</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/* ---------------- REPORTS / P&L ---------------- */
function ReportsView({ store }) {
  const m = metrics(store);
  const rows = [['Revenue (net of discounts)', m.revenue, 'in'], ['Cost of goods sold', -m.cogs, 'out'], ['Gross profit', m.revenue - m.cogs, 'sub'], ['Operating expenses', -m.exp, 'out'], ['Net profit', m.net, 'total']];
  function runExport(name) {
    const date = new Date().toISOString().slice(0, 10);
    let csv, file;
    if (name === 'Sales report') {
      csv = toCSV(store.orders, [
        { key: 'id', label: 'Order' },
        { label: 'Date', get: o => (o.created_at ? new Date(o.created_at).toLocaleString('en-IN') : '') },
        { key: 'customer', label: 'Customer' }, { key: 'phone', label: 'Phone' },
        { label: 'Items', get: o => o.items.map(i => i.qty + 'x ' + i.name + ' (' + i.size + ')').join('; ') },
        { key: 'subtotal', label: 'Subtotal' }, { key: 'discount', label: 'Discount' }, { key: 'delivery', label: 'Delivery' }, { key: 'total', label: 'Total' },
        { key: 'status', label: 'Status' }, { key: 'pay', label: 'Payment' },
      ]); file = 'sales';
    } else if (name === 'Expense report') {
      csv = toCSV(store.expenses, [{ key: 'date', label: 'Date' }, { key: 'cat', label: 'Category' }, { key: 'payee', label: 'Payee' }, { key: 'note', label: 'Note' }, { key: 'amount', label: 'Amount' }]); file = 'expenses';
    } else if (name === 'Profit & Loss') {
      csv = toCSV(rows.map(r => ({ line: r[0], amount: r[1] })), [{ key: 'line', label: 'Line' }, { key: 'amount', label: 'Amount (INR)' }]); file = 'profit-loss';
    } else if (name === 'Top products') {
      const agg = {}; store.orders.forEach(o => o.items.forEach(i => { agg[i.name] = (agg[i.name] || 0) + i.qty; }));
      const arr = Object.entries(agg).sort((a, b) => b[1] - a[1]).map(([n, q]) => ({ name: n, qty: q }));
      csv = toCSV(arr, [{ key: 'name', label: 'Product' }, { key: 'qty', label: 'Units sold' }]); file = 'top-products';
    } else if (name === 'Customer report') {
      csv = toCSV(store.customers, [{ key: 'name', label: 'Customer' }, { key: 'phone', label: 'Phone' }, { key: 'orders', label: 'Orders' }, { key: 'spent', label: 'Total spent' }, { key: 'last', label: 'Last order' }, { key: 'seg', label: 'Segment' }]); file = 'customers';
    } else {
      csv = toCSV(store.orders, [{ key: 'id', label: 'Order' }, { label: 'Date', get: o => (o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN') : '') }, { key: 'addr', label: 'Address' }, { key: 'delivery', label: 'Delivery fee' }, { key: 'status', label: 'Status' }, { key: 'worker', label: 'Worker' }]); file = 'delivery';
    }
    downloadCSV('srisiri-' + file + '-' + date + '.csv', csv);
    store.toast(name + ' exported');
  }
  return (
    <div className="fade-in g-2-report">
      <div className="card" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <b style={{ fontSize: 16 }}>Profit & Loss</b><span className="pill neutral">This month</span>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 0, marginBottom: 8 }}>Revenue − cost of goods − operating expenses.</p>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderTop: r[2] === 'sub' || r[2] === 'total' ? '1.5px solid var(--rule-2)' : '1px solid var(--rule)', marginTop: r[2] === 'total' ? 4 : 0 }}>
            <span style={{ fontWeight: r[2] === 'total' ? 700 : r[2] === 'sub' ? 600 : 500, fontSize: r[2] === 'total' ? 16 : 14, color: r[2] === 'out' ? 'var(--ink-soft)' : 'var(--ink)' }}>{r[0]}</span>
            <span style={{ fontWeight: 700, fontSize: r[2] === 'total' ? 20 : 14, color: r[2] === 'total' ? 'var(--green)' : r[1] < 0 ? 'var(--maroon)' : 'var(--ink)' }}>{(r[1] < 0 ? '−' : '') + fmt(Math.abs(r[1]))}</span>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <div style={{ flex: 1, background: 'var(--green-soft)', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600 }}>GROSS MARGIN</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)' }}>{m.grossMargin + '%'}</div>
          </div>
          <div style={{ flex: 1, background: 'var(--saffron-soft)', borderRadius: 12, padding: '12px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: 'var(--saffron-d)', fontWeight: 600 }}>NET MARGIN</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--saffron-d)' }}>{m.netMargin + '%'}</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 14 }}>
        <div className="card" style={{ padding: '20px 22px' }}>
          <b style={{ fontSize: 15 }}>Available reports</b>
          <div style={{ marginTop: 10 }}>
            {[['chart', 'Sales report'], ['wallet', 'Expense report'], ['trend', 'Profit & Loss'], ['box', 'Top products'], ['people', 'Customer report'], ['truck', 'Delivery report']].map(r => (
              <button key={r[1]} onClick={() => runExport(r[1])} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '11px 0', borderBottom: '1px solid var(--rule)', textAlign: 'left' }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: 'var(--cream-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={r[0]} size={16} style={{ color: 'var(--saffron)' }} /></div>
                <span style={{ fontWeight: 600, fontSize: 13.5, flex: 1 }}>{r[1]}</span>
                <span style={{ fontSize: 11.5, color: 'var(--saffron-d)', fontWeight: 600 }}>Export CSV</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- SETTINGS ---------------- */
function SettingsView({ store }) {
  const { user, profile, changePassword, signOut } = useAuth();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  async function savePw() {
    if (pw.length < 6 || pw !== pw2) { store.toast(pw !== pw2 ? 'Passwords don’t match' : 'At least 6 characters'); return; }
    setBusy(true);
    const r = await changePassword(pw);
    setBusy(false);
    if (r.ok) { setPw(''); setPw2(''); store.toast('Password updated'); }
    else store.toast(r.error?.message || 'Could not update password');
  }
  return (
    <div className="fade-in g-2" style={{ maxWidth: 820 }}>
      <div className="card" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
          <Icon name="user" size={18} style={{ color: 'var(--saffron)' }} /><b style={{ fontSize: 16 }}>Account</b>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 46, height: 46, borderRadius: 12, background: 'var(--saffron)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 18 }}>{((profile?.name || user?.email || 'A')[0] || 'A').toUpperCase()}</div>
          <div>
            <div style={{ fontWeight: 700 }}>{profile?.name || 'Owner'}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>{user?.email}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Role: {profile?.role}</div>
          </div>
        </div>
        <button className="btn ghost block" style={{ marginTop: 12 }} onClick={async () => { await signOut(); }}>Sign out</button>
      </div>
      <div className="card" style={{ padding: '22px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
          <Icon name="gear" size={18} style={{ color: 'var(--saffron)' }} /><b style={{ fontSize: 16 }}>Change password</b>
        </div>
        <div className="field"><label>New password</label><input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="At least 6 characters" /></div>
        <div className="field"><label>Confirm new password</label><input type="password" value={pw2} onChange={e => setPw2(e.target.value)} placeholder="Re-enter password" /></div>
        <button className="btn" disabled={busy || !pw} onClick={savePw}>{busy ? 'Saving…' : 'Update password'}</button>
      </div>
    </div>
  );
}

/* ---------------- COCKPIT SHELL ---------------- */
export default function OwnerApp({ store }) {
  const [view, setView] = useState('dashboard');
  const [navOpen, setNavOpen] = useState(false);
  const { profile } = useAuth();
  const m = metrics(store);
  const go = (v) => { setView(v); setNavOpen(false); };
  const navItems = [
    ['dashboard', 'Dashboard', 'home'], ['orders', 'Orders', 'receipt'], ['pos', 'Counter Sale', 'tag'], ['products', 'Products', 'box'],
    ['expenses', 'Expenses', 'wallet'], ['reports', 'Reports & P&L', 'chart'],
    null,
    ['workers', 'Workers', 'people'], ['customers', 'Customers', 'user'], ['delivery', 'Delivery & Offers', 'truck'],
  ];
  const titles = {
    dashboard: ['Dashboard', 'Your business at a glance'],
    orders: ['Orders', 'Accept, prepare, and deliver'],
    pos: ['Counter Sale', 'Ring up an in-store sale & send the bill'],
    products: ['Products', 'Manage your catalog & stock'],
    expenses: ['Expenses', 'Track every rupee out'],
    reports: ['Reports & P&L', 'Know your real profit'],
    workers: ['Workers', 'Salaries, advances & attendance'],
    customers: ['Customers', 'Who buys what'],
    delivery: ['Delivery & Offers', 'Rules, coupons & discounts'],
    settings: ['Settings', 'Account & preferences'],
  };
  let body;
  if (view === 'dashboard') body = <Dashboard store={store} nav={setView} />;
  else if (view === 'orders') body = <OrdersView store={store} />;
  else if (view === 'pos') body = <POSView store={store} />;
  else if (view === 'products') body = <ProductsView store={store} />;
  else if (view === 'expenses') body = <ExpensesView store={store} />;
  else if (view === 'reports') body = <ReportsView store={store} />;
  else if (view === 'workers') body = <WorkersView store={store} />;
  else if (view === 'customers') body = <CustomersView store={store} />;
  else if (view === 'delivery') body = <DeliveryView store={store} />;
  else if (view === 'settings') body = <SettingsView store={store} />;
  return (
    <div className="desktop">
      <div className="cockpit">
        <div className={'sidebar' + (navOpen ? ' open' : '')}>
          <div className="sb-brand"><div className="logo">S</div><b>Sri Siri · Owner</b></div>
          <div className="sb-sec">Operations</div>
          {navItems.map((it, i) => it === null ? <div key={'sec' + i} className="sb-sec">Manage</div> : (
            <button key={it[0]} className={'nav-item' + (view === it[0] ? ' active' : '')} onClick={() => go(it[0])}>
              <Icon name={it[2]} size={17} className="ic" /><span>{it[1]}</span>
              {it[0] === 'orders' && m.newCount ? <span className="badge">{m.newCount}</span> : null}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button className={'nav-item' + (view === 'settings' ? ' active' : '')} onClick={() => go('settings')}><Icon name="gear" size={17} className="ic" />Settings</button>
        </div>
        {navOpen ? <div className="sb-scrim" onClick={() => setNavOpen(false)} /> : null}
        <div className="cockpit-main">
          <div className="cm-top">
            <button className="cm-burger" onClick={() => setNavOpen(true)} aria-label="Menu"><Icon name="grid" size={18} /></button>
            <div style={{ flex: 1 }}>
              <h1>{titles[view][0]}</h1>
              <div className="sub">{titles[view][1]}</div>
            </div>
            <div style={{ position: 'relative', marginRight: 6 }}>
              <Icon name="bell" size={20} style={{ color: 'var(--ink-soft)' }} />
              {m.newCount ? <span style={{ position: 'absolute', top: -4, right: -4, width: 8, height: 8, borderRadius: '50%', background: 'var(--maroon)' }} /> : null}
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--saffron)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }} title={profile?.email || ''}>{((profile?.name || profile?.email || 'A')[0] || 'A').toUpperCase()}</div>
          </div>
          <div className="cm-body">{body}</div>
        </div>
      </div>
      {store.toastMsg ? (
        <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 90 }}>
          <div className="toast"><Icon name="checkCircle" size={18} className="t-ic" />{store.toastMsg}</div>
        </div>
      ) : null}
    </div>
  );
}
