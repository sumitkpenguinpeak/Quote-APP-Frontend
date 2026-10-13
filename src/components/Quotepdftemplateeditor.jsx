import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  BlockStack, InlineStack, Card, Text, TextField, Checkbox, RangeSlider, Select,
  Button, Banner, Badge, Icon, Box, Collapsible, Divider,
} from "@shopify/polaris";
import {
  ChevronRightIcon, ChevronLeftIcon, ChevronDownIcon, ChevronUpIcon,
  PlusIcon, DeleteIcon, EditIcon,
} from "@shopify/polaris-icons";
import api from "../services/api";
// CustomCSS wala file ma je AppBridgeSaveBar hato, te alag file ma export karo
import AppBridgeSaveBar from "../components/AppBridgeSaveBar";

/* ---------------- defaults ---------------- */
const LABELS = [
  ["quotation", "Quotation", "QUOTATION"],
  ["quoteFrom", "Quotation from", "QUOTE FROM"],
  ["quoteTo", "Quotation to", "QUOTE TO"],
  ["quoteNo", "Quote N.o", "Quote No."],
  ["createdDate", "Created Date", "Issue date"],
  ["dueDate", "Due date", "Due date"],
  ["shipTo", "Ship to", "SHIP TO"],
  ["billTo", "Bill to", "BILL TO"],
  ["salesperson", "Salesperson", "SALESPERSON"],
  ["paymentTerms", "Payment terms", "PAYMENT TERMS"],
  ["item", "Item description", "PRODUCTS"],
  ["qty", "Quantity", "QTY"],
  ["price", "Price", "PRICE"],
  ["total", "Total", "TOTAL"],
  ["note", "Note", "Note"],
  ["subTotal", "Sub total", "Sub Total"],
  ["discountRate", "Discount rate", "Discount Rate"],
  ["shippingRate", "Shipping rate", "Shipping Rate"],
  ["tax", "Tax", "GST"],
  ["grandTotal", "Grand total", "Grand Total"],
];
const DEFAULT_LABELS = Object.fromEntries(LABELS.map(([k, , v]) => [k, v]));

const DEFAULT_TEMPLATE = {
  style: {
    showLogo: true, logo: "", logoSize: 80,
    headerFont: "Default", headerSize: 22,
    contentFont: "Default", contentSize: 14,
    primary: "#161616", background: "#FFFFFF", text: "#161616",
  },
  content: {
    quotation: {
      number: true, createdDate: true, dueDate: false, dateFormat: "MM/DD/YYYY",
      discount: true, shipping: true, tax: true, subtotal: true, grandTotal: true, salesperson: true,
    },
    customer: { name: true, email: true, phone: true, billing: true, shipping: true, paymentTerms: true },
    product: { image: true, sku: true, variant: true, discount: true },
    store: { name: true, phone: true, address: true },
  },
  translation: {
    autoDetect: false,
    active: "English",
    languages: [{ name: "English", isDefault: true, labels: DEFAULT_LABELS }],
  },
};

const FONTS = ["Default", "Arial", "Georgia", "Times New Roman", "Courier New", "Verdana"].map((f) => ({ label: f, value: f }));
const DATE_FORMATS = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"].map((f) => ({ label: f, value: f }));
const SAMPLE_DATE = { "MM/DD/YYYY": "10/05/2026", "DD/MM/YYYY": "05/10/2026", "YYYY-MM-DD": "2026-10-05" };

const SAMPLE = {
  items: [
    { name: "Fine Designer Luxury Watch", qty: 2, price: 3000, was: 4000 },
    { name: "Sapphire Luxury Watch", qty: 5, price: 4000, was: 5000 },
    { name: "Epoch Ocean Luxury Watch", qty: 7, price: 7000, was: 9000 },
  ],
  gst: 10000,
};

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
  return extra?.quote_pdf_template ? merge(DEFAULT_TEMPLATE, extra.quote_pdf_template) : null;
};
const money = (n) => `$${n.toLocaleString()}`;

