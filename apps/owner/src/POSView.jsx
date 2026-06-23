/* ============================================================
   Sri Siri Home Foods — Counter Sale / POS (owner desktop)
   ============================================================ */
import { useState } from 'react';
import { Icon, fmt } from '@sri/shared';

export default function POSView({ store }) {
  const [lines, setLines] = useState([]); // {key,name,size,price,cost,qty}
  const [q, setQ] = useState('');
  const [cust, setCust] = useState('');
  const [phone, setPhone] = useState('');
  const [pay, setPay] = useState('Cash');
  const [discount, setDiscount] = useState('');
  const [bill, setBill] = useState(null);

  function addVariant(p, vi) {
    setLines(ls => {
      const k = p.id + '-' + vi;
      const i = ls.findIndex(l => l.key === k);
      if (i >= 0) { const n = [...ls]; n[i] = { ...n[i], qty: n[i].qty + 1 }; return n; }
      const v = p.variants[vi];
      return [...ls, { key: k, name: p.name, size: v.size, price: v.price, cost: v.cost, qty: 1 }];
    });
  }
  const setQty = (i, d) => setLines(ls => { const n = [...ls]; n[i] = { ...n[i], qty: n[i].qty + d }; return n.filter(l => l.qty > 0); });
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const total = Math.max(0, subtotal - (+discount || 0));

  let list = store.products.filter(p => p.stockState !== 'out');
  if (q) list = list.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));

  async function generate() {
    const items = lines.map(l => ({ name: l.name, size: l.size, qty: l.qty, price: l.price, cost: l.cost }));
    try {
      const order = await store.counterSale({ items, customer: cust, phone, pay, discount });
      setBill(order);
      store.toast('Bill ' + order.id + ' generated');
    } catch {
      // toast already shown by store.counterSale
    }
  }
  function reset() { setLines([]); setCust(''); setPhone(''); setDiscount(''); setPay('Cash'); setBill(null); }

  if (bill) return <BillReceipt store={store} bill={bill} reset={reset} />;

  return (
    <div className="fade-in" style={{ display: 'grid', gridTemplateColumns: '1.25fr 380px', gap: 16, alignItems: 'start' }}>
      {/* ---- product picker ---- */}
      <div className="card" style={{ padding: '16px 18px' }}>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <Icon name="search" size={17} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--ink-faint)' }} />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search products to add…" style={{ width: '100%', padding: '10px 12px 10px 38px', borderRadius: 10, border: '1.5px solid var(--rule-2)', fontSize: 14 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxHeight: 520, overflowY: 'auto' }}>
          {list.map(p => (
            <div key={p.id} style={{ border: '1px solid var(--rule)', borderRadius: 11, padding: '11px 12px' }}>
              <div style={{ display: 'flex', gap: 9, alignItems: 'center', marginBottom: 9 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, flex: '0 0 auto', background: `linear-gradient(150deg,${p.tint},${p.tint}cc)` }} />
                <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.2 }}>{p.name}</div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {p.variants.map((v, vi) => (
                  <button key={vi} onClick={() => addVariant(p, vi)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 9px', borderRadius: 8, border: '1.5px solid var(--rule-2)', background: 'var(--cream)', fontSize: 11.5, fontWeight: 600 }}>
                    <Icon name="plus" size={12} style={{ color: 'var(--saffron)' }} />{v.size}{' · ' + fmt(v.price)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* ---- bill builder ---- */}
      <div className="card" style={{ padding: '18px 20px', position: 'sticky', top: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <Icon name="receipt" size={18} style={{ color: 'var(--saffron)' }} /><b style={{ fontSize: 16 }}>Counter sale</b>
        </div>
        {lines.length === 0 ? <div className="empty" style={{ padding: '26px 10px' }}>Tap a product size to add it to the bill.</div> : (
          <div style={{ marginBottom: 8 }}>
            {lines.map((l, i) => (
              <div key={l.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--rule)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.2 }}>{l.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>{l.size + ' · ' + fmt(l.price)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, border: '1px solid var(--rule-2)', borderRadius: 8, padding: '3px 8px' }}>
                  <button onClick={() => setQty(i, -1)}><Icon name={l.qty <= 1 ? 'close' : 'minus'} size={13} /></button>
                  <span style={{ fontWeight: 700, fontSize: 13, minWidth: 14, textAlign: 'center' }}>{l.qty}</span>
                  <button onClick={() => setQty(i, 1)}><Icon name="plus" size={13} /></button>
                </div>
                <div style={{ fontWeight: 700, fontSize: 13, width: 56, textAlign: 'right' }}>{fmt(l.price * l.qty)}</div>
              </div>
            ))}
          </div>
        )}
        {/* customer + payment */}
        <div style={{ display: 'flex', gap: 9, marginTop: 12 }}>
          <div className="field" style={{ flex: 1, marginBottom: 10 }}>
            <label>Customer name</label>
            <input value={cust} onChange={e => setCust(e.target.value)} placeholder="Walk-in" />
          </div>
          <div className="field" style={{ flex: 1, marginBottom: 10 }}>
            <label>WhatsApp number</label>
            <input value={phone} onChange={e => setPhone(e.target.value.replace(/[^\d]/g, ''))} placeholder="10-digit" maxLength={10} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 7, marginBottom: 12 }}>
          {['Cash', 'UPI', 'Card'].map(m => <button key={m} onClick={() => setPay(m)} className={'chip' + (pay === m ? ' active' : '')} style={{ flex: 1, justifyContent: 'center' }}>{m}</button>)}
        </div>
        {/* totals */}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, padding: '4px 0' }}>
          <span className="muted">Subtotal</span><b>{fmt(subtotal)}</b>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13.5, padding: '4px 0' }}>
          <span className="muted">Discount ₹</span>
          <input type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" style={{ width: 80, padding: '5px 8px', borderRadius: 8, border: '1.5px solid var(--rule-2)', fontSize: 13, textAlign: 'right' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 9, marginTop: 5, borderTop: '1.5px solid var(--rule-2)' }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Total</span>
          <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--saffron)' }}>{fmt(total)}</span>
        </div>
        <button className="btn block" disabled={lines.length === 0} onClick={generate} style={{ marginTop: 14 }}>
          <Icon name="receipt" size={16} />Generate bill
        </button>
      </div>
    </div>
  );
}

