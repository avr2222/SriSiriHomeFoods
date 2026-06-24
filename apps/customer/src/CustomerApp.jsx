/* ============================================================
   Sri Siri Home Foods — Customer storefront (phone)
   ============================================================ */
import { useState, useEffect, useRef } from 'react';
import { Icon, fmt, useAuth } from '@sri/shared';

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
  r = Math.max(0, Math.min(255, r)); g = Math.max(0, Math.min(255, g)); b = Math.max(0, Math.min(255, b));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

export function PImg({ p, h, big }) {
  const bg = p.image_url
    ? `center/cover no-repeat url(${JSON.stringify(p.image_url)})`
    : `linear-gradient(150deg,${p.tint},${shade(p.tint, -18)})`;
  return (
    <div className="pimg" style={{ height: h, background: bg }}>
      {!p.image_url ? <div className="ph-cam"><Icon name="camera" size={13} style={{ color: p.tint }} /></div> : null}
      {!p.image_url ? <div className="ph-label" style={{ fontSize: big ? 20 : 13 }}>{p.name}</div> : null}
    </div>
  );
}

function StockBadge({ p }) {
  const m = { in: null, limited: ['warn', 'Limited stock'], out: ['err', 'Out of stock'], mto: ['ok', 'Made to order'], seasonal: ['neutral', 'Seasonal'] };
  const v = m[p.stockState];
  if (!v) return null;
  return <span className={'pill ' + v[0]}>{v[1]}</span>;
}