/* ---------------- preview ---------------- */
function Preview({ t }) {
  const { style: s, content: c } = t;
  const L = (t.translation.languages.find((l) => l.isDefault) || t.translation.languages[0]).labels;
  const q = c.quotation, cu = c.customer, p = c.product, st = c.store;
  const font = (f) => (f === "Default" ? "inherit" : f);
  const sub = SAMPLE.items.reduce((a, i) => a + i.qty * i.price, 0);
  const th = (txt, right) => (
    <th style={{ padding: 8, textAlign: right ? "right" : "left", fontWeight: 700 }}>{txt}</th>
  );
  const head = (txt) => <div style={{ fontWeight: 700, marginBottom: 4 }}>{txt}</div>;
  const totals = [
    q.subtotal && [L.subTotal, sub],
    q.discount && [L.discountRate, 0],
    q.shipping && [L.shippingRate, 0],
    q.tax && [L.tax, SAMPLE.gst],
  ].filter(Boolean);

  return (
    <div style={{
      background: s.background, color: s.text, fontSize: s.contentSize,
      fontFamily: font(s.contentFont), padding: 32, border: "1px solid #e4e5e7", borderRadius: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: s.headerSize * 1.5, fontWeight: 700, fontFamily: font(s.headerFont), color: s.primary }}>
            {L.quotation}
          </div>
          {q.number && <div>{L.quoteNo} Q21000</div>}
          {q.createdDate && <div>{L.createdDate} {SAMPLE_DATE[q.dateFormat]}</div>}
          {q.dueDate && <div>{L.dueDate} {SAMPLE_DATE[q.dateFormat]}</div>}
        </div>
        {s.showLogo && (s.logo
          ? <img src={s.logo} alt="Logo" style={{ width: s.logoSize, height: "fit-content", objectFit: "contain" }} />
          : <div style={{ width: s.logoSize, height: s.logoSize / 2, background: "#e4e5e7" }} />)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, margin: "24px 0" }}>
        <div>{head(L.quoteFrom)}{st.name && <div>Instrowest</div>}{st.phone && <div>08 9500 9120</div>}{st.address && <div>unit 3/12 Day Road, 6168</div>}</div>
        <div>{head(L.quoteTo)}{cu.name && <div>John Due</div>}{cu.email && <div>john.due@example.com</div>}{cu.phone && <div>+84 0000001</div>}</div>
        <div>{cu.shipping && <>{head(L.shipTo)}<div>John Smith, 456 Park Avenue, New York</div></>}</div>
        <div>{cu.billing && <>{head(L.billTo)}<div>John Smith, 151 O'Connor St, Ottawa</div></>}</div>
        <div>{q.salesperson && <>{head(L.salesperson)}<div>Lucas</div><div>example@gmail.com</div></>}</div>
        <div>{cu.paymentTerms && <>{head(L.paymentTerms)}<div>Cash on delivery</div></>}</div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ color: s.primary, borderTop: `1px solid ${s.primary}`, borderBottom: `1px solid ${s.primary}` }}>
            {th(L.item)}{th(L.qty, true)}{th(L.price, true)}{th(L.total, true)}
          </tr>
        </thead>
        <tbody>
          {SAMPLE.items.map((i, idx) => (
            <tr key={i.name} style={{ background: idx % 2 === 0 ? "rgba(0,0,0,.04)" : "transparent" }}>
              <td style={{ padding: 8 }}>
                <InlineStack gap="200" wrap={false} blockAlign="start">
                  {p.image && <div style={{ width: 40, height: 48, background: "#c9cccf", borderRadius: 4, flexShrink: 0 }} />}
                  <div>
                    <div style={{ fontWeight: 600 }}>{i.name}</div>
                    {p.sku && <div>SKU: AB-123456</div>}
                    {p.variant && <div>Medium</div>}
                    {p.discount && <div>Discount: 10% off for Spring Sale</div>}
                  </div>
                </InlineStack>
              </td>
              <td style={{ padding: 8, textAlign: "right" }}>{i.qty}</td>
              <td style={{ padding: 8, textAlign: "right" }}>
                {money(i.price)}
                {p.discount && <div style={{ textDecoration: "line-through", opacity: 0.6 }}>{money(i.was)}</div>}
              </td>
              <td style={{ padding: 8, textAlign: "right" }}>{money(i.qty * i.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 24, marginTop: 24 }}>
        <div style={{ maxWidth: 220 }}>
          {head(L.note)}This is the merchant's note to customer. Thank you.
        </div>
        <div style={{ minWidth: 220 }}>
          {totals.map(([label, v], i) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between", padding: 8,
              background: i % 2 === 0 ? "rgba(0,0,0,.04)" : "transparent",
            }}>
              <span>{label}</span><span>{money(v)}</span>
            </div>
          ))}
          {q.grandTotal && (
            <div style={{
              display: "flex", justifyContent: "space-between", padding: 8, fontWeight: 700,
              borderTop: `1px solid ${s.primary}`,
            }}>
              <span>{L.grandTotal}</span><span>{money(sub + SAMPLE.gst)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- editor ---------------- */
export default function QuotePdfTemplateEditor() {
  const [t, setT] = useState(DEFAULT_TEMPLATE);
  const [saved, setSaved] = useState(DEFAULT_TEMPLATE);
  const [panel, setPanel] = useState(null); // null | style | content | translation
  const [openAcc, setOpenAcc] = useState("quotation");
  const [adding, setAdding] = useState(false);
  const [newLang, setNewLang] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const fileRef = useRef(null);

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
      await api.put(`/settings?shop=${encodeURIComponent(getShop())}`, {
        extra_settings: { quote_pdf_template: t },
      });
      setSaved(t);
    } catch { setError("Could not save. Please try again."); }
    finally { setSaving(false); }
  }, [t]);
  const handleDiscard = useCallback(() => setT(saved), [saved]);

  const chk = (path, label) => (
    <Checkbox key={path.join(".")} label={label} checked={!!getIn(t, path)} onChange={(v) => update(path, v)} />
  );
  const num = (path) => (v) => update(path, Number(v) || 0);

  const onLogo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update(["style", "logo"], reader.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  /* ----- panels ----- */
  const stylePanel = () => {
    const s = t.style;
    return (
      <BlockStack gap="300">
        {chk(["style", "showLogo"], "Logo settings")}
        {s.showLogo && (
          <>
            <div style={{ border: "1px dashed #8a8a8a", borderRadius: 8, minHeight: 100, display: "grid", placeItems: "center", padding: 8 }}>
              {s.logo ? <img src={s.logo} alt="Logo" style={{ maxWidth: "100%", maxHeight: 140 }} /> : <Text tone="subdued" as="span">No logo</Text>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onLogo} />
            <InlineStack gap="200">
              <Button icon={EditIcon} onClick={() => fileRef.current?.click()}>Change</Button>
              <Button icon={DeleteIcon} onClick={() => update(["style", "logo"], "")} disabled={!s.logo}>Delete</Button>
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
        {[["primary", "Primary color"], ["background", "Background color"], ["text", "Text color"]].map(([k, label]) => (
          <InlineStack key={k} gap="300" blockAlign="center">
            <input type="color" aria-label={label} value={s[k]} onChange={(e) => update(["style", k], e.target.value)}
              style={{ width: 40, height: 40, border: "none", background: "none", cursor: "pointer" }} />
            <Box>
              <Text as="p" fontWeight="semibold">{label}</Text>
              <Text as="p" tone="subdued">{s[k]}</Text>
            </Box>
          </InlineStack>
        ))}
      </BlockStack>
    );
  };

  const contentPanel = () => {
    const groups = [
      ["quotation", "Quotation Info", () => (
        <>
          {chk(["content", "quotation", "number"], "Quotation number")}
          <InlineStack gap="400">
            {chk(["content", "quotation", "createdDate"], "Created date")}
            {chk(["content", "quotation", "dueDate"], "Due date")}
          </InlineStack>
          <Select label="Date format" options={DATE_FORMATS} value={t.content.quotation.dateFormat}
            onChange={(v) => update(["content", "quotation", "dateFormat"], v)} />
          {chk(["content", "quotation", "discount"], "Show discount rate")}
          {chk(["content", "quotation", "shipping"], "Show shipping rate")}
          {chk(["content", "quotation", "tax"], "Show tax")}
          {chk(["content", "quotation", "subtotal"], "Show subtotal")}
          {chk(["content", "quotation", "grandTotal"], "Show grand total")}
          {chk(["content", "quotation", "salesperson"], "Show assigned salesperson info")}
        </>
      )],
      ["customer", "Customer info", () => (
        <>
          {chk(["content", "customer", "name"], "Customer name")}
          {chk(["content", "customer", "email"], "Email")}
          {chk(["content", "customer", "phone"], "Phone")}
          {chk(["content", "customer", "billing"], "Billing address")}
          {chk(["content", "customer", "shipping"], "Shipping address")}
          {chk(["content", "customer", "paymentTerms"], "Payment terms")}
        </>
      )],
      ["product", "Product info", () => (
        <>
          {chk(["content", "product", "image"], "Product image")}
          {chk(["content", "product", "sku"], "SKU")}
          {chk(["content", "product", "variant"], "Variant")}
          {chk(["content", "product", "discount"], "Discount details")}
        </>
      )],
      ["store", "Store info", () => (
        <>
          {chk(["content", "store", "name"], "Store name")}
          {chk(["content", "store", "phone"], "Phone")}
          {chk(["content", "store", "address"], "Address")}
        </>
      )],
    ];
    return (
      <BlockStack gap="0">
        {groups.map(([key, title, body], i) => (
          <div key={key}>
            {i > 0 && <Divider />}
            <Box paddingBlock="300">
              <div role="button" tabIndex={0} style={{ cursor: "pointer" }}
                onClick={() => setOpenAcc(openAcc === key ? "" : key)}
                onKeyDown={(e) => e.key === "Enter" && setOpenAcc(openAcc === key ? "" : key)}>
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingSm">{title}</Text>
                  <Icon source={openAcc === key ? ChevronUpIcon : ChevronDownIcon} />
                </InlineStack>
              </div>
              <Collapsible open={openAcc === key} id={`acc-${key}`}>
                <Box paddingBlockStart="300"><BlockStack gap="200">{body()}</BlockStack></Box>
              </Collapsible>
            </Box>
          </div>
        ))}
      </BlockStack>
    );
  };

  const translationPanel = () => {
    const tr = t.translation;
    const langs = tr.languages;
    const active = langs.find((l) => l.name === tr.active) || langs[0];
    const idx = langs.findIndex((l) => l.name === active.name);
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
      const next = langs.filter((l) => l.name !== active.name);
      if (!next.some((l) => l.isDefault)) next[0] = { ...next[0], isDefault: true };
      setLangs(next);
      update(["translation", "active"], next[0].name);
    };
    const setDefault = () => setLangs(langs.map((l) => ({ ...l, isDefault: l.name === active.name })));
    const setLabel = (key, v) =>
      setLangs(langs.map((l, i) => (i === idx ? { ...l, labels: { ...l.labels, [key]: v } } : l)));

    return (
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="200" blockAlign="center">
            <Text as="span" fontWeight="semibold">Auto Detect Language</Text>
            <Badge tone={tr.autoDetect ? "success" : undefined}>{tr.autoDetect ? "On" : "Off"}</Badge>
          </InlineStack>
        </InlineStack>
        <div>
          <Button size="slim" onClick={() => update(["translation", "autoDetect"], !tr.autoDetect)}>
            {tr.autoDetect ? "Turn off" : "Turn on"}
          </Button>
        </div>
        {!tr.autoDetect && <Banner tone="info">Export in default language</Banner>}

        <Text as="h3" variant="headingSm">Language settings</Text>
        <InlineStack gap="200" blockAlign="center">
          {langs.map((l) => (
            <Button key={l.name} size="slim" pressed={l.name === active.name}
              onClick={() => update(["translation", "active"], l.name)}>{l.name}</Button>
          ))}
          <Button size="slim" icon={PlusIcon} accessibilityLabel="Add language" onClick={() => setAdding(!adding)} />
        </InlineStack>
        {adding && (
          <InlineStack gap="200" blockAlign="end" wrap={false}>
            <div style={{ flex: 1 }}>
              <TextField label="Language name" value={newLang} onChange={setNewLang} autoComplete="off" />
            </div>
            <Button onClick={addLang}>Add</Button>
          </InlineStack>
        )}

        <InlineStack align="space-between" blockAlign="center">
          <Text as="h3" variant="headingSm">{active.name}</Text>
          <Button variant="plain" tone="critical" icon={DeleteIcon} disabled={langs.length < 2} onClick={removeLang}>Delete</Button>
        </InlineStack>
        <Checkbox label="Set as default" checked={active.isDefault} disabled={active.isDefault} onChange={setDefault} />
        {LABELS.map(([key, label]) => (
          <TextField key={`${active.name}-${key}`} label={label} value={active.labels[key] ?? ""}
            onChange={(v) => setLabel(key, v)} autoComplete="off" />
        ))}
      </BlockStack>
    );
  };

  const MENU = [["style", "Style"], ["content", "Content"], ["translation", "Translation"]];
  const body = { style: stylePanel, content: contentPanel, translation: translationPanel };

  return (
    <>
      <AppBridgeSaveBar visible={isDirty} saving={saving} onSave={handleSave} onDiscard={handleDiscard} />
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 16, alignItems: "start" }}>
        <BlockStack gap="300">
          {error && <Banner tone="critical" onDismiss={() => setError(null)}>{error}</Banner>}
          <Card padding="0">
            {panel === null ? (
              MENU.map(([key, label], i) => (
                <div key={key}>
                  {i > 0 && <Divider />}
                  <div role="button" tabIndex={0} style={{ padding: 16, cursor: "pointer" }}
                    onClick={() => setPanel(key)} onKeyDown={(e) => e.key === "Enter" && setPanel(key)}>
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="span" fontWeight="semibold">{label}</Text>
                      <Icon source={ChevronRightIcon} />
                    </InlineStack>
                  </div>
                </div>
              ))
            ) : (
              <>
                <Box padding="300">
                  <Button variant="plain" icon={ChevronLeftIcon} onClick={() => setPanel(null)}>
                    {MENU.find(([k]) => k === panel)[1]}
                  </Button>
                </Box>
                <Divider />
                <Box padding="400">{body[panel]()}</Box>
              </>
            )}
          </Card>
        </BlockStack>
        <Preview t={t} />
      </div>
    </>
  );
}