/* ---------------- BILL RECEIPT ---------------- */
function BillReceipt({ store, bill, reset }) {
  const billNo = 'SS-' + bill.id.replace('#', '');
  const date = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  function waText() {
    let t = '*Sri Siri Home Foods*\nHomemade with love\n';
    t += '--------------------------------\n';
    t += 'Bill: ' + billNo + '\nDate: ' + date + '\n';
    if (bill.customer) t += 'Customer: ' + bill.customer + '\n';
    t += '--------------------------------\n';
    bill.items.forEach(i => { t += `${i.qty} x ${i.name} (${i.size})  ${fmt(i.price * i.qty)}\n`; });
    t += '--------------------------------\n';
    t += 'Subtotal: ' + fmt(bill.subtotal) + '\n';
    if (bill.discount > 0) t += 'Discount: -' + fmt(bill.discount) + '\n';
    t += '*Total: ' + fmt(bill.total) + '*\n';
    t += 'Paid by: ' + bill.pay + '\n';
    t += '--------------------------------\n';
    t += 'Thank you!';
    return t;
  }
  const hasPhone = !!(bill.phone && bill.phone.length >= 10);
  function sendWA() {
    const num = '91' + bill.phone.slice(-10);
    const url = 'https://wa.me/' + num + '?text=' + encodeURIComponent(waText());
    window.open(url, '_blank');
    store.toast('Opening WhatsApp…');
  }
  return (
    <div className="fade-in" style={{ maxWidth: 620, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, color: 'var(--green)' }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--green-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={18} /></div>
        <b style={{ fontSize: 16, color: 'var(--ink)' }}>{'Sale recorded · ' + fmt(bill.total)}</b>
      </div>
      {/* receipt */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ background: '#22201b', color: '#f3ece0', padding: '18px 22px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 600 }}>Sri Siri Home Foods</div>
          <div style={{ fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: '#9a9082', marginTop: 3 }}>Homemade · Made to order</div>
        </div>
        <div style={{ padding: '18px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: 'var(--ink-faint)', marginBottom: 14 }}>
            <span>Bill <b style={{ color: 'var(--ink)' }}>{billNo}</b></span><span>{date}</span>
          </div>
          {bill.customer ? (
            <div style={{ fontSize: 13, marginBottom: 12 }}>Billed to: <b>{bill.customer}</b>{bill.phone ? <span className="muted">{'  ·  +91 ' + bill.phone}</span> : null}</div>
          ) : null}
          <table className="tbl" style={{ marginBottom: 8 }}>
            <thead>
              <tr><th>Item</th><th style={{ textAlign: 'center' }}>Qty</th><th style={{ textAlign: 'right' }}>Rate</th><th style={{ textAlign: 'right' }}>Amount</th></tr>
            </thead>
            <tbody>
              {bill.items.map((i, k) => (
                <tr key={k}>
                  <td><b>{i.name}</b><span className="muted">{'  ' + i.size}</span></td>
                  <td style={{ textAlign: 'center' }}>{i.qty}</td>
                  <td style={{ textAlign: 'right' }}>{fmt(i.price)}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmt(i.price * i.qty)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
            <span className="muted">Subtotal</span><span>{fmt(bill.subtotal)}</span>
          </div>
          {bill.discount > 0 ? (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0', color: 'var(--green)' }}>
              <span>Discount</span><span>{'−' + fmt(bill.discount)}</span>
            </div>
          ) : null}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 9, marginTop: 5, borderTop: '1.5px solid var(--rule-2)' }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>Total</span>
            <span style={{ fontWeight: 700, fontSize: 18, color: 'var(--saffron)' }}>{fmt(bill.total)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginTop: 8, color: 'var(--ink-faint)' }}>
            <span>Paid by <b style={{ color: 'var(--ink)' }}>{bill.pay}</b></span><span>✓ Paid</span>
          </div>
          <div style={{ textAlign: 'center', fontFamily: 'var(--serif)', fontSize: 13, color: 'var(--ink-faint)', marginTop: 16, fontStyle: 'italic' }}>Thank you for your order!</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 11, marginTop: 16 }}>
        {hasPhone ? <button className="btn dark" style={{ flex: 1, background: '#1faf54', boxShadow: '0 3px 10px rgba(31,175,84,.3)' }} onClick={sendWA}><Icon name="phone" size={16} />Send bill on WhatsApp</button> : null}
        <button className="btn ghost" style={{ flex: hasPhone ? undefined : 1 }} onClick={() => store.toast('Printing bill…')}><Icon name="receipt" size={16} />Print</button>
        <button className="btn ghost" style={{ flex: hasPhone ? undefined : 1 }} onClick={reset}><Icon name="plus" size={16} />New sale</button>
      </div>
    </div>
  );
}
