import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  BlockStack, InlineStack, Card, Text, TextField, Checkbox, RangeSlider, Select,
  Button, Banner, Badge, Icon, Box, Collapsible, Divider,
} from "@shopify/polaris";
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, DeleteIcon, EditIcon, DragHandleIcon } from "@shopify/polaris-icons";
import api from "../services/api";
import AppBridgeSaveBar from "../components/AppBridgeSaveBar";

const STORAGE_KEY = "invoice_pdf_template"; // extra_settings ni andar aa key ma save thase

/* ---------------- defaults ---------------- */
const LABELS = [
  ["invoice", "Invoice", "Invoice"],
  ["orderNumber", "Order number", "Order number"],
  ["orderAmount", "Order amount", "Order amount"],
  ["issueDate", "Issue date", "Issue date"],
  ["invoiceFrom", "Invoice from", "Invoice from"],
  ["invoiceTo", "Invoice to", "Invoice to"],
  ["shippingAddress", "Shipping address", "Shipping address"],
  ["billingAddress", "Billing address", "Billing address"],
  ["paymentTerms", "Payment terms", "Payment terms"],
  ["salesperson", "Salesperson", "Salesperson"],
  ["inquiry", "Quote inquiry info", "Quote inquiry info"],
  ["item", "Item description", "Item Description"],
  ["qty", "Quantity", "Qty"],
  ["price", "Price", "Price"],
  ["total", "Total", "Total"],
  ["note", "Note", "Note"],
  ["subtotal", "Subtotal", "Subtotal"],
  ["discount", "Discount", "Discount"],
  ["shipping", "Shipping", "Shipping"],
  ["tax", "Tax", "GST"],
  ["grandTotal", "Grand total", "Grand Total"],
];
const DEFAULT_LABELS = Object.fromEntries(LABELS.map(([k, , v]) => [k, v]));

const DEFAULT_TEMPLATE = {
  style: {
    showLogo: true, logo: "", logoSize: 80,
    headerFont: "Default", headerSize: 22, contentFont: "Default", contentSize: 14,
    primary: "#161616", background: "#FFFFFF", text: "#161616",
  },
  show: {
    header: { orderNumber: true, orderAmount: true, issueDate: true, dateFormat: "YYYY-MM-DD" },
    supplier: { name: true, email: true, address: true, phone: true },
    customer: { name: true, company: true, email: true, phone: true, shipping: true, billing: true, paymentTerms: true, inquiry: true },
    salesperson: { show: true, email: true, phone: true },
    product: { image: true, description: true, sku: true, variant: true, discount: true },
    total: { subtotal: true, discount: true, shipping: true, tax: true, grandTotal: true },
    note: { draftOrder: true, customer: true },
    footer: {
      show: true, text: "Thanks for your business!\nIf you have questions, please do get in contact",
      storeName: true, email: true, address: true,
    },
  },
  sections: [
    { id: "parties", label: "Invoice from / to", visible: true },
    { id: "addresses", label: "Shipping / billing address", visible: true },
    { id: "extra", label: "Payment terms, salesperson, inquiry", visible: true },
    { id: "products", label: "Product table", visible: true },
    { id: "summary", label: "Notes & totals", visible: true },
    { id: "footer", label: "Footer", visible: true },
  ],
  translation: { autoDetect: false, active: "English", languages: [{ name: "English", isDefault: true, labels: DEFAULT_LABELS }] },
};

