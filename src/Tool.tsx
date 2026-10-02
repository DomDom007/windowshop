// Windowshop: a QR code on the shop window opens an after-hours catalogue. Orders arrive on the shop's WhatsApp.
import { useState } from "react";
import { moneyFmt } from "./lib/money";
import { shareLink, waLink } from "./lib/share";
import { uid, useStored } from "./lib/store";
import { useShared } from "./lib/useShared";
import { CurrencySelect, Section } from "./ui/kit";
import { QR } from "./ui/QR";

const T = "windowshop";
type Item = { id: string; name: string; price: number; desc: string; img: string; stock: boolean };
type Shop = { name: string; phone: string; currency: string; pickup: string; slots: string[]; items: Item[]; note: string };
const SAMPLE: Shop = {
  name: "Boulangerie Les Jasmins", phone: "21671000000", currency: "TND", pickup: "12 Rue de Rome, Tunis", note: "Pay when you collect.",
  slots: ["Tomorrow 07:00 to 08:00", "Tomorrow 08:00 to 09:00", "Tomorrow 12:00 to 13:00", "Tomorrow 17:00 to 18:00"],
  items: [
    { id: "i1", name: "Baguette tradition", price: 0.4, desc: "Baked from 5am", img: "", stock: true },
    { id: "i2", name: "Pain complet", price: 1.2, desc: "Wholemeal, 400g", img: "", stock: true },
    { id: "i3", name: "Croissant", price: 1.1, desc: "Pure butter", img: "", stock: true },
    { id: "i4", name: "Bambalouni (box of 4)", price: 4, desc: "Weekends only", img: "", stock: false },
    { id: "i5", name: "Birthday cake, 8 people", price: 45, desc: "Order two days ahead", img: "", stock: true },
  ],
};

function Storefront({ shop }: { shop: Shop }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [who, setWho] = useState({ name: "", slot: shop.slots[0] ?? "", note: "" });
  const money = moneyFmt(shop.currency);
  const lines = shop.items.filter(i => cart[i.id]);
  const total = lines.reduce((a, i) => a + i.price * cart[i.id], 0);
  const order = `New order for ${shop.name}\nName: ${who.name}\nPickup: ${who.slot}\n\n${lines.map(i => `${cart[i.id]} x ${i.name} = ${money(i.price * cart[i.id])}`).join("\n")}\n\nTotal: ${money(total)}${who.note ? `\nNote: ${who.note}` : ""}`;
  const add = (id: string, n: number) => setCart(c => { const v = Math.max(0, (c[id] ?? 0) + n); const x = { ...c, [id]: v }; if (!v) delete x[id]; return x; });
  return (
    <div className="stack">
      <header className="ws-head"><p className="eyebrow">Order now, collect later</p><h2>{shop.name}</h2><p className="note">{shop.pickup}</p></header>
      <div className="ws-items">
        {shop.items.map(i => (
          <div key={i.id} className="ws-item" style={{ opacity: i.stock ? 1 : 0.5 }}>
            {i.img && <img src={i.img} alt="" />}
            <div style={{ flex: 1 }}><strong>{i.name}</strong><p className="note">{i.desc}</p><p className="ws-price">{money(i.price)}</p></div>
            {i.stock ? <div className="ws-step"><button className="btn" onClick={() => add(i.id, -1)} aria-label={`Remove ${i.name}`}>−</button><span>{cart[i.id] ?? 0}</span><button className="btn" onClick={() => add(i.id, 1)} aria-label={`Add ${i.name}`}>+</button></div> : <span className="pill">Sold out</span>}
          </div>
        ))}
      </div>
      <section className="panel stack" style={{ gap: 10 }}>
        <h2>Your order · {money(total)}</h2>
        <div className="row"><label className="field"><span>Your name</span><input id="ws-name" className="input" value={who.name} onChange={e => setWho({ ...who, name: e.target.value })} /></label>
          <label className="field"><span>Pickup time</span><select id="ws-slot" className="input" value={who.slot} onChange={e => setWho({ ...who, slot: e.target.value })}>{shop.slots.map(s => <option key={s}>{s}</option>)}</select></label></div>
        <label className="field"><span>Note (optional)</span><input id="ws-note" className="input" value={who.note} onChange={e => setWho({ ...who, note: e.target.value })} /></label>
        <a className={"btn primary" + (!lines.length || !who.name.trim() ? " disabled" : "")} aria-disabled={!lines.length || !who.name.trim()} href={lines.length && who.name.trim() ? waLink(order, shop.phone) : undefined} target="_blank" rel="noreferrer">Send order on WhatsApp</a>
        <p className="note">{shop.note}</p>
      </section>
    </div>
  );
}