/* ---------------- HOME ---------------- */
function Home({ store, go }) {
  const feat = store.products.filter(p => p.badge === 'Bestseller').slice(0, 4);
  const fresh = store.products.filter(p => p.stockState === 'mto' || p.stockState === 'seasonal').slice(0, 4);
  return (
    <div className="fade-in" style={{ paddingBottom: 18 }}>
      <div style={{ padding: '4px 18px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontWeight: 600 }}>Namaste 🙏</div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.01em' }}>What’s cooking today?</div>
          </div>
          <button onClick={() => go('account')} style={{ width: 42, height: 42, borderRadius: 12, background: 'var(--paper)', border: '1px solid var(--rule)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="user" size={20} style={{ color: 'var(--ink-soft)' }} />
          </button>
        </div>
      </div>
      {/* hero */}
      <div style={{ padding: '0 18px' }}>
        <div onClick={() => go('shop', 'pickles')} style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', background: 'linear-gradient(135deg,#8a2a33,#b5453f)', padding: '20px 20px 22px', color: '#fff', boxShadow: 'var(--sh-md)', cursor: 'pointer' }}>
          <div style={{ position: 'absolute', right: -10, top: -10, opacity: .16 }}><Icon name="fire" size={140} fill="current" /></div>
          <span className="pill" style={{ background: 'rgba(255,255,255,.22)', color: '#fff' }}>Made fresh this week</span>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 27, fontWeight: 600, lineHeight: 1.1, margin: '10px 0 4px', maxWidth: '80%' }}>Avakaya season is here</div>
          <div style={{ fontSize: 13, opacity: .9, marginBottom: 14 }}>Sun-matured mango pickle, small batches</div>
          <span className="btn sm" style={{ background: '#fff', color: '#8a2a33' }}>Shop pickles<Icon name="chevR" size={15} /></span>
        </div>
      </div>
      {/* categories */}
      <div style={{ padding: '18px 0 4px' }}>
        <div style={{ padding: '0 18px', fontSize: 14, fontWeight: 700, marginBottom: 11 }}>Categories</div>
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 18px 4px', scrollbarWidth: 'none' }}>
          {store.categories.map(c => (
            <button key={c.id} onClick={() => go('shop', c.id)} style={{ flex: '0 0 auto', width: 74, textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: 18, background: c.tint + '1f', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px', border: '1px solid ' + c.tint + '33' }}>
                <Icon name={c.icon} size={26} style={{ color: c.tint }} />
              </div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--ink-soft)' }}>{c.name}</div>
            </button>
          ))}
        </div>
      </div>
      {/* free delivery strip */}
      <div style={{ padding: '12px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, background: 'var(--green-soft)', border: '1px solid #cfe2d6', borderRadius: 14, padding: '12px 14px' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}><Icon name="truck" size={18} style={{ color: '#fff' }} /></div>
          <div style={{ fontSize: 12.5, color: 'var(--green)', fontWeight: 600, lineHeight: 1.3 }}>Free delivery on orders over <b>{fmt(store.delivery.freeThreshold)}</b> — no code needed</div>
        </div>
      </div>
      <Section title="Bestsellers" items={feat} go={go} />
      <Section title="Fresh & seasonal" items={fresh} go={go} />
    </div>
  );
}

function Section({ title, items, go }) {
  return (
    <div style={{ padding: '6px 0 4px' }}>
      <div style={{ padding: '0 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 11 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
        <button onClick={() => go('shop')} style={{ fontSize: 12, color: 'var(--saffron)', fontWeight: 600 }}>See all</button>
      </div>
      <div style={{ display: 'flex', gap: 13, overflowX: 'auto', padding: '0 18px 6px', scrollbarWidth: 'none' }}>
        {items.map(p => (
          <div key={p.id} onClick={() => go('product', p.id)} style={{ flex: '0 0 auto', width: 150, cursor: 'pointer' }}>
            <div className="card" style={{ overflow: 'hidden' }}>
              <PImg p={p} h={110} />
              <div style={{ padding: '9px 11px 11px' }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.25, minHeight: 31 }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '5px 0' }}>
                  <Icon name="star" size={12} fill="current" style={{ color: 'var(--gold)' }} />
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{p.rating}</span>
                  <span style={{ fontSize: 10.5, color: 'var(--ink-faint)' }}>({p.reviews})</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--saffron)' }}>{fmt(p.variants[0].price)}<span style={{ fontSize: 10, color: 'var(--ink-faint)', fontWeight: 500 }}>{' / ' + p.variants[0].size}</span></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- SHOP ---------------- */
function Shop({ store, go, initialCat }) {
  const [cat, setCat] = useState(initialCat || 'all');
  const [q, setQ] = useState('');
  let list = store.products;
  if (cat !== 'all') list = list.filter(p => p.cat === cat);
  if (q) list = list.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fade-in">
      <div style={{ padding: '4px 18px 10px' }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 11 }}>Shop</div>
        <div style={{ position: 'relative' }}>
          <Icon name="search" size={18} style={{ position: 'absolute', left: 13, top: 12, color: 'var(--ink-faint)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search pickles, sweets, podi…" style={{ width: '100%', padding: '11px 13px 11px 40px', borderRadius: 12, border: '1.5px solid var(--rule-2)', fontSize: 14, background: 'var(--paper)' }} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '2px 18px 12px', scrollbarWidth: 'none' }}>
        <button className={'chip' + (cat === 'all' ? ' active' : '')} onClick={() => setCat('all')}>All</button>
        {store.categories.map(c => <button key={c.id} className={'chip' + (cat === c.id ? ' active' : '')} onClick={() => setCat(c.id)}>{c.name}</button>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13, padding: '0 18px 18px' }}>
        {list.map(p => (
          <div key={p.id} onClick={() => go('product', p.id)} style={{ cursor: 'pointer' }}>
            <div className="card" style={{ overflow: 'hidden', height: '100%', opacity: p.stockState === 'out' ? .6 : 1 }}>
              <div style={{ position: 'relative' }}>
                <PImg p={p} h={108} />
                {p.badge ? <span className="pill solid-s" style={{ position: 'absolute', top: 8, left: 8 }}>{p.badge}</span> : null}
              </div>
              <div style={{ padding: '9px 11px 11px' }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.25, minHeight: 31 }}>{p.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '5px 0 6px' }}>
                  <Icon name="star" size={12} fill="current" style={{ color: 'var(--gold)' }} />
                  <span style={{ fontSize: 11, fontWeight: 600 }}>{p.rating}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--saffron)' }}>{fmt(p.variants[0].price)}</div>
                  {p.stockState === 'out' ? <StockBadge p={p} /> : (
                    <div style={{ width: 28, height: 28, borderRadius: 9, background: 'var(--saffron)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="plus" size={16} style={{ color: '#fff' }} /></div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {list.length === 0 ? <div className="empty">No items found.</div> : null}
    </div>
  );
}

/* ---------------- PRODUCT DETAIL ---------------- */
function Product({ store, go, pid }) {
  const p = store.products.find(x => x.id === pid);
  const [vi, setVi] = useState(0);
  const [qty, setQty] = useState(1);
  if (!p) return null;
  const v = p.variants[vi];
  const soldOut = p.stockState === 'out';
  return (
    <div className="fade-in">
      <div style={{ position: 'relative' }}>
        <PImg p={p} h={280} big />
        <button onClick={() => go('shop')} style={{ position: 'absolute', top: 14, left: 14, width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--sh-sm)' }}><Icon name="back" size={19} /></button>
        <button style={{ position: 'absolute', top: 14, right: 14, width: 38, height: 38, borderRadius: 12, background: 'rgba(255,255,255,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--sh-sm)' }}><Icon name="heart" size={18} style={{ color: 'var(--maroon)' }} /></button>
      </div>
      <div style={{ padding: '16px 18px 0' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          {p.badge ? <span className="pill solid-s">{p.badge}</span> : null}
          <StockBadge p={p} />
          {p.season ? <span className="pill neutral">{p.season}</span> : null}
        </div>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 23, fontWeight: 600, lineHeight: 1.15 }}>{p.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '8px 0 12px' }}>
          <Icon name="star" size={15} fill="current" style={{ color: 'var(--gold)' }} />
          <span style={{ fontWeight: 700, fontSize: 14 }}>{p.rating}</span>
          <span style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>{p.reviews + ' reviews'}</span>
        </div>
        <p style={{ fontFamily: 'var(--serif)', fontSize: 14.5, color: 'var(--ink-soft)', lineHeight: 1.55, marginTop: 0 }}>{p.desc}</p>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', margin: '8px 0 8px' }}>Choose size</div>
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
          {p.variants.map((vv, i) => (
            <button key={i} onClick={() => setVi(i)} style={{ flex: '0 0 auto', padding: '9px 13px', borderRadius: 12, border: '1.5px solid ' + (i === vi ? 'var(--saffron)' : 'var(--rule-2)'), background: i === vi ? 'var(--saffron-soft)' : 'var(--paper)', textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: i === vi ? 'var(--saffron-d)' : 'var(--ink)' }}>{vv.size}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--saffron)' }}>{fmt(vv.price)}</div>
            </button>
          ))}
        </div>
        {v.mto ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 13, fontSize: 12.5, color: 'var(--green)', fontWeight: 600 }}>
            <Icon name="clock" size={15} />Made fresh to order · ready in ~1 day
          </div>
        ) : null}
      </div>
      {/* sticky add bar */}
      <div style={{ position: 'sticky', bottom: 0, marginTop: 18, padding: '13px 18px', background: 'var(--cream)', borderTop: '1px solid var(--rule)', display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, border: '1.5px solid var(--rule-2)', borderRadius: 12, padding: '7px 12px', background: 'var(--paper)' }}>
          <button onClick={() => setQty(Math.max(1, qty - 1))}><Icon name="minus" size={17} /></button>
          <span style={{ fontWeight: 700, fontSize: 15, minWidth: 16, textAlign: 'center' }}>{qty}</span>
          <button onClick={() => setQty(qty + 1)}><Icon name="plus" size={17} /></button>
        </div>
        <button className="btn" disabled={soldOut} style={{ flex: 1 }} onClick={() => { store.cartActions.add(p.id, vi, qty); store.toast('Added ' + qty + ' × ' + p.name); go('shop'); }}>
          {soldOut ? 'Out of stock' : 'Add · ' + fmt(v.price * qty)}
        </button>
      </div>
    </div>
  );
}

/* ---------------- CART ---------------- */
function Row({ l, v, col }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: 13.5 }}>
      <span className="muted">{l}</span>
      <span style={{ fontWeight: 600, color: col || 'var(--ink)' }}>{v}</span>
    </div>
  );
}

function Cart({ store, go }) {
  const [code, setCode] = useState('');
  const c = store.cart, lines = store.cartLines();
  const t = store.cartTotals();
  const remaining = store.delivery.freeThreshold - t.subtotal;
  if (lines.length === 0) {
    return (
      <div className="fade-in" style={{ padding: '40px 24px', textAlign: 'center' }}>
        <div style={{ width: 74, height: 74, borderRadius: 22, background: 'var(--cream-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '30px auto 16px' }}><Icon name="cart" size={34} style={{ color: 'var(--ink-faint)' }} /></div>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Your cart is empty</div>
        <div style={{ fontSize: 13.5, color: 'var(--ink-faint)', marginBottom: 20 }}>Add some homemade goodness to get started.</div>
        <button className="btn" onClick={() => go('shop')}>Browse the shop</button>
      </div>
    );
  }
  return (
    <div className="fade-in" style={{ paddingBottom: 14 }}>
      <div style={{ padding: '4px 18px 10px', fontSize: 20, fontWeight: 700 }}>Your cart</div>
      {/* free delivery meter */}
      <div style={{ padding: '0 18px 14px' }}>
        <div style={{ background: remaining <= 0 ? 'var(--green-soft)' : 'var(--saffron-soft)', border: '1px solid ' + (remaining <= 0 ? '#cfe2d6' : '#f0dcc2'), borderRadius: 14, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 600, color: remaining <= 0 ? 'var(--green)' : 'var(--saffron-d)', marginBottom: 8 }}>
            <Icon name="truck" size={16} />
            {remaining <= 0 ? 'You’ve unlocked free delivery! 🎉' : 'Add ' + fmt(remaining) + ' more for FREE delivery'}
          </div>
          <div className="meter"><i style={{ width: Math.min(100, t.subtotal / store.delivery.freeThreshold * 100) + '%' }} /></div>
        </div>
      </div>
      <div style={{ padding: '0 18px' }}>
        {lines.map((ln, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid var(--rule)' }}>
            <div style={{ width: 62, height: 62, borderRadius: 12, overflow: 'hidden', flex: '0 0 auto' }}><PImg p={ln.p} h={62} /></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.25 }}>{ln.p.name}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-faint)', margin: '2px 0 7px' }}>{ln.v.size + ' · ' + fmt(ln.v.price)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 11, border: '1px solid var(--rule-2)', borderRadius: 9, padding: '4px 9px' }}>
                  <button onClick={() => store.cartActions.setQty(i, ln.qty - 1)}><Icon name={ln.qty <= 1 ? 'close' : 'minus'} size={14} /></button>
                  <span style={{ fontWeight: 700, fontSize: 13, minWidth: 14, textAlign: 'center' }}>{ln.qty}</span>
                  <button onClick={() => store.cartActions.setQty(i, ln.qty + 1)}><Icon name="plus" size={14} /></button>
                </div>
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{fmt(ln.v.price * ln.qty)}</div>
          </div>
        ))}
      </div>
      {/* coupon */}
      <div style={{ padding: '14px 18px' }}>
        {c.coupon ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--green-soft)', border: '1px dashed var(--green)', borderRadius: 12, padding: '11px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <Icon name="tag" size={16} style={{ color: 'var(--green)' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--green)' }}>{c.coupon.code}</div>
                <div style={{ fontSize: 11, color: 'var(--green)' }}>{c.coupon.desc}</div>
              </div>
            </div>
            <button onClick={() => store.cartActions.removeCoupon()} style={{ fontSize: 12, fontWeight: 600, color: 'var(--maroon)' }}>Remove</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Icon name="tag" size={16} style={{ position: 'absolute', left: 12, top: 13, color: 'var(--ink-faint)' }} />
              <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="Coupon code" style={{ width: '100%', padding: '11px 12px 11px 36px', borderRadius: 11, border: '1.5px solid var(--rule-2)', fontSize: 13.5, letterSpacing: '.04em' }} />
            </div>
            <button className="btn ghost sm" onClick={() => { const r = store.cartActions.applyCoupon(code); store.toast(r.ok ? 'Coupon applied 🎉' : r.msg); }}>Apply</button>
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
          {store.coupons.map(cp => <button key={cp.code} onClick={() => setCode(cp.code)} style={{ fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 600, padding: '4px 9px', border: '1px dashed var(--rule-2)', borderRadius: 8, color: 'var(--saffron-d)' }}>{cp.code}</button>)}
        </div>
      </div>
      {/* totals */}
      <div style={{ padding: '4px 18px 0' }}>
        <Row l="Subtotal" v={fmt(t.subtotal)} />
        {t.discount > 0 ? <Row l="Discount" v={' −' + fmt(t.discount)} col="var(--green)" /> : null}
        <Row l="Delivery" v={t.delivery === 0 ? 'FREE' : fmt(t.delivery)} col={t.delivery === 0 ? 'var(--green)' : null} />
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0 4px', marginTop: 6, borderTop: '1.5px solid var(--rule-2)' }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Total</span>
          <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--saffron)' }}>{fmt(t.total)}</span>
        </div>
      </div>
      <div style={{ padding: '14px 18px' }}>
        <button className="btn block" onClick={() => go('checkout')}>Checkout · {fmt(t.total)}<Icon name="chevR" size={17} /></button>
      </div>
    </div>
  );
}

/* ---------------- CHECKOUT ---------------- */
function Block({ title, icon, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, marginBottom: 9 }}>
        <Icon name={icon} size={16} style={{ color: 'var(--saffron)' }} />{title}
      </div>
      {children}
    </div>
  );
}

function Checkout({ store, go }) {
  const t = store.cartTotals();
  const [addr, setAddr] = useState(0);
  const [pay, setPay] = useState('UPI');
  const [slot, setSlot] = useState('asap');
  const [phone, setPhone] = useState(store.user?.phone || '');
  const [placing, setPlacing] = useState(false);
  const addresses = [
    { label: 'Home', text: 'Road 12, Jubilee Hills, Hyderabad 500033' },
    { label: 'Office', text: 'HITEC City, Madhapur, Hyderabad 500081' },
  ];
  const phoneOk = phone.replace(/\D/g, '').length >= 10;
  async function place() {
    if (!store.user) { store.toast('Please log in to place your order'); go('account'); return; }
    if (!phoneOk) { store.toast('Add a contact number for delivery'); return; }
    setPlacing(true);
    try {
      const id = await store.placeOrder(addresses[addr].text, pay, phone);
      go('order', id);
    } catch {
      // toast already shown by store.placeOrder
    } finally {
      setPlacing(false);
    }
  }
  return (
    <div className="fade-in" style={{ paddingBottom: 14 }}>
      <div style={{ padding: '4px 18px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => go('cart')}><Icon name="back" size={20} /></button>
        <div style={{ fontSize: 19, fontWeight: 700 }}>Checkout</div>
      </div>
      <div style={{ padding: '0 18px' }}>
        <Block title="Delivery address" icon="pin">
          {addresses.map((a, i) => (
            <button key={i} onClick={() => setAddr(i)} style={{ display: 'flex', gap: 11, width: '100%', textAlign: 'left', padding: '11px 12px', borderRadius: 12, border: '1.5px solid ' + (addr === i ? 'var(--saffron)' : 'var(--rule)'), background: addr === i ? 'var(--saffron-soft)' : 'var(--paper)', marginBottom: 8 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid ' + (addr === i ? 'var(--saffron)' : 'var(--rule-2)'), background: addr === i ? 'var(--saffron)' : 'transparent', flex: '0 0 auto', marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{addr === i ? <Icon name="check" size={11} style={{ color: '#fff' }} /> : null}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{a.label}</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 1 }}>{a.text}</div>
              </div>
            </button>
          ))}
          <button className="chip" style={{ marginTop: 2 }}><Icon name="plus" size={14} />Add new address</button>
        </Block>
        <Block title="Contact number" icon="phone">
          <input value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d]/g, ''))} maxLength={10} placeholder="10-digit mobile for delivery updates" style={{ width: '100%', padding: '11px 13px', border: '1.5px solid ' + (phone && !phoneOk ? 'var(--err)' : 'var(--rule-2)'), borderRadius: 10, fontSize: 14 }} />
        </Block>
        <Block title="When" icon="clock">
          <div style={{ display: 'flex', gap: 9 }}>
            {['asap', 'today', 'tomorrow'].map(s => (
              <button key={s} onClick={() => setSlot(s)} className={'chip' + (slot === s ? ' active' : '')} style={{ flex: 1, justifyContent: 'center' }}>
                {s === 'asap' ? 'As soon as ready' : s === 'today' ? 'Today eve' : 'Tomorrow'}
              </button>
            ))}
          </div>
        </Block>
        <Block title="Payment" icon="wallet">
          {['UPI', 'Cash on Delivery'].map(m => (
            <button key={m} onClick={() => setPay(m)} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', padding: '12px', borderRadius: 12, border: '1.5px solid ' + (pay === m ? 'var(--saffron)' : 'var(--rule)'), background: pay === m ? 'var(--saffron-soft)' : 'var(--paper)', marginBottom: 8 }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid ' + (pay === m ? 'var(--saffron)' : 'var(--rule-2)'), background: pay === m ? 'var(--saffron)' : 'transparent', flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{pay === m ? <Icon name="check" size={11} style={{ color: '#fff' }} /> : null}</div>
              <Icon name={m === 'UPI' ? 'bolt' : 'wallet'} size={18} style={{ color: 'var(--ink-soft)' }} />
              <div style={{ fontWeight: 600, fontSize: 13.5 }}>{m}</div>
              {m === 'UPI' ? <span className="pill ok" style={{ marginLeft: 'auto' }}>Instant</span> : null}
            </button>
          ))}
        </Block>
        <div className="card" style={{ padding: '14px 16px', marginTop: 4 }}>
          <Row l="Subtotal" v={fmt(t.subtotal)} />
          {t.discount > 0 ? <Row l="Discount" v={' −' + fmt(t.discount)} col="var(--green)" /> : null}
          <Row l="Delivery" v={t.delivery === 0 ? 'FREE' : fmt(t.delivery)} col={t.delivery === 0 ? 'var(--green)' : null} />
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 9, marginTop: 5, borderTop: '1px solid var(--rule)' }}>
            <span style={{ fontWeight: 700 }}>Total</span>
            <span style={{ fontWeight: 700, color: 'var(--saffron)', fontSize: 16 }}>{fmt(t.total)}</span>
          </div>
        </div>
      </div>
      <div style={{ padding: '14px 18px' }}>
        <button className="btn block" disabled={placing || !phoneOk} onClick={place}>{placing ? 'Placing order…' : 'Place order · ' + fmt(t.total)}</button>
      </div>
    </div>
  );
}