// [key, title, fields]  field = [key, label, type?]
const GROUPS = [
  ["header", "Header", [["orderNumber", "Order number"], ["orderAmount", "Order amount"], ["issueDate", "Issue date"], ["dateFormat", "Date format", "date"]]],
  ["style", "Style"],
  ["supplier", "Supplier", [["name", "Store name"], ["email", "Email"], ["address", "Address"], ["phone", "Phone"]]],
  ["customer", "Customer", [["name", "Customer name"], ["company", "Company"], ["email", "Email"], ["phone", "Phone"], ["shipping", "Shipping address"], ["billing", "Billing address"], ["paymentTerms", "Payment terms"], ["inquiry", "Quote inquiry info"]]],
  ["salesperson", "Salesperson", [["show", "Show salesperson"], ["email", "Email"], ["phone", "Phone"]]],
  ["product", "Product table", [["image", "Product image"], ["description", "Description"], ["sku", "SKU"], ["variant", "Variant"], ["discount", "Discount details"]]],
  ["total", "Total", [["subtotal", "Subtotal"], ["discount", "Discount"], ["shipping", "Shipping"], ["tax", "Tax"], ["grandTotal", "Grand total"]]],
  ["note", "Note", [["draftOrder", "Draft order note"], ["customer", "Customer note"]]],
  ["footer", "Footer", [["show", "Show footer"], ["text", "Footer message", "text"], ["storeName", "Store name"], ["email", "Email"], ["address", "Address"]]],
  ["section", "Section"],
  ["translation", "Translation"],
];

const FONTS = ["Default", "Arial", "Georgia", "Times New Roman", "Courier New", "Verdana"].map((f) => ({ label: f, value: f }));
const DATE_FORMATS = ["YYYY-MM-DD", "MM/DD/YYYY", "DD/MM/YYYY"].map((f) => ({ label: f, value: f }));
const SAMPLE_DATE = { "YYYY-MM-DD": "2026-10-05", "MM/DD/YYYY": "10/05/2026", "DD/MM/YYYY": "05/10/2026" };

/* ---------------- helpers ---------------- */
const getShop = () => new URLSearchParams(window.location.search).get("shop") || "";
const getIn = (o, path) => path.reduce((a, k) => a?.[k], o);
const setIn = (o, [k, ...rest], v) => ({ ...o, [k]: rest.length ? setIn(o[k], rest, v) : v });
const merge = (base, over) => {
  if (!over || typeof over !== "object" || Array.isArray(over)) return over ?? base;
  const out = { ...base };
  Object.keys(over).forEach((k) => {
    out[k] = base?.[k] && typeof base[k] === "object" && !Array.isArray(base[k]) ? merge(base[k], over[k]) : over[k];
  });
  return out;
};
const extractTemplate = (data) => {
  let extra = data?.extra_settings;
  if (typeof extra === "string") {
    try { extra = JSON.parse(extra); } catch { extra = null; }
  }
  const saved = extra?.[STORAGE_KEY];
  if (!saved) return null;
  const m = merge(DEFAULT_TEMPLATE, saved);
  const known = new Set((saved.sections || []).map((s) => s.id));
  m.sections = [...(saved.sections || []), ...DEFAULT_TEMPLATE.sections.filter((s) => !known.has(s.id))];
  return m;
};
const money = (n) => `$${n.toLocaleString()}.00`;