export default function Windowshop() {
  const shared = useShared<Shop>();
  const [shop, setShop] = useStored<Shop>(T, "shop", SAMPLE);
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState(false);
  const css = <style>{`.ws-head h2{font-size:clamp(34px,5vw,52px);line-height:1.05;margin:6px 0}.ws-items{display:grid;gap:10px}.ws-item{display:flex;gap:14px;align-items:center;background:var(--surface);border-radius:10px;padding:12px 14px;box-shadow:var(--shadow)}
  .ws-item img{width:64px;height:64px;object-fit:cover;border-radius:8px}.ws-price{font-weight:700;margin-top:2px}.ws-step{display:flex;align-items:center;gap:8px}.ws-step .btn{width:40px;height:40px;padding:0;font-size:20px}.ws-step span{min-width:22px;text-align:center;font-weight:700;font-size:18px}
  .btn.disabled{opacity:.45;pointer-events:none}.ws-poster{background:#fff;color:#151933;border:3px solid #151933;border-radius:14px;padding:28px;text-align:center;max-width:420px}.ws-poster h3{font-size:34px;line-height:1.05;margin-bottom:8px}`}</style>;

  if (shared.loading) return <p className="empty-note">Opening the shop…</p>;
  if (shared.error) return <p className="empty-note">{shared.error}</p>;
  if (shared.data) return <>{css}<Storefront shop={shared.data} /></>;

  const set = (p: Partial<Shop>) => { setShop({ ...shop, ...p }); setUrl(""); };
  const setItem = (id: string, p: Partial<Item>) => set({ items: shop.items.map(i => (i.id === id ? { ...i, ...p } : i)) });
  const make = async () => setUrl(await shareLink(T, shop, "m=shop"));

  return (
    <div className="stack">{css}
      <div className="grid2">
        <Section title="Shop">
          <div className="stack" style={{ gap: 10 }}>
            <label className="field"><span>Shop name</span><input id="ws-sn" className="input" value={shop.name} onChange={e => set({ name: e.target.value })} /></label>
            <div className="row"><label className="field"><span>WhatsApp number for orders</span><input id="ws-ph" className="input" value={shop.phone} onChange={e => set({ phone: e.target.value.replace(/[^\d]/g, "") })} placeholder="21671000000" /></label><CurrencySelect id="ws-cur" value={shop.currency} onChange={c => set({ currency: c })} /></div>
            <label className="field"><span>Pickup address</span><input id="ws-pa" className="input" value={shop.pickup} onChange={e => set({ pickup: e.target.value })} /></label>
            <label className="field"><span>Pickup times, one per line</span><textarea id="ws-slots" className="input" rows={4} value={shop.slots.join("\n")} onChange={e => set({ slots: e.target.value.split("\n").filter(s => s.trim()) })} /></label>
            <label className="field"><span>Note shown to customers</span><input id="ws-sno" className="input" value={shop.note} onChange={e => set({ note: e.target.value })} /></label>
          </div>
        </Section>
        <Section title="Window poster" aside={<button className="btn small" onClick={() => window.print()} disabled={!url}>Print</button>}>
          {!url ? <button className="btn primary" onClick={make}>Make the poster and link</button> : (
            <div className="stack" style={{ gap: 12, alignItems: "flex-start" }}>
              {url.length < 2300 ? <div className="ws-poster"><p className="eyebrow" style={{ color: "#555C78" }}>We are closed, but you can still order</p><h3>{shop.name}</h3><QR text={url} size={240} /><p style={{ marginTop: 10 }}>Scan, choose, and pick up at a time that suits you.</p></div>
                : <p className="pill warn">The catalogue is too long for one QR code. Share the link instead, or remove some items.</p>}
              <input className="input note" readOnly value={url} onFocus={e => e.target.select()} aria-label="Shop link" />
            </div>
          )}
        </Section>
      </div>
      <Section title="Products" aside={<button className="btn small" onClick={() => setPreview(!preview)}>{preview ? "Hide preview" : "Preview as a customer"}</button>}>
        <div className="table-wrap"><table className="t">
          <thead><tr><th>Product</th><th>Description</th><th className="r">Price</th><th>Photo link (optional)</th><th>In stock</th><th /></tr></thead>
          <tbody>{shop.items.map(i => (
            <tr key={i.id}>
              <td><input className="input" aria-label="Product" value={i.name} onChange={e => setItem(i.id, { name: e.target.value })} /></td>
              <td><input className="input" aria-label="Description" value={i.desc} onChange={e => setItem(i.id, { desc: e.target.value })} /></td>
              <td><input className="input num" style={{ width: 80 }} aria-label="Price" value={i.price} onChange={e => setItem(i.id, { price: parseFloat(e.target.value) || 0 })} /></td>
              <td><input className="input" aria-label="Photo link" value={i.img} placeholder="https://…" onChange={e => setItem(i.id, { img: e.target.value })} /></td>
              <td><input type="checkbox" aria-label="In stock" checked={i.stock} onChange={e => setItem(i.id, { stock: e.target.checked })} /></td>
              <td><button className="btn ghost small danger" onClick={() => set({ items: shop.items.filter(x => x.id !== i.id) })}>Delete</button></td>
            </tr>
          ))}</tbody>
        </table></div>
        <button className="btn small" style={{ marginTop: 12 }} onClick={() => set({ items: [...shop.items, { id: uid(), name: "New product", price: 0, desc: "", img: "", stock: true }] })}>Add a product</button>
        <p className="note" style={{ marginTop: 8 }}>After changing products or stock, make a new poster link.</p>
      </Section>
      {preview && <section className="panel"><Storefront shop={shop} /></section>}
    </div>
  );
}