/* ---------------- ORDER TRACKING ---------------- */
function OrderTrack({ store, go, oid }) {
  const o = store.orders.find(x => x.id === oid);
  if (!o) return null;
  const steps = [['new', 'Order placed'], ['preparing', 'Preparing'], ['out', 'Out for delivery'], ['delivered', 'Delivered']];
  const idx = steps.findIndex(s => s[0] === o.status);
  return (
    <div className="fade-in" style={{ paddingBottom: 18 }}>
      <div style={{ textAlign: 'center', padding: '30px 24px 18px' }}>
        <div style={{ width: 78, height: 78, borderRadius: '50%', background: 'var(--green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><Icon name="checkCircle" size={40} style={{ color: 'var(--green)' }} /></div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Order confirmed!</div>
        <div style={{ fontSize: 13.5, color: 'var(--ink-faint)', marginTop: 4 }}>Order <b style={{ color: 'var(--ink)' }}>{o.id}</b> · {o.pay}</div>
      </div>
      <div style={{ padding: '0 26px' }}>
        {steps.map((s, i) => (
          <div key={s[0]} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: i <= idx ? 'var(--green)' : 'var(--cream-2)', border: '2px solid ' + (i <= idx ? 'var(--green)' : 'var(--rule-2)'), display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                {i <= idx ? <Icon name="check" size={14} style={{ color: '#fff' }} /> : <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)' }}>{i + 1}</span>}
              </div>
              {i < steps.length - 1 ? <div style={{ width: 2, height: 34, background: i < idx ? 'var(--green)' : 'var(--rule-2)' }} /> : null}
            </div>
            <div style={{ paddingTop: 2, paddingBottom: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: i <= idx ? 'var(--ink)' : 'var(--ink-faint)' }}>{s[1]}</div>
              {i === idx ? <div style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, marginTop: 2 }}>In progress · ETA ~40 min</div> : null}
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '4px 18px' }}>
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 9 }}>{o.items.length + ' item' + (o.items.length > 1 ? 's' : '')}</div>
          {o.items.map((it, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
              <span>{it.qty + ' × ' + it.name + ' '}<span className="muted">{'(' + it.size + ')'}</span></span>
              <span style={{ fontWeight: 600 }}>{fmt(it.price * it.qty)}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 9, marginTop: 7, borderTop: '1px solid var(--rule)', fontWeight: 700 }}>
            <span>Total</span><span style={{ color: 'var(--saffron)' }}>{fmt(o.total)}</span>
          </div>
        </div>
      </div>
      <div style={{ padding: '12px 18px', display: 'flex', gap: 10 }}>
        <button className="btn ghost" style={{ flex: 1 }} onClick={() => go('orders')}>My orders</button>
        <button className="btn" style={{ flex: 1 }} onClick={() => go('home')}>Continue shopping</button>
      </div>
    </div>
  );
}