/* ---------------- preview ---------------- */
function Preview({ t }) {
  const s = t.style, c = t.show;
  const L = (t.translation.languages.find((l) => l.isDefault) || t.translation.languages[0]).labels;
  const { header: h, supplier: sup, customer: cu, salesperson: sp, product: p, total: tot, note: n, footer: f } = c;
  const font = (v) => (v === "Default" ? "inherit" : v);
  const label = (txt) => <div style={{ fontWeight: 700, marginBottom: 4 }}>{txt}</div>;
  const grid = (kids) => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>{kids}</div>;
  const th = (txt, right) => <th style={{ padding: 8, textAlign: right ? "right" : "left", fontWeight: 500 }}>{txt}</th>;
  const rows = [
    tot.subtotal && [L.subtotal, 36000], tot.discount && [L.discount, 0],
    tot.shipping && [L.shipping, 0], tot.tax && [L.tax, 10000],
  ].filter(Boolean);
  const row = (i) => ({ display: "flex", justifyContent: "space-between", padding: 8, background: i % 2 ? "rgba(0,0,0,.04)" : "transparent" });

  const SEC = {
    parties: () => grid([
      <div key="a">{label(L.invoiceFrom)}{sup.name && <div>My Store</div>}{sup.email && <div>kuldip.vyas@instrowest.com.au</div>}{sup.address && <div>unit 3/12 Day Road, Rockingham WA 6168</div>}{sup.phone && <div>08 9500 9120</div>}</div>,
      <div key="b">{label(L.invoiceTo)}{cu.name && <div>John Due</div>}{cu.company && <div>QuoteSnap LTD</div>}{cu.email && <div>john.due@omegatheme.com</div>}{cu.phone && <div>+84 0000001</div>}</div>,
    ]),
    addresses: () => grid([
      <div key="a">{cu.shipping && <>{label(L.shippingAddress)}<div>John Smith, 456 Park Avenue, New York NY 10022, United States</div></>}</div>,
      <div key="b">{cu.billing && <>{label(L.billingAddress)}<div>John Smith, 151 O'Connor St, Ottawa Ontario K2P2L8, Canada</div></>}</div>,
    ]),
    extra: () => (
      <BlockStack gap="300">
        {grid([
          <div key="a">{cu.paymentTerms && <>{label(L.paymentTerms)}<div>Cash on delivery</div></>}</div>,
          <div key="b">{sp.show && <>{label(L.salesperson)}<div>Lucas</div>{sp.email && <div>example@gmail.com</div>}{sp.phone && <div>+84 0000002</div>}</>}</div>,
        ])}
        {cu.inquiry && <div>{label(L.inquiry)}<div>Special inquiry: Special inquiry</div></div>}
      </BlockStack>
    ),
    products: () => (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderTop: `1px solid ${s.primary}`, borderBottom: `1px solid ${s.primary}`, color: s.primary }}>
            {th(L.item)}{th(L.qty, true)}{th(L.price, true)}{th(L.total, true)}
          </tr>
        </thead>
        <tbody>
          <tr style={{ background: "rgba(0,0,0,.04)" }}>
            <td style={{ padding: 8 }}>
              <InlineStack gap="200" wrap={false} blockAlign="start">
                {p.image && <div style={{ width: 34, height: 44, background: "#c9cccf", borderRadius: 4, flexShrink: 0 }} />}
                <div>
                  <div style={{ fontWeight: 600 }}>Classic Metallic Flower Pot - Large/BLACK/ 4M</div>
                  {p.discount && <div>Discount: 10% off for Spring Sale</div>}
                  {p.sku && <div>AS1417-9909-0011</div>}
                  {p.variant && <div>Terracotta/ Oval/ Metallic finish</div>}
                  {p.description && <div>Clean crafting vintage timepieces inspired by past members of the Gadd family</div>}
                </div>
              </InlineStack>
            </td>
            <td style={{ padding: 8, textAlign: "right" }}>x2</td>
            <td style={{ padding: 8, textAlign: "right" }}>
              {p.discount && <div style={{ textDecoration: "line-through", color: "#c00" }}>$20,000.00</div>}
              <div>$18,000.00</div>{p.discount && <div>(10% OFF)</div>}
            </td>
            <td style={{ padding: 8, textAlign: "right" }}>$36,000.00</td>
          </tr>
        </tbody>
      </table>
    ),
    summary: () => (
      <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
        <div style={{ maxWidth: 240 }}>
          {(n.draftOrder || n.customer) && label(L.note)}
          {n.draftOrder && <p>This is the note about Draft order. The value will be placed in this position. Thank you</p>}
          {n.customer && <p>This is the note about Customer. The value will be placed in this position. Thank you</p>}
        </div>
        <div style={{ minWidth: 240 }}>
          {rows.map(([lb, v], i) => <div key={lb} style={row(i)}><span>{lb}</span><span>{money(v)}</span></div>)}
          {tot.grandTotal && (
            <div style={{ ...row(0), background: "transparent", fontWeight: 700, borderTop: `1px solid ${s.primary}` }}>
              <span>{L.grandTotal}</span><span>{money(46000)}</span>
            </div>
          )}
        </div>
      </div>
    ),
    footer: () => f.show && (
      <div style={{ textAlign: "center", whiteSpace: "pre-line", fontSize: s.contentSize - 2 }}>
        <div style={{ fontWeight: 600 }}>{f.text.split("\n")[0]}</div>
        {f.text.split("\n").slice(1).join("\n")}
        {f.storeName && <div style={{ fontWeight: 600 }}>My Store</div>}
        {f.email && <div>kuldip.vyas@instrowest.com.au</div>}
        {f.address && <div>unit 3/12 Day Road</div>}
      </div>
    ),
  };

  return (
    <div style={{ background: s.background, color: s.text, fontSize: s.contentSize, fontFamily: font(s.contentFont), padding: 32, border: "1px solid #e4e5e7", borderRadius: 8, display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: s.headerSize * 1.5, fontWeight: 600, fontFamily: font(s.headerFont), color: s.primary }}>{L.invoice}</div>
          {h.orderNumber && <div>{L.orderNumber} 123456789</div>}
          {h.orderAmount && <div>{L.orderAmount} $36,000.00</div>}
          {h.issueDate && <div>{L.issueDate} {SAMPLE_DATE[h.dateFormat]}</div>}
        </div>
        {s.showLogo && (s.logo
          ? <img src={s.logo} alt="Logo" style={{ width: s.logoSize, height: "fit-content", objectFit: "contain" }} />
          : <div style={{ width: s.logoSize, height: s.logoSize / 2, background: "#e4e5e7" }} />)}
      </div>
      {t.sections.filter((x) => x.visible).map((x) => <div key={x.id}>{SEC[x.id]()}</div>)}
    </div>
  );
}