/* ---------------- ORDERS LIST ---------------- */
function statusPill(s) { return { new: 'warn', preparing: 'warn', out: 'ok', delivered: 'ok', cancelled: 'err' }[s] || 'neutral'; }
function statusLabel(s) { return { new: 'Placed', preparing: 'Preparing', out: 'On the way', delivered: 'Delivered', cancelled: 'Cancelled' }[s] || s; }

function Orders({ store, go }) {
  const mine = store.orders.filter(o => o.mine);
  return (
    <div className="fade-in">
      <div style={{ padding: '4px 18px 12px', fontSize: 20, fontWeight: 700 }}>My orders</div>
      {mine.length === 0 ? <div className="empty">No orders yet. Your placed orders will appear here.</div> : (
        <div style={{ padding: '0 18px 18px' }}>
          {mine.map(o => (
            <div key={o.id} onClick={() => go('order', o.id)} className="card" style={{ padding: '13px 15px', marginBottom: 11, cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{o.id}</span>
                <span className={'pill ' + statusPill(o.status)}>{statusLabel(o.status)}</span>
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginBottom: 8 }}>{o.items.map(i => i.qty + '× ' + i.name).join(', ')}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>{o.time}</span>
                <span style={{ fontWeight: 700, color: 'var(--saffron)' }}>{fmt(o.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- ACCOUNT / LOGIN ---------------- */
function Account({ store, go }) {
  const { user, profile, signUpWithEmail, signInWithEmail, signInWithGoogle, signOut } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    const r = mode === 'signup'
      ? await signUpWithEmail(email, password, name)
      : await signInWithEmail(email, password);
    setBusy(false);
    if (!r.ok) { store.toast(r.error?.message || 'Something went wrong'); return; }
    if (r.needsConfirm) store.toast('Check your email to confirm your account');
    else store.toast('Welcome! 👋');
  }

  if (user) {
    const dispName = profile?.name || user.email || 'Your account';
    const sub = profile?.email || user.email || '';
    return (
      <div className="fade-in" style={{ padding: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--saffron)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 22, color: '#fff' }}>{(dispName[0] || 'U').toUpperCase()}</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{dispName}</div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-faint)' }}>{sub}</div>
          </div>
        </div>
        {[['receipt', 'My orders', 'orders'], ['pin', 'Saved addresses'], ['heart', 'Favourites'], ['bell', 'Notifications'], ['gear', 'Settings']].map(r => (
          <button key={r[1]} onClick={() => r[2] && go(r[2])} className="card" style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', padding: '14px 15px', marginBottom: 9, textAlign: 'left' }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--cream-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name={r[0]} size={18} style={{ color: 'var(--saffron)' }} /></div>
            <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{r[1]}</span>
            <Icon name="chevR" size={17} style={{ color: 'var(--ink-faint)' }} />
          </button>
        ))}
        <button onClick={async () => { await signOut(); setMode('login'); setEmail(''); setPassword(''); setName(''); store.toast('Logged out'); }} style={{ width: '100%', padding: '13px', color: 'var(--maroon)', fontWeight: 600, fontSize: 14, marginTop: 6 }}>Log out</button>
      </div>
    );
  }

  const canSubmit = email.includes('@') && password.length >= 6 && (mode === 'login' || name.trim()) && !busy;
  return (
    <div className="fade-in" style={{ padding: '28px 22px' }}>
      <div style={{ width: 54, height: 54, borderRadius: 16, background: 'var(--saffron)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 24, color: '#fff', marginBottom: 18 }}>S</div>
      <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.15 }}>{mode === 'signup' ? 'Create your account' : 'Welcome back'}</div>
      <div style={{ fontSize: 13.5, color: 'var(--ink-faint)', margin: '6px 0 22px' }}>{mode === 'signup' ? 'Sign up to order homemade goodness.' : 'Log in to continue.'}</div>
      {mode === 'signup' ? (
        <div className="field"><label>Your name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Priya Sharma" /></div>
      ) : null}
      <div className="field"><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" /></div>
      <div className="field"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" /></div>
      <button className="btn block" disabled={!canSubmit} onClick={onSubmit} style={{ marginTop: 6 }}>{busy ? 'Please wait…' : (mode === 'signup' ? 'Sign up' : 'Log in')}</button>
      <div style={{ textAlign: 'center', color: 'var(--ink-faint)', fontSize: 12, margin: '16px 0' }}>or</div>
      <button className="btn ghost block" onClick={() => signInWithGoogle()}><Icon name="google" size={17} />Continue with Google</button>
      <div style={{ textAlign: 'center', fontSize: 13, color: 'var(--ink-faint)', marginTop: 18 }}>
        {mode === 'signup' ? 'Already have an account? ' : 'New here? '}
        <button onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')} style={{ color: 'var(--saffron)', fontWeight: 700 }}>{mode === 'signup' ? 'Log in' : 'Create one'}</button>
      </div>
    </div>
  );
}

/* ---------------- BOTTOM NAV ---------------- */
function BottomNav({ view, go, count }) {
  const tabs = [['home', 'Home', 'home'], ['shop', 'Shop', 'shop'], ['cart', 'Cart', 'cart'], ['orders', 'Orders', 'receipt'], ['account', 'You', 'user']];
  return (
    <div style={{ flex: '0 0 auto', display: 'flex', background: 'var(--paper)', borderTop: '1px solid var(--rule)', padding: '7px 6px 10px' }}>
      {tabs.map(t => {
        const active = view === t[0] || (t[0] === 'shop' && view === 'product') || (t[0] === 'orders' && view === 'order');
        return (
          <button key={t[0]} onClick={() => go(t[0])} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '4px 0', position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <Icon name={t[2]} size={22} fill={active && t[0] === 'cart' ? 'current' : 'none'} style={{ color: active ? 'var(--saffron)' : 'var(--ink-faint)' }} />
              {t[0] === 'cart' && count > 0 ? <span style={{ position: 'absolute', top: -6, right: -9, background: 'var(--maroon)', color: '#fff', fontSize: 9.5, fontWeight: 700, minWidth: 16, height: 16, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{count}</span> : null}
            </div>
            <span style={{ fontSize: 10, fontWeight: 600, color: active ? 'var(--saffron)' : 'var(--ink-faint)' }}>{t[1]}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- ROOT ---------------- */
export default function CustomerApp({ store }) {
  const [nav, setNav] = useState({ view: 'home', param: null });
  const scrollRef = useRef(null);
  function go(view, param) { setNav({ view, param }); if (scrollRef.current) scrollRef.current.scrollTop = 0; }
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollTop = 0; }, [nav]);
  const v = nav.view;
  let screen;
  if (v === 'home') screen = <Home store={store} go={go} />;
  else if (v === 'shop') screen = <Shop store={store} go={go} initialCat={nav.param} />;
  else if (v === 'product') screen = <Product store={store} go={go} pid={nav.param} />;
  else if (v === 'cart') screen = <Cart store={store} go={go} />;
  else if (v === 'checkout') screen = <Checkout store={store} go={go} />;
  else if (v === 'order') screen = <OrderTrack store={store} go={go} oid={nav.param} />;
  else if (v === 'orders') screen = <Orders store={store} go={go} />;
  else if (v === 'account') screen = <Account store={store} go={go} />;
  const count = store.cartCount();
  const showNav = !['product', 'checkout'].includes(v);
  return (
    <div className="appshell">
      <div className="app-scroll" ref={scrollRef}>{screen}</div>
      {showNav ? <BottomNav view={v} go={go} count={count} /> : null}
      {store.toastMsg ? (
        <div className="toast-wrap"><div className="toast"><Icon name="checkCircle" size={18} className="t-ic" />{store.toastMsg}</div></div>
      ) : null}
    </div>
  );
}