/* ---------------- editor ---------------- */
export default function InvoicePdfTemplateEditor() {
  const [t, setT] = useState(DEFAULT_TEMPLATE);
  const [saved, setSaved] = useState(DEFAULT_TEMPLATE);
  const [open, setOpen] = useState("header");
  const [adding, setAdding] = useState(false);
  const [newLang, setNewLang] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);
  const dragId = useRef(null);

  const isDirty = useMemo(() => JSON.stringify(t) !== JSON.stringify(saved), [t, saved]);
  const update = (path, v) => setT((prev) => setIn(prev, path, v));

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/settings?shop=${encodeURIComponent(getShop())}`);
        const loaded = extractTemplate(res?.data?.data);
        if (loaded) { setT(loaded); setSaved(loaded); }
      } catch { setError("Could not load template. Please try again."); }
    })();
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true); setError(null);
    try {
      await api.put(`/settings?shop=${encodeURIComponent(getShop())}`, { extra_settings: { [STORAGE_KEY]: t } });
      setSaved(t);
    } catch { setError("Could not save. Please try again."); }
    finally { setSaving(false); }
  }, [t]);
  const handleDiscard = useCallback(() => setT(saved), [saved]);

  const num = (path) => (v) => update(path, Number(v) || 0);
  const onLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => update(["style", "logo"], r.result);
    r.readAsDataURL(file);
    e.target.value = "";
  };

  /* ----- generic toggle/select/text field ----- */
  const field = (g, [k, label, type]) => {
    const path = ["show", g, k];
    if (type === "date") return <Select key={k} label={label} options={DATE_FORMATS} value={getIn(t, path)} onChange={(v) => update(path, v)} />;
    if (type === "text") return <TextField key={k} label={label} value={getIn(t, path)} onChange={(v) => update(path, v)} multiline={3} autoComplete="off" />;
    return <Checkbox key={k} label={label} checked={!!getIn(t, path)} onChange={(v) => update(path, v)} />;
  };

  /* ----- custom bodies ----- */
  const styleBody = () => {
    const s = t.style;
    return (
      <BlockStack gap="300">
        <Checkbox label="Logo settings" checked={s.showLogo} onChange={(v) => update(["style", "showLogo"], v)} />
        {s.showLogo && (
          <>
            <div style={{ border: "1px dashed #8a8a8a", borderRadius: 8, minHeight: 90, display: "grid", placeItems: "center", padding: 8 }}>
              {s.logo ? <img src={s.logo} alt="Logo" style={{ maxWidth: "100%", maxHeight: 120 }} /> : <Text tone="subdued" as="span">No logo</Text>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onLogo} />
            <InlineStack gap="200">
              <Button icon={EditIcon} onClick={() => fileRef.current?.click()}>Change</Button>
              <Button icon={DeleteIcon} disabled={!s.logo} onClick={() => update(["style", "logo"], "")}>Delete</Button>
            </InlineStack>
            <RangeSlider label="Logo size" min={40} max={200} value={s.logoSize} onChange={(v) => update(["style", "logoSize"], v)} />
          </>
        )}
        <Text as="h3" variant="headingSm">Header settings</Text>
        <Select label="Font family" options={FONTS} value={s.headerFont} onChange={(v) => update(["style", "headerFont"], v)} />
        <TextField label="Font size" type="number" value={String(s.headerSize)} onChange={num(["style", "headerSize"])} autoComplete="off" />
        <Text as="h3" variant="headingSm">Content</Text>
        <Select label="Font family" options={FONTS} value={s.contentFont} onChange={(v) => update(["style", "contentFont"], v)} />
        <TextField label="Font size" type="number" value={String(s.contentSize)} onChange={num(["style", "contentSize"])} autoComplete="off" />
        {[["primary", "Primary color"], ["background", "Background color"], ["text", "Text color"]].map(([k, lb]) => (
          <InlineStack key={k} gap="300" blockAlign="center">
            <input type="color" aria-label={lb} value={s[k]} onChange={(e) => update(["style", k], e.target.value)}
              style={{ width: 40, height: 40, border: "none", background: "none", cursor: "pointer" }} />
            <Box>
              <Text as="p" fontWeight="semibold">{lb}</Text>
              <Text as="p" tone="subdued">{s[k]}</Text>
            </Box>
          </InlineStack>
        ))}
      </BlockStack>
    );
  };

  const onDragOver = (e, overId) => {
    e.preventDefault();
    const from = dragId.current;
    if (!from || from === overId) return;
    setT((prev) => {
      const arr = [...prev.sections];
      const [moved] = arr.splice(arr.findIndex((x) => x.id === from), 1);
      arr.splice(arr.findIndex((x) => x.id === overId), 0, moved);
      return { ...prev, sections: arr };
    });
  };
  const sectionBody = () => (
    <BlockStack gap="200">
      <Text as="p" tone="subdued">Drag sections to change their order.</Text>
      {t.sections.map((x) => (
        <div key={x.id} draggable onDragStart={() => (dragId.current = x.id)} onDragOver={(e) => onDragOver(e, x.id)}
          onDragEnd={() => (dragId.current = null)}
          style={{ cursor: "grab", border: "1px solid #e4e5e7", borderRadius: 8, padding: "8px 12px", background: "#fff" }}>
          <InlineStack align="space-between" blockAlign="center" wrap={false}>
            <InlineStack gap="200" blockAlign="center" wrap={false}>
              <Icon source={DragHandleIcon} tone="subdued" />
              <Text as="span">{x.label}</Text>
            </InlineStack>
            <Checkbox label="Show" labelHidden checked={x.visible}
              onChange={() => update(["sections"], t.sections.map((y) => (y.id === x.id ? { ...y, visible: !y.visible } : y)))} />
          </InlineStack>
        </div>
      ))}
    </BlockStack>
  );

  const translationBody = () => {
    const tr = t.translation, langs = tr.languages;
    const active = langs.find((l) => l.name === tr.active) || langs[0];
    const idx = langs.indexOf(active);
    const setLangs = (next) => update(["translation", "languages"], next);
    const addLang = () => {
      const name = newLang.trim();
      if (!name || langs.some((l) => l.name.toLowerCase() === name.toLowerCase())) return;
      setLangs([...langs, { name, isDefault: false, labels: { ...DEFAULT_LABELS } }]);
      update(["translation", "active"], name);
      setNewLang(""); setAdding(false);
    };
    const removeLang = () => {
      if (langs.length < 2) return;
      const next = langs.filter((l) => l !== active);
      if (!next.some((l) => l.isDefault)) next[0] = { ...next[0], isDefault: true };
      setLangs(next);
      update(["translation", "active"], next[0].name);
    };
    return (
      <BlockStack gap="300">
        <InlineStack gap="200" blockAlign="center">
          <Text as="span" fontWeight="semibold">Auto Detect Language</Text>
          <Badge tone={tr.autoDetect ? "success" : undefined}>{tr.autoDetect ? "On" : "Off"}</Badge>
        </InlineStack>
        <div><Button size="slim" onClick={() => update(["translation", "autoDetect"], !tr.autoDetect)}>{tr.autoDetect ? "Turn off" : "Turn on"}</Button></div>
        {!tr.autoDetect && <Banner tone="info">Export in default language</Banner>}
        <Text as="h3" variant="headingSm">Language settings</Text>
        <InlineStack gap="200" blockAlign="center">
          {langs.map((l) => (
            <Button key={l.name} size="slim" pressed={l === active} onClick={() => update(["translation", "active"], l.name)}>{l.name}</Button>
          ))}
          <Button size="slim" icon={PlusIcon} accessibilityLabel="Add language" onClick={() => setAdding(!adding)} />
        </InlineStack>
        {adding && (
          <InlineStack gap="200" blockAlign="end" wrap={false}>
            <div style={{ flex: 1 }}><TextField label="Language name" value={newLang} onChange={setNewLang} autoComplete="off" /></div>
            <Button onClick={addLang}>Add</Button>
          </InlineStack>
        )}
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h3" variant="headingSm">{active.name}</Text>
          <Button variant="plain" tone="critical" icon={DeleteIcon} disabled={langs.length < 2} onClick={removeLang}>Delete</Button>
        </InlineStack>
        <Checkbox label="Set as default" checked={active.isDefault} disabled={active.isDefault}
          onChange={() => setLangs(langs.map((l) => ({ ...l, isDefault: l === active })))} />
        {LABELS.map(([key, lb]) => (
          <TextField key={`${active.name}-${key}`} label={lb} value={active.labels[key] ?? ""} autoComplete="off"
            onChange={(v) => setLangs(langs.map((l, i) => (i === idx ? { ...l, labels: { ...l.labels, [key]: v } } : l)))} />
        ))}
      </BlockStack>
    );
  };

  const CUSTOM = { style: styleBody, section: sectionBody, translation: translationBody };

  return (
    <>
      <AppBridgeSaveBar visible={isDirty} saving={saving} onSave={handleSave} onDiscard={handleDiscard} />
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, alignItems: "start" }}>
        <BlockStack gap="300">
          {error && <Banner tone="critical" onDismiss={() => setError(null)}>{error}</Banner>}
          <Card padding="0">
            <Box padding="300"><Text as="h2" variant="headingSm">Content</Text></Box>
            {GROUPS.map(([key, title, fields]) => {
              const isOpen = open === key;
              const toggle = () => setOpen(isOpen ? "" : key);
              return (
                <div key={key}>
                  <Divider />
                  <Box padding="300">
                    <div role="button" tabIndex={0} style={{ cursor: "pointer" }} onClick={toggle} onKeyDown={(e) => e.key === "Enter" && toggle()}>
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="span" fontWeight="semibold">{title}</Text>
                        <Icon source={isOpen ? ChevronUpIcon : ChevronDownIcon} />
                      </InlineStack>
                    </div>
                    <Collapsible open={isOpen} id={`acc-${key}`}>
                      <Box paddingBlockStart="300">
                        {CUSTOM[key] ? CUSTOM[key]() : <BlockStack gap="200">{fields.map((f) => field(key, f))}</BlockStack>}
                      </Box>
                    </Collapsible>
                  </Box>
                </div>
              );
            })}
          </Card>
        </BlockStack>
        <Preview t={t} />
      </div>
    </>
  );
}