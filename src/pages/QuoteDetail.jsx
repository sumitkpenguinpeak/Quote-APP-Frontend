import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Page, Layout, Card, BlockStack, InlineStack, Text, TextField, Button, Banner,
  Box, Icon, Collapsible, Divider, Popover, ActionList, SkeletonBodyText,
  FormLayout, Select, Checkbox, RadioButton, Modal, Spinner, Badge,
} from "@shopify/polaris";
import { DeleteIcon, ChevronDownIcon, ChevronUpIcon, MenuHorizontalIcon, PlusCircleIcon, PlusIcon, SearchIcon } from "@shopify/polaris-icons";
import api from "../services/api";
import AppBridgeSaveBar from "../components/AppBridgeSaveBar";
import usePlan from "../hooks/usePlan";

/* ---------------- helpers ---------------- */
const getShop = () => new URLSearchParams(window.location.search).get("shop") || "";
const getCurrency = (quote) => quote?.currency || "INR";

const money = (amount, currency = "INR") =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
const fmtDate = (v) => {
  const d = new Date(v);
  return isNaN(d) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
};
const fmtTime = (v) => {
  const d = new Date(v);
  return isNaN(d) ? "" : d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

// properties: [{ name, value }] (API ma object {name: value} pan aavi shake)
function normalizeProps(raw) {
  if (!raw) return [];
  if (typeof raw === "string") { try { return normalizeProps(JSON.parse(raw)); } catch { return []; } }
  if (Array.isArray(raw)) return raw.map((p) => ({ name: String(p.name ?? p.key ?? ""), value: String(p.value ?? "") })).filter((p) => p.name);
  return Object.entries(raw).map(([name, value]) => ({ name, value: String(value ?? "") }));
}

/**
 * API response ne page na format ma convert kare chhe.
 * Tamara backend na field names alag hoy to ahiya j badlo (bijje kyay nahi).
 */
function mapQuote(raw) {
  const q = raw?.quote ?? raw ?? {};
  const customer = q.customer ?? {};
  const cn = q.customer_note;
  const createdAt = q.created_at ?? q.createdAt ?? "";
  const name =
    customer.name ?? q.customer_name ??
    [customer.first_name, customer.last_name].filter(Boolean).join(" ");
  const email = customer.email ?? q.customer_email ?? q.email ?? "";

  // API ni `items` key: shopify_product_id, shopify_variant_id, product_title, variant_title,
  // sku, image_url, quantity, original_price, customer_requested_price
  const items = (q.items ?? []).map((i, idx) => ({
    id: String(i.id ?? i.shopify_variant_id ?? idx), // UI mate unique key
    serverId: i.id, // DB row id (hoy to PUT ma pachhi moklvu)
    shopifyProductId: i.shopify_product_id,
    shopifyVariantId: i.shopify_variant_id,
    title: i.product_title ?? "",
    variantTitle: i.variant_title ?? "",
    sku: i.sku ?? "",
    image: i.image_url ?? "",
    qty: Number(i.quantity ?? 1),
    originalPrice: Number(i.original_price ?? 0),
    price: Number(i.customer_requested_price ?? i.original_price ?? 0), // quoted price (editable)
    properties: normalizeProps(i.properties ?? i.custom_attributes),
    discountType: i.discount_type === "percentage" ? "percentage" : "amount", // DB 'fixed' = frontend 'amount'
    discountValue: Number(i.discount_value ?? 0),
  }));

  // Customer ni badhi details (khali hoy e skip thase)
  const detailsObj = (v) => {
    if (typeof v === "string") { try { v = JSON.parse(v); } catch { return []; } }
    return v && typeof v === "object" && !Array.isArray(v) ? Object.entries(v) : [];
  };
  const prettyKey = (k) => String(k).replace(/[_-]+/g, " ").replace(/^./, (c) => c.toUpperCase());
  const address = [customer.address, customer.city, customer.state, customer.zip, customer.country].filter(Boolean).join(", ");
  const customerInfo = [
    ["Name", name],
    ["Email", email],
    ["Phone", customer.phone],
    ["Company", customer.company_name],
    ["VAT number", customer.vat_number],
    ["Address", address],
    ...detailsObj(customer.company_details).map(([k, v]) => [prettyKey(k), typeof v === "object" ? JSON.stringify(v) : v]),
    ...(q.field_values ?? []).map((f) => [f.label, f.value]),
  ]
    .map(([label, value]) => ({ label, value: value == null ? "" : String(value).trim() }))
    .filter((r) => r.label && r.value);

  return {
    customerInfo,
    number: q.quote_number ?? q.quote_id ?? q.number ?? "",
    status: q.status ?? "",
    draftOrderId: q.shopify_draft_order_id ?? null, // draft order ban gayo hoy to id aave
    createdAt,
    name,
    email,
    site: q.site ?? cn?.site ?? "",
    customerMessage: q.message ?? cn?.message ?? (typeof cn === "string" ? cn : ""),
    items,
    extras: mapExtras(q),
    note: q.merchant_note ?? q.note ?? "",
    dueDate: String(q.due_date ?? "").slice(0, 10),
  };
}

/* ---------------- discount / shipping / tax ---------------- */
const DEFAULT_EXTRAS = {
  discount: { type: "amount", value: 0, reason: "", showOnDraftOrder: false, showOnEmail: false, showOnInvoicePdf: false, showOnPdf: false },
  shipping: { mode: "custom", rate: 0, name: "" },
  tax: { type: "amount", value: 0, name: "" },
};
const TYPE_OPTIONS = [{ label: "Amount", value: "amount" }, { label: "Percentage", value: "percentage" }];
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const calcAmount = (x, base) =>
  round2(x.type === "percentage" ? (base * (Number(x.value) || 0)) / 100 : Number(x.value) || 0);

// API response mathi discount/shipping/tax (field names alag hoy to ahiya badlo)
function mapExtras(q) {
  return {
    discount: {
      type: q.discount_type ?? "amount",
      value: Number(q.discount_value ?? q.discount ?? 0),
      reason: q.discount_reason ?? "",
      showOnDraftOrder: !!q.discount_show_on_draft_order,
      showOnEmail: !!q.discount_show_on_email,
      showOnInvoicePdf: !!q.discount_show_on_invoice_pdf,
      showOnPdf: !!q.discount_show_on_pdf,
    },
    shipping: { mode: "custom", rate: Number(q.shipping_rate ?? q.shipping ?? 0), name: q.shipping_name ?? "" },
    tax: { type: q.tax_type ?? "amount", value: Number(q.tax_value ?? q.tax ?? 0), name: q.tax_name ?? "" },
  };
}

// Product wise discount (line ni upar): amount = poori line mathi ochhu, percentage = line total na %
const itemDiscountAmt = (i) => {
  const base = i.qty * i.price;
  const v = Number(i.discountValue) || 0;
  return round2(Math.min(i.discountType === "percentage" ? (base * Math.min(v, 100)) / 100 : v, base));
};
const lineTotal = (i) => round2(i.qty * i.price - itemDiscountAmt(i));

function computeTotals(items, extras) {
  const subtotal = items.reduce((a, i) => a + lineTotal(i), 0);
  const discountAmt = Math.min(calcAmount(extras.discount, subtotal), subtotal);
  const shippingAmt = round2(extras.shipping.rate);
  const taxAmt = calcAmount(extras.tax, subtotal - discountAmt);
  return { subtotal, discountAmt, shippingAmt, taxAmt, total: subtotal - discountAmt + shippingAmt + taxAmt };
}

// PUT body ma discount/shipping/tax na fields
const extrasPayload = (items, extras) => {
  const t = computeTotals(items, extras);
  const { discount: d, shipping: s, tax: x } = extras;
  return {
    discount: t.discountAmt,
    discount_type: d.type,
    discount_value: Number(d.value) || 0,
    discount_reason: d.reason,
    discount_show_on_draft_order: d.showOnDraftOrder,
    discount_show_on_email: d.showOnEmail,
    discount_show_on_invoice_pdf: d.showOnInvoicePdf,
    discount_show_on_pdf: d.showOnPdf,
    shipping: t.shippingAmt,
    shipping_name: s.name,
    tax: t.taxAmt,
    tax_type: x.type,
    tax_value: Number(x.value) || 0,
    tax_name: x.name,
  };
};

// modal khule tyare draft ne current value thi reset kare
function useDraft(open, value) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (open) setDraft(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return [draft, setDraft];
}

const numValue = (v) => (v ? String(v) : "");

function DiscountModal({ open, value, onClose, onApply }) {
  const [d, setD] = useDraft(open, value);
  const set = (k) => (v) => setD((p) => ({ ...p, [k]: v }));
  const pct = d.type === "percentage";
  const apply = () => {
    const n = Math.max(0, Number(d.value) || 0);
    onApply({ ...d, value: pct ? Math.min(n, 100) : n });
  };
  return (
    <Modal open={open} onClose={onClose} title="Add discount"
      primaryAction={{ content: "Apply", onAction: apply }}
      secondaryActions={[{ content: "Cancel", onAction: onClose }]}>
      <Modal.Section>
        <FormLayout>
          <FormLayout.Group>
            <Select label="Discount type" options={TYPE_OPTIONS} value={d.type} onChange={set("type")} />
            <TextField label="Discount value" type="number" min={0} autoComplete="off" placeholder="0.00"
              value={numValue(d.value)} onChange={set("value")}
              prefix={pct ? undefined : "$"} suffix={pct ? "%" : undefined} />
          </FormLayout.Group>
          <TextField label="Reason for discount" autoComplete="off" value={d.reason} onChange={set("reason")}
            helpText="This reason is visible to customers only for draft orders." />
          <BlockStack gap="200">
            <Text as="h3" variant="headingSm">Discount visibility</Text>
            {[
              ["showOnDraftOrder", "Display discount reason on the draft order"],
              ["showOnEmail", "Display discount value on the Email"],
              ["showOnInvoicePdf", "Display discount value on the Invoice PDF"],
              ["showOnPdf", "Display discount value on the PDF"],
            ].map(([k, label]) => (
              <Checkbox key={k} label={label} checked={!!d[k]} onChange={set(k)} />
            ))}
          </BlockStack>
        </FormLayout>
      </Modal.Section>
    </Modal>
  );
}

function ShippingModal({ open, value, quoteId, currency, onClose, onApply }) {
  const [s, setS] = useDraft(open, value);
  const [rates, setRates] = useState([]);
  const [loadingRates, setLoadingRates] = useState(false);
  const [reason, setReason] = useState(null); // null | no_address | no_items | no_rates | shopify_error | request_failed
  const [warn, setWarn] = useState(true);
  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));

  // Popup khule tyare store na eligible Shopify shipping rates lavo (customer na shipping address pramane)
  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setWarn(true);
    setLoadingRates(true);
    setReason(null);
    setRates([]);

    api
      .get(`/quotes/${encodeURIComponent(quoteId)}/shipping-rates`, { params: { shop: getShop() } })
      .then((res) => {
        if (cancelled) return;
        const d = res?.data?.data ?? {};
        setRates(d.rates ?? []);
        setReason(d.reason ?? null);
      })
      .catch(() => {
        if (!cancelled) setReason("request_failed");
      })
      .finally(() => {
        if (!cancelled) setLoadingRates(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, quoteId]);

  const REASON_TEXT = {
    no_rates: "Shipping option is not available for this customer's address",
    no_address: "Add the customer's shipping address (address and country) to see your Shopify shipping rates.",
    no_items: "Add products to this quote to see your Shopify shipping rates.",
    shopify_error: "Couldn't load your Shopify shipping rates. You can still use a custom rate.",
    request_failed: "Couldn't load your Shopify shipping rates. You can still use a custom rate.",
  };

  const isShopify = s.mode === "shopify";
  const canUseShopify = !loadingRates && rates.length > 0;

  const pickShopify = () =>
    setS((p) => ({ ...p, mode: "shopify", handle: p.handle && rates.some((r) => r.handle === p.handle) ? p.handle : rates[0]?.handle }));

  const apply = () => {
    if (isShopify) {
      const r = rates.find((x) => x.handle === s.handle);
      if (!r) return;
      onApply({ ...s, mode: "shopify", handle: r.handle, name: r.title, rate: r.price });
    } else {
      onApply({ ...s, mode: "custom", handle: undefined, rate: Math.max(0, Number(s.rate) || 0) });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add shipping"
      primaryAction={{ content: "Apply", onAction: apply, disabled: isShopify && !s.handle }}
      secondaryActions={[{ content: "Cancel", onAction: onClose }]}>
      <Modal.Section>
        <BlockStack gap="300">
          {warn && !loadingRates && reason && (
            <Banner tone="warning" onDismiss={() => setWarn(false)}>
              {REASON_TEXT[reason] ?? REASON_TEXT.request_failed}
            </Banner>
          )}

          <RadioButton id="ship-custom" name="ship-mode" label="Custom shipping rate"
            checked={!isShopify} onChange={() => setS((p) => ({ ...p, mode: "custom" }))} />
          {!isShopify && (
            <Box paddingInlineStart="600">
              <BlockStack gap="300">
                <TextField label="Shipping rate" type="number" min={0} prefix="$" autoComplete="off" placeholder="0.00"
                  value={numValue(s.rate)} onChange={set("rate")} />
                <TextField label="Rate name" placeholder="Enter rate name" autoComplete="off" value={s.name} onChange={set("name")} />
              </BlockStack>
            </Box>
          )}

          <RadioButton id="ship-shopify" name="ship-mode" label="Shopify shipping rate"
            disabled={!canUseShopify} checked={isShopify} onChange={pickShopify}
            helpText={loadingRates
              ? "Loading eligible shipping rates…"
              : "Select eligible shipping rates based on your Shopify Shipping settings"} />
          {loadingRates && (
            <Box paddingInlineStart="600"><Spinner size="small" /></Box>
          )}
          {isShopify && canUseShopify && (
            <Box paddingInlineStart="600">
              <BlockStack gap="200">
                {rates.map((r) => (
                  <RadioButton key={r.handle} id={`ship-rate-${r.handle}`} name="ship-rate"
                    label={`${r.title} - ${money(r.price, currency || "INR")}`}
                    checked={s.handle === r.handle} onChange={() => setS((p) => ({ ...p, handle: r.handle }))} />
                ))}
              </BlockStack>
            </Box>
          )}
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

function TaxModal({ open, value, onClose, onApply }) {
  const [x, setX] = useDraft(open, value);
  const set = (k) => (v) => setX((p) => ({ ...p, [k]: v }));
  const pct = x.type === "percentage";
  const apply = () => {
    const n = Math.max(0, Number(x.value) || 0);
    onApply({ ...x, value: pct ? Math.min(n, 100) : n });
  };
  return (
    <Modal open={open} onClose={onClose} title="Add Tax Rate"
      primaryAction={{ content: "Apply", onAction: apply }}
      secondaryActions={[{ content: "Cancel", onAction: onClose }]}>
      <Modal.Section>
        <FormLayout>
          <FormLayout.Group>
            <Select label="Tax type" options={TYPE_OPTIONS} value={x.type} onChange={set("type")} />
            <TextField label="Tax value" type="number" min={0} autoComplete="off" placeholder="0.00"
              value={numValue(x.value)} onChange={set("value")}
              prefix={pct ? undefined : "$"} suffix={pct ? "%" : undefined} />
          </FormLayout.Group>
          <TextField label="Tax name" placeholder="VAT" maxLength={15} showCharacterCount autoComplete="off"
            value={x.name} onChange={set("name")} />
        </FormLayout>
      </Modal.Section>
    </Modal>
  );
}

/* ---------------- Add custom item popup ---------------- */
function CustomItemModal({ open, onClose, onAdd }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [sku, setSku] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(""); setDescription(""); setPrice(""); setQuantity("1"); setSku(""); setError("");
    }
  }, [open]);

  const add = () => {
    const cleanTitle = title.trim();
    const amount = Number(price);
    const qty = Number(quantity);
    if (!cleanTitle) { setError("Please enter an item name."); return; }
    if (price === "" || !Number.isFinite(amount) || amount < 0) { setError("Enter a valid price (0 or higher)."); return; }
    if (!Number.isInteger(qty) || qty < 1) { setError("Quantity must be at least 1."); return; }
    onAdd({ title: cleanTitle, description: description.trim(), price: amount, quantity: qty, sku: sku.trim() });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Add custom item"
      primaryAction={{ content: "Add item", onAction: add }}
      secondaryActions={[{ content: "Cancel", onAction: onClose }]}>
      <Modal.Section>
        <BlockStack gap="300">
          {error && <Banner tone="critical">{error}</Banner>}
          <TextField label="Item name" value={title} onChange={setTitle} autoComplete="off" requiredIndicator placeholder="e.g. Installation service" />
          <TextField label="Description (optional)" value={description} onChange={setDescription} multiline={3} autoComplete="off" placeholder="Add item details" />
          <FormLayout.Group>
            <TextField label="Price" type="number" min={0} value={price} onChange={setPrice} prefix="$" autoComplete="off" placeholder="0.00" />
            <TextField label="Quantity" type="number" min={1} value={quantity} onChange={setQuantity} autoComplete="off" />
          </FormLayout.Group>
          <TextField label="SKU (optional)" value={sku} onChange={setSku} autoComplete="off" />
          <Text as="p" tone="subdued" variant="bodySm">Custom items are not linked to a Shopify catalog product. They can still be included in the quote and draft order.</Text>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

/* ---------------- Select products popup (Add product) ---------------- */
const SEARCH_BY_OPTIONS = [
  { label: "All", value: "all" },
  { label: "Title", value: "title" },
  { label: "SKU", value: "sku" },
  { label: "Vendor", value: "vendor" },
];

// GET /products na response ni dar ek row (variant) ne UI format ma convert kare chhe
const mapProduct = (p) => ({
  key: String(p.variant_id ?? p.id),
  productId: p.product_id,
  variantId: p.variant_id,
  title: p.product_title ?? p.title ?? "",
  variantTitle: p.variant_title ?? "",
  sku: p.sku ?? "",
  image: p.image_url ?? p.image ?? "",
  price: Number(p.price ?? 0),
  available: p.available ?? p.inventory_quantity ?? null,
});

const productLabel = (p) =>
  p.variantTitle && p.variantTitle !== "Default Title" ? `${p.title} - ${p.variantTitle}` : p.title;

function ProductPickerModal({ open, onClose, onSelect , currency }) {
  const [query, setQuery] = useState("");
  const [searchBy, setSearchBy] = useState("all");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState({}); // variantId -> product (search badlo to pan yaad rahe)
  const reqRef = useRef(0);

  // GET /products?search=&search_by=&after=  (store na live products)
  const fetchPage = useCallback(async (after) => {
    const reqId = ++reqRef.current; // juna request no response ignore karva mate
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/products", {
        params: { shop: getShop(), search: query.trim(), search_by: searchBy, first: 25, ...(after ? { after } : {}) },
      });
      if (reqId !== reqRef.current) return;
      const body = res?.data ?? {};
      const list = (body.data ?? []).map(mapProduct);
      setProducts((prev) => (after ? [...prev, ...list] : list));
      setCursor(body.next_cursor ?? body.meta?.next_cursor ?? null);
    } catch (e) {
      if (reqId === reqRef.current) setError(e?.response?.data?.message || "Could not load products. Please try again.");
    } finally {
      if (reqId === reqRef.current) setLoading(false);
    }
  }, [query, searchBy]);

  // popup khule tyare ane search badlay tyare (debounce sathe)
  useEffect(() => {
    if (!open) return undefined;
    const t = setTimeout(() => fetchPage(null), query ? 350 : 0);
    return () => clearTimeout(t);
  }, [open, fetchPage, query]);

  const visible = useMemo(
    () => (inStockOnly ? products.filter((p) => (p.available ?? 0) > 0) : products),
    [products, inStockOnly]
  );
  const count = Object.keys(selected).length;

  const reset = () => {
    setSelected({});
    setQuery("");
    setSearchBy("all");
    setInStockOnly(false);
  };
  const close = () => { reset(); onClose(); };
  const confirm = () => { onSelect(Object.values(selected)); reset(); };
  const toggle = (p) =>
    setSelected((prev) => {
      const next = { ...prev };
      if (next[p.key]) delete next[p.key];
      else next[p.key] = p;
      return next;
    });

  // list nichli taraf pahonche tyare next page load
  const onScroll = (e) => {
    const el = e.currentTarget;
    if (cursor && !loading && el.scrollTop + el.clientHeight >= el.scrollHeight - 60) fetchPage(cursor);
  };

  return (
    <Modal open={open} onClose={close} title="Select products"
      footer={<Text as="span" tone="subdued">{count} product{count === 1 ? "" : "s"} selected</Text>}
      primaryAction={{ content: "Select", onAction: confirm, disabled: count === 0 }}
      secondaryActions={[{ content: "Cancel", onAction: close }]}>
      <Modal.Section>
        <BlockStack gap="200">
          <InlineStack gap="200" wrap={false} blockAlign="center">
            <div style={{ flex: 1 }}>
              <TextField label="Search products" labelHidden autoFocus autoComplete="off" placeholder="Search products"
                prefix={<Icon source={SearchIcon} />} value={query} onChange={setQuery}
                clearButton onClearButtonClick={() => setQuery("")} />
            </div>
            <div style={{ width: 170 }}>
              <Select label="Search by" labelInline options={SEARCH_BY_OPTIONS} value={searchBy} onChange={setSearchBy} />
            </div>
          </InlineStack>
          <div>
            <Popover
              active={filterOpen}
              onClose={() => setFilterOpen(false)}
              activator={
                <Button size="slim" icon={PlusIcon} onClick={() => setFilterOpen((v) => !v)}>
                  {inStockOnly ? "Filter: In stock" : "Add filter"}
                </Button>
              }
            >
              <Box padding="300">
                <Checkbox label="In stock only" checked={inStockOnly} onChange={setInStockOnly} />
              </Box>
            </Popover>
          </div>
          {error && <Banner tone="critical" onDismiss={() => setError(null)}>{error}</Banner>}
        </BlockStack>
      </Modal.Section>

      <Modal.Section flush>
        <div onScroll={onScroll} style={{ maxHeight: 360, overflowY: "auto", borderTop: "1px solid var(--p-color-border-secondary)" }}>
          {loading && products.length === 0 && (
            <div style={{ display: "grid", placeItems: "center", padding: 32 }}><Spinner size="small" /></div>
          )}
          {!loading && !error && visible.length === 0 && (
            <Box padding="400"><Text as="p" tone="subdued" alignment="center">No products found</Text></Box>
          )}
          {visible.map((p) => (
            <div key={p.key} onClick={() => toggle(p)}
              style={{
                display: "grid", gridTemplateColumns: "24px 40px minmax(0,1fr) 110px 84px", gap: 12, alignItems: "center",
                padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid var(--p-color-border-secondary)",
                background: selected[p.key] ? "var(--p-color-bg-surface-selected)" : undefined,
              }}>
              <div onClick={(e) => e.stopPropagation()}>
                <Checkbox label={productLabel(p)} labelHidden checked={!!selected[p.key]} onChange={() => toggle(p)} />
              </div>
              <Thumb src={p.image} />
              <Text as="span">{productLabel(p)}</Text>
              <Text as="span" tone="subdued" alignment="end">{p.available == null ? "" : `${p.available} available`}</Text>
              <Text as="span" alignment="end">{money(p.price, currency || "INR")}</Text>
            </div>
          ))}
          {loading && products.length > 0 && (
            <div style={{ display: "grid", placeItems: "center", padding: 12 }}><Spinner size="small" /></div>
          )}
        </div>
      </Modal.Section>
    </Modal>
  );
}

/* ---------------- Product wise discount popup ---------------- */
function ItemDiscountModal({ open, item, onClose, onApply }) {
  const [type, setType] = useState("amount");
  const [value, setValue] = useState("");
  useEffect(() => {
    if (open && item) {
      setType(item.discountType || "amount");
      setValue(item.discountValue ? String(item.discountValue) : "");
    }
  }, [open, item]);

  const num = Math.max(0, Number(value) || 0);
  const v = type === "percentage" ? Math.min(num, 100) : num;
  return (
    <Modal open={open} onClose={onClose} title={`Discount${item?.title ? ` - ${item.title}` : ""}`}
      primaryAction={{ content: "Apply", onAction: () => onApply({ discountType: type, discountValue: v }) }}
      secondaryActions={[
        ...(item?.discountValue ? [{ content: "Remove discount", destructive: true, onAction: () => onApply({ discountType: "amount", discountValue: 0 }) }] : []),
        { content: "Cancel", onAction: onClose },
      ]}>
      <Modal.Section>
        <FormLayout>
          <FormLayout.Group>
            <Select label="Discount type" options={TYPE_OPTIONS} value={type} onChange={setType} />
            <TextField label="Value" type="number" min={0} autoComplete="off" value={value} onChange={setValue}
              prefix={type === "amount" ? "$" : undefined} suffix={type === "percentage" ? "%" : undefined} />
          </FormLayout.Group>
        </FormLayout>
      </Modal.Section>
    </Modal>
  );
}

/* ---------------- Add property popup ---------------- */
function PropertyModal({ open, item, onClose, onApply }) {
  const [rows, setRows] = useState([]);
  // popup khule tyare item ni current properties thi reset
  useEffect(() => {
    if (open) setRows(item?.properties?.length ? item.properties.map((p) => ({ ...p })) : [{ name: "", value: "" }]);
  }, [open, item]);

  const setRow = (idx, patch) => setRows((p) => p.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  const apply = () => onApply(rows.map((r) => ({ name: r.name.trim(), value: r.value.trim() })).filter((r) => r.name));

  return (
    <Modal open={open} onClose={onClose} title={`Properties${item?.title ? ` - ${item.title}` : ""}`}
      primaryAction={{ content: "Save", onAction: apply }}
      secondaryActions={[{ content: "Cancel", onAction: onClose }]}>
      <Modal.Section>
        <BlockStack gap="300">
          {rows.map((r, idx) => (
            <InlineStack key={idx} gap="200" wrap={false} blockAlign="end">
              <div style={{ flex: 1 }}>
                <TextField label="Name" autoComplete="off" value={r.name} onChange={(v) => setRow(idx, { name: v })} />
              </div>
              <div style={{ flex: 1 }}>
                <TextField label="Value" autoComplete="off" value={r.value} onChange={(v) => setRow(idx, { value: v })} />
              </div>
              <Button variant="tertiary" icon={DeleteIcon} accessibilityLabel="Remove property"
                onClick={() => setRows((p) => p.filter((_, i) => i !== idx))} />
            </InlineStack>
          ))}
          <div>
            <Button variant="plain" icon={PlusCircleIcon} onClick={() => setRows((p) => [...p, { name: "", value: "" }])}>
              Add another property
            </Button>
          </div>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

/* ---------------- Cancel Quote confirm popup ---------------- */
function CancelQuoteModal({ open, cancelling, error, onClose, onConfirm }) {
  return (
    <Modal
      open={open}
      onClose={cancelling ? () => {} : onClose}
      title="Cancel quote?"
      primaryAction={{ content: "Cancel quote", destructive: true, onAction: onConfirm, loading: cancelling }}
      secondaryActions={[{ content: "Keep quote", onAction: onClose, disabled: cancelling }]}
    >
      <Modal.Section>
        <BlockStack gap="200">
          {error && <Banner tone="critical">{error}</Banner>}
          <Text as="p" tone="subdued">
            This quote will be cancelled and can no longer be edited or converted into a draft order.
          </Text>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

/* ---------------- Send Proposal Email popup ---------------- */
function ProposalModal({ open, sending, error, email, message, onMessage, onClose, onConfirm, title = "Send proposal email", helpText = "The quote PDF will be attached to the email." }) {
  return (
    <Modal
      open={open}
      onClose={sending ? () => {} : onClose}
      title={title}
      primaryAction={{ content: "Send email", onAction: onConfirm, loading: sending, disabled: !email }}
      secondaryActions={[{ content: "Cancel", onAction: onClose, disabled: sending }]}
    >
      <Modal.Section>
        <BlockStack gap="300">
          {error && <Banner tone="critical">{error}</Banner>}
          <TextField label="To" value={email || ""} disabled autoComplete="off" />
          <TextField label="Message (optional)" multiline={4} autoComplete="off" value={message} onChange={onMessage}
            helpText={helpText} />
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

/* ---------------- Delete Quote confirm popup ---------------- */
function DeleteQuoteModal({ open, deleting, error, number, onClose, onConfirm }) {
  return (
    <Modal
      open={open}
      onClose={deleting ? () => {} : onClose}
      title="Delete quote?"
      primaryAction={{ content: "Delete", destructive: true, onAction: onConfirm, loading: deleting }}
      secondaryActions={[{ content: "Cancel", onAction: onClose, disabled: deleting }]}
    >
      <Modal.Section>
        <BlockStack gap="200">
          {error && <Banner tone="critical">{error}</Banner>}
          <Text as="p" tone="subdued">
            Quote {number} and its items, messages and files will be permanently deleted. This cannot be undone.
            A draft order already created in Shopify (if any) will not be deleted.
          </Text>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

/* ---------------- Create Draft Order popup ---------------- */
function DraftOrderModal({ open, creating, error, summary, onClose, onConfirm }) {
  return (
    <Modal
      open={open}
      onClose={creating ? () => {} : onClose}
      title="Create Draft Order"
      primaryAction={{ content: "Create Draft Order", onAction: onConfirm, loading: creating }}
      secondaryActions={[{ content: "Cancel", onAction: onClose, disabled: creating }]}
    >
      <Modal.Section>
        <BlockStack gap="200">
          {error && <Banner tone="critical">{error}</Banner>}
          <Text as="p" tone="subdued">{summary}</Text>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}

/**
 * PUT /quotes/{quote} na body no format.
 * Backend na field names alag hoy to ahiya j badlo.
 */
const buildPayload = ({ items, extras, note, dueDate }) => ({
  items: items.map((i) => ({
    ...(i.serverId != null ? { id: i.serverId } : {}),
    shopify_product_id: i.shopifyProductId,
    shopify_variant_id: i.shopifyVariantId,
    product_title: i.title,
    variant_title: i.variantTitle,
    sku: i.sku,
    image_url: i.image,
    quantity: i.qty,
    original_price: i.originalPrice,
    customer_requested_price: i.price,
    discount_type: Number(i.discountValue) > 0 ? (i.discountType === "percentage" ? "percentage" : "fixed") : null,
    discount_value: Number(i.discountValue) > 0 ? Number(i.discountValue) : null,
    properties: (i.properties ?? []).map((p) => ({ name: p.name, value: p.value })),
  })),
  ...extrasPayload(items, extras),
  merchant_note: note,
  due_date: dueDate || null,
});

const GRID = { display: "grid", gridTemplateColumns: "minmax(0,1fr) 84px 112px 96px 32px", gap: 12, alignItems: "start" };
const Thumb = ({ src }) =>
  src ? (
    <img src={src} alt="" style={{ width: 40, height: 48, borderRadius: 6, objectFit: "cover", flexShrink: 0 }} />
  ) : (
    <div style={{ width: 40, height: 48, borderRadius: 6, background: "#c9cccf", flexShrink: 0 }} />
  );

export default function QuoteDetailPage() {
  // route: /quotedetail/:id  -> URL ma 64 aave chhe, e j quoteId
  // param naam ghano kare to pan chale: id / quoteId / pahelo param
  const params = useParams();
  const quoteId = params.id ?? params.quoteId ?? Object.values(params)[0];
  const navigate = useNavigate();
  const plan = usePlan(); // plan pramane locked features disable karva

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [items, setItems] = useState([]);
  const [extras, setExtras] = useState(DEFAULT_EXTRAS);
  const [note, setNote] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [proposalSending, setProposalSending] = useState(false);
  const [proposalError, setProposalError] = useState(null);
  const [proposalMessage, setProposalMessage] = useState("");
  // Invoice (draft order bani gaya pachhi): download + email
  const [invoiceDownloading, setInvoiceDownloading] = useState(false);
  const [invoiceSending, setInvoiceSending] = useState(false);
  const [invoiceError, setInvoiceError] = useState(null);
  const [invoiceMessage, setInvoiceMessage] = useState("");
  const [duplicating, setDuplicating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState(null);
  const [discItemId, setDiscItemId] = useState(null); // kya item ni discount popup khuli chhe
  const [propItemId, setPropItemId] = useState(null); // kya item ni property popup khuli chhe
  const [modal, setModal] = useState(null); // "discount" | "shipping" | "tax" | "products" | "customItem"
  const [infoOpen, setInfoOpen] = useState(true);
  const [noteOpen, setNoteOpen] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [taxWarn, setTaxWarn] = useState(true); // tax row niche no note dismiss thayo ke nahi

  // saved = last server-saved state, baki badhu live draft chhe
  const [saved, setSaved] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [creating, setCreating] = useState(false); // draft order banavi rahyo chhe
  const [createError, setCreateError] = useState(null);

  /* ---------- GET /quotes/{quote} ---------- */
  const loadQuote = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/quotes/${encodeURIComponent(quoteId)}?shop=${encodeURIComponent(getShop())}`);
      const q = mapQuote(res?.data?.data ?? res?.data);
      setQuote(q);
      setItems(q.items);
      setExtras(q.extras);
      setNote(q.note);
      setDueDate(q.dueDate);
      setSaved({ items: q.items, extras: q.extras, note: q.note, dueDate: q.dueDate });
    } catch (e) {
      setError(e?.response?.data?.message || "Could not load quote. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    loadQuote();
  }, [loadQuote]);

  const subtotal = useMemo(() => items.reduce((a, i) => a + lineTotal(i), 0), [items]);
  const { discountAmt, shippingAmt, taxAmt, total } = useMemo(() => computeTotals(items, extras), [items, extras]);

  /* ---------- Save bar: dirty / save / discard ---------- */
  const current = useMemo(() => ({ items, extras, note, dueDate }), [items, extras, note, dueDate]);
  const isDirty = useMemo(
    () => !!saved && JSON.stringify(current) !== JSON.stringify(saved),
    [current, saved]
  );

  // PUT /quotes/{quote}
  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await api.put(
        `/quotes/${encodeURIComponent(quoteId)}?shop=${encodeURIComponent(getShop())}`,
        buildPayload(current)
      );
      setSaved(current); // draft have "saved" baseline bani gayu -> save bar chhupai jashe
      window.shopify?.toast?.show("Quote saved");
    } catch (e) {
      setSaveError(e?.response?.data?.message || "Could not save quote. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [quoteId, current]);

  const handleDiscard = useCallback(() => {
    if (!saved) return;
    setItems(saved.items);
    setExtras(saved.extras);
    setNote(saved.note);
    setDueDate(saved.dueDate);
    setSaveError(null);
  }, [saved]);

  // GET /quotes/{quote}/export-pdf  -> PDF download
  const handleExport = async () => {
    // PDF server na saved data par banay chhe, etle unsaved changes hoy to pehla save karvu
    if (isDirty) {
      window.shopify?.toast?.show("Please save your changes before exporting.", { isError: true });
      return;
    }
    setExporting(true);
    try {
      const res = await api.get(
        `/quotes/${encodeURIComponent(quoteId)}/export-pdf?shop=${encodeURIComponent(getShop())}`,
        { responseType: "blob" }
      );

      // filename Content-Disposition mathi, nahi to quote number thi
      const cd = res.headers?.["content-disposition"] || "";
      const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
      const filename = match ? decodeURIComponent(match[1]) : `quote-${quote?.number || quoteId}.pdf`;

      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      window.shopify?.toast?.show("Quote exported");
    } catch (e) {
      // blob response ma error message JSON hoy to vanchi lo
      let message = "Could not export PDF. Please try again.";
      try {
        const text = await e?.response?.data?.text?.();
        message = (text && JSON.parse(text).message) || message;
      } catch { /* default message */ }
      setSaveError(message);
    } finally {
      setExporting(false);
    }
  };

  // "Create draft order" button -> confirm popup
  const startCreateDraftOrder = () => {
    // Draft order server na saved data par banay chhe, etle unsaved changes hoy to pehla save karvu
    if (isDirty) {
      window.shopify?.toast?.show("Please save your changes before creating a draft order.", { isError: true });
      return;
    }
    setCreateError(null);
    setModal("draftOrder");
  };

  // POST /quotes/{quote}/draft-order
  const handleCreateDraftOrder = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await api.post(
        `/quotes/${encodeURIComponent(quoteId)}/draft-order?shop=${encodeURIComponent(getShop())}`
      );
      const data = res?.data?.data ?? res?.data ?? {};

      setQuote((q) => ({ ...q, draftOrderId: data.shopify_draft_order_id ?? null, status: data.status ?? "converted" }));
      setModal(null);
      window.shopify?.toast?.show("Draft order created");
    } catch (e) {
      setCreateError(e?.response?.data?.message || "Could not create draft order. Please try again.");
    } finally {
      setCreating(false);
    }
  };
  const syncDraftOrder = async (direction) => {
    if (!quote?.draftOrderId) {
      window.shopify?.toast?.show("Create a Shopify draft order first.", { isError: true });
      return;
    }
    if (isDirty) {
      window.shopify?.toast?.show("Please save your quote changes before syncing.", { isError: true });
      return;
    }
    setSyncOpen(false);
    setSaving(true);
    try {
      await api.post(`/quotes/${encodeURIComponent(quoteId)}/sync-${direction}-draft-order?shop=${encodeURIComponent(getShop())}`);
      await loadQuote();
      window.shopify?.toast?.show(direction === "to" ? "Draft order updated from quote." : "Quote synced from draft order.");
    } catch (e) {
      window.shopify?.toast?.show(e?.response?.data?.message || "Could not sync quote and draft order.", { isError: true });
    } finally {
      setSaving(false);
    }
  };

  // Banelo draft order Shopify admin ma kholo
  const openDraftOrder = () => {
    const id = quote?.draftOrderId;
    if (!id) return;
    const handle = getShop().replace(".myshopify.com", "");
    window.open(
      window.shopify ? `shopify://admin/draft_orders/${id}` : `https://admin.shopify.com/store/${handle}/draft_orders/${id}`,
      "_top"
    );
  };

  // Send Proposal Email -> POST /quotes/{id}/send-proposal (PDF attach sathe customer ne email)
  const startSendProposal = () => {
    if (isDirty) {
      window.shopify?.toast?.show("Please save your changes before sending the proposal.", { isError: true });
      return;
    }
    setProposalError(null);
    setModal("proposal");
  };

  const handleSendProposal = async () => {
    setProposalSending(true);
    setProposalError(null);
    try {
      const res = await api.post(
        `/quotes/${encodeURIComponent(quoteId)}/send-proposal?shop=${encodeURIComponent(getShop())}`,
        { message: proposalMessage }
      );
      setModal(null);
      setProposalMessage("");
      window.shopify?.toast?.show(res?.data?.message || "Proposal email sent");
    } catch (e) {
      setProposalError(e?.response?.data?.message || "Could not send email. Please try again.");
    } finally {
      setProposalSending(false);
    }
  };

  // GET /quotes/{quote}/invoice-pdf -> Invoice PDF download (draft order bani gaya pachhi j)
  const handleDownloadInvoice = async () => {
    // Invoice server na saved data par banay chhe, etle unsaved changes hoy to pehla save karvu
    if (isDirty) {
      window.shopify?.toast?.show("Please save your changes before downloading the invoice.", { isError: true });
      return;
    }
    setInvoiceDownloading(true);
    try {
      const res = await api.get(
        `/quotes/${encodeURIComponent(quoteId)}/invoice-pdf?shop=${encodeURIComponent(getShop())}`,
        { responseType: "blob" }
      );

      const cd = res.headers?.["content-disposition"] || "";
      const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
      const filename = match ? decodeURIComponent(match[1]) : `invoice-${quote?.number || quoteId}.pdf`;

      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      window.shopify?.toast?.show("Invoice downloaded");
    } catch (e) {
      // blob response ma error message JSON hoy to vanchi lo
      let message = "Could not download the invoice. Please try again.";
      try {
        const text = await e?.response?.data?.text?.();
        message = (text && JSON.parse(text).message) || message;
      } catch { /* default message */ }
      setSaveError(message);
    } finally {
      setInvoiceDownloading(false);
    }
  };

  // Send Invoice -> POST /quotes/{id}/send-invoice (Invoice PDF attach sathe customer ne email)
  const startSendInvoice = () => {
    if (isDirty) {
      window.shopify?.toast?.show("Please save your changes before sending the invoice.", { isError: true });
      return;
    }
    setInvoiceError(null);
    setModal("invoice");
  };

  const handleSendInvoice = async () => {
    setInvoiceSending(true);
    setInvoiceError(null);
    try {
      const res = await api.post(
        `/quotes/${encodeURIComponent(quoteId)}/send-invoice?shop=${encodeURIComponent(getShop())}`,
        { message: invoiceMessage }
      );
      setModal(null);
      setInvoiceMessage("");
      window.shopify?.toast?.show(res?.data?.message || "Invoice email sent");
    } catch (e) {
      setInvoiceError(e?.response?.data?.message || "Could not send the invoice. Please try again.");
    } finally {
      setInvoiceSending(false);
    }
  };

  // Duplicate -> POST /quotes/{id}/duplicate, pachhi navo quote kholo
  const handleDuplicate = async () => {
    if (isDirty) {
      window.shopify?.toast?.show("Please save your changes before duplicating.", { isError: true });
      return;
    }
    setDuplicating(true);
    try {
      const res = await api.post(`/quotes/${encodeURIComponent(quoteId)}/duplicate?shop=${encodeURIComponent(getShop())}`);
      const newId = res?.data?.data?.id ?? res?.data?.id;
      window.shopify?.toast?.show("Quote duplicated");
      if (newId) navigate(`/quotedetail/${newId}${window.location.search}`);
    } catch (e) {
      window.shopify?.toast?.show(e?.response?.data?.message || "Could not duplicate quote. Please try again.", { isError: true });
    } finally {
      setDuplicating(false);
    }
  };

  // Delete Quote -> DELETE /quotes/{id}, pachhi quote list par jao
  const handleDeleteQuote = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.delete(`/quotes/${encodeURIComponent(quoteId)}?shop=${encodeURIComponent(getShop())}`);
      window.shopify?.toast?.show("Quote deleted");
      navigate(`/quotelist${window.location.search}`, { replace: true });
    } catch (e) {
      setDeleteError(e?.response?.data?.message || "Could not delete quote. Please try again.");
      setDeleting(false);
    }
  };

  // Cancel Quote -> PATCH /quotes/{id}/status { status: "cancelled" }
  const handleCancelQuote = async () => {
    setCancelling(true);
    setCancelError(null);
    try {
      const res = await api.patch(
        `/quotes/${encodeURIComponent(quoteId)}/status?shop=${encodeURIComponent(getShop())}`,
        { status: "cancelled" }
      );
      const data = res?.data?.data ?? res?.data ?? {};
      setQuote((q) => ({ ...q, status: data.status ?? "cancelled" }));
      setModal(null);
      window.shopify?.toast?.show("Quote cancelled");
    } catch (e) {
      setCancelError(e?.response?.data?.message || "Could not cancel quote. Please try again.");
    } finally {
      setCancelling(false);
    }
  };

  // Select products popup mathi aavela products ne quote items ma umero
  const addProducts = (picked) => {
    setItems((prev) => {
      const next = [...prev];
      picked.forEach((p) => {
        const idx = next.findIndex((i) => String(i.shopifyVariantId) === String(p.variantId));
        if (idx >= 0) {
          next[idx] = { ...next[idx], qty: next[idx].qty + 1 }; // already hoy to qty +1
        } else {
          next.push({
            id: `new-${p.variantId}-${Date.now()}`,
            serverId: undefined, // navo item -> PUT ma id nahi jay, backend create karshe
            shopifyProductId: p.productId,
            shopifyVariantId: p.variantId,
            title: p.title,
            variantTitle: p.variantTitle,
            sku: p.sku,
            image: p.image,
            qty: 1,
            originalPrice: p.price,
            price: p.price,
            properties: [],
            discountType: "amount",
            discountValue: 0,
          });
        }
      });
      return next;
    });
  };

  const addCustomItem = ({ title, description, price, quantity, sku }) => {
    const newItem = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      serverId: undefined,
      shopifyProductId: null,
      shopifyVariantId: null,
      title,
      variantTitle: description,
      sku,
      image: "",
      qty: quantity,
      originalPrice: price,
      price,
      properties: description ? [{ name: "Description", value: description }] : [],
      discountType: "amount",
      discountValue: 0,
      isCustom: true,
    };
    setItems((prev) => [...prev, newItem]);
    window.shopify?.toast?.show("Custom item added. Save the quote to keep your changes.");
  };

  const patchItem = (id, patch) => setItems((p) => p.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const removeItem = (id) => setItems((p) => p.filter((i) => i.id !== id));

  const extraRow = (key, addLabel, editLabel, amount, detail) => (
    <InlineStack key={key} align="space-between" blockAlign="center" wrap={false}>
      <InlineStack gap="200" blockAlign="center">
        <Button variant="plain" disabled={!plan.can("pricing_settings")} onClick={() => setModal(key)}>{amount > 0 ? editLabel : addLabel}</Button>
        {!plan.loading && !plan.can("pricing_settings") && <Badge tone="info">Pro</Badge>}
        {detail && <Text as="span" variant="bodySm" tone="subdued">{detail}</Text>}
      </InlineStack>
      <Text as="span">{key === "discount" && amount > 0 ? `-${money(amount, getCurrency(quote))}` : money(amount, getCurrency(quote))}</Text>
    </InlineStack>
  );

  /* ---------- loading / error ---------- */
  if (loading) {
    return (
      <Page title="Loading quote…" backAction={{ content: "Quotes", onAction: () => navigate(-1) }}>
        <Card><SkeletonBodyText lines={10} /></Card>
      </Page>
    );
  }

  if (error || !quote) {
    return (
      <Page title="Quote" backAction={{ content: "Quotes", onAction: () => navigate(-1) }}>
        <Banner tone="critical" title="Could not load quote" action={{ content: "Retry", onAction: loadQuote }}>
          {error}
        </Banner>
      </Page>
    );
  }

  const receivedAt = [fmtDate(quote.createdAt), fmtTime(quote.createdAt)].filter(Boolean).join(", ");

  return (
    <Page
      backAction={{ content: "Quotes", onAction: () => navigate(-1) }}
      title={`Quote ${quote.number}`}
      subtitle={receivedAt && `Received by ${receivedAt}`}
      secondaryActions={[{ content: duplicating ? "Duplicating…" : "Duplicate", onAction: handleDuplicate, disabled: duplicating }]}
      actionGroups={[{ title: "More actions", actions: [{ content: exporting ? "Exporting…" : "Export Quote", onAction: handleExport, disabled: exporting }, ...(quote.draftOrderId ? [{ content: invoiceDownloading ? "Preparing invoice…" : "Download invoice", onAction: handleDownloadInvoice, disabled: invoiceDownloading }, { content: "Send invoice", onAction: startSendInvoice }] : []), ...(quote.draftOrderId ? [{ content: "Update draft order", onAction: () => syncDraftOrder("to"), disabled: !plan.can("sync") }] : []), { content: quote.status === "cancelled" ? "Quote cancelled" : "Cancel Quote", disabled: ["cancelled", "converted"].includes(quote.status), onAction: () => { setCancelError(null); setModal("cancelQuote"); } }, { content: "Delete", destructive: true, onAction: () => { setDeleteError(null); setModal("deleteQuote"); } }] }]}
      primaryAction={
        quote.draftOrderId
          ? { content: "View draft order", onAction: openDraftOrder }
          : { content: "Create draft order", onAction: startCreateDraftOrder, disabled: items.length === 0 || !plan.can("draft_order") }
      }
    >
      {/* Shopify nu native top Save Bar - fakt isDirty hoy tyare dekhay */}
      <AppBridgeSaveBar visible={isDirty} saving={saving} onSave={handleSave} onDiscard={handleDiscard} />

      {!plan.loading && (!plan.can("draft_order") || !plan.can("pricing_settings")) && (
        <Box paddingBlockEnd="400">
          <Banner
            tone="info"
            title={`You are on the ${plan.name} plan`}
            action={{ content: "Upgrade plan", onAction: () => navigate(`/billing${window.location.search}`) }}
          >
            {!plan.can("draft_order")
              ? "Upgrade to Starter to convert quotes to draft orders and sync data. Tax, Discount and Shipping settings need the Pro plan."
              : "Tax, Discount and Shipping settings are available on the Pro plan."}
          </Banner>
        </Box>
      )}

      {/* Add discount / shipping / tax popups */}
      <DiscountModal
        open={modal === "discount"}
        value={extras.discount}
        onClose={() => setModal(null)}
        onApply={(v) => { setExtras((p) => ({ ...p, discount: v })); setModal(null); }}
      />
      <ShippingModal
        open={modal === "shipping"}
        value={extras.shipping}
        quoteId={quoteId}
        currency={getCurrency(quote)}
        onClose={() => setModal(null)}
        onApply={(v) => { setExtras((p) => ({ ...p, shipping: v })); setModal(null); }}
      />
      <TaxModal
        open={modal === "tax"}
        value={extras.tax}
        onClose={() => setModal(null)}
        onApply={(v) => { setExtras((p) => ({ ...p, tax: v })); setModal(null); }}
      />

      {/* Create draft order -> confirm popup */}
      <DraftOrderModal
        open={modal === "draftOrder"}
        creating={creating}
        error={createError}
        summary={`Aa quote mathi Shopify ma draft order banshe (${items.length} item${items.length === 1 ? "" : "s"}, total ${money(total, getCurrency(quote))}).`}
        onClose={() => setModal(null)}
        onConfirm={handleCreateDraftOrder}
      />

      {/* Send proposal email popup */}
      <ProposalModal
        open={modal === "proposal"}
        sending={proposalSending}
        error={proposalError}
        email={quote.email}
        message={proposalMessage}
        onMessage={setProposalMessage}
        onClose={() => setModal(null)}
        onConfirm={handleSendProposal}
      />

      {/* Send invoice email popup */}
      <ProposalModal
        open={modal === "invoice"}
        title="Send invoice email"
        helpText="The invoice PDF will be attached to the email."
        sending={invoiceSending}
        error={invoiceError}
        email={quote.email}
        message={invoiceMessage}
        onMessage={setInvoiceMessage}
        onClose={() => setModal(null)}
        onConfirm={handleSendInvoice}
      />

      {/* Delete quote -> confirm popup */}
      <DeleteQuoteModal
        open={modal === "deleteQuote"}
        deleting={deleting}
        error={deleteError}
        number={quote.number}
        onClose={() => setModal(null)}
        onConfirm={handleDeleteQuote}
      />

      {/* Cancel quote -> confirm popup */}
      <CancelQuoteModal
        open={modal === "cancelQuote"}
        cancelling={cancelling}
        error={cancelError}
        onClose={() => setModal(null)}
        onConfirm={handleCancelQuote}
      />

      {/* Add custom item -> manually add an item that is not in the Shopify catalog */}
      <CustomItemModal
        open={modal === "customItem"}
        onClose={() => setModal(null)}
        onAdd={addCustomItem}
      />

      {/* Product wise discount popup */}
      <ItemDiscountModal
        open={discItemId != null}
        item={items.find((x) => x.id === discItemId)}
        onClose={() => setDiscItemId(null)}
        onApply={(d) => { patchItem(discItemId, d); setDiscItemId(null); }}
      />

      {/* Add property popup */}
      <PropertyModal
        open={propItemId != null}
        item={items.find((x) => x.id === propItemId)}
        onClose={() => setPropItemId(null)}
        onApply={(props) => { patchItem(propItemId, { properties: props }); setPropItemId(null); }}
      />

      {/* Add product -> Select products popup (store na live products) */}
      <ProductPickerModal
        open={modal === "products"}
        currency={getCurrency(quote)}
        onClose={() => setModal(null)}
        onSelect={(picked) => { addProducts(picked); setModal(null); }}
      />

      {saveError && (
        <Box paddingBlockEnd="400">
          <Banner tone="critical" title="Could not save quote" onDismiss={() => setSaveError(null)}>
            {saveError}
          </Banner>
        </Box>
      )}

      <Layout>
        {/* ============ LEFT ============ */}
        <Layout.Section>
          <BlockStack gap="400">
            {/* Products */}
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingSm">Products</Text>
                  <InlineStack gap="200">
                    <Button size="slim" onClick={() => setModal("products")}>Add product</Button>
                    <Button size="slim" onClick={() => setModal("customItem")}>Add custom item</Button>
                  </InlineStack>
                </InlineStack>

                <div style={{ ...GRID, padding: "8px 0", borderBottom: "1px solid var(--p-color-border)" }}>
                  <Text as="span" variant="bodySm" fontWeight="semibold" tone="subdued">Product</Text>
                  <Text as="span" variant="bodySm" fontWeight="semibold" tone="subdued">Quantity</Text>
                  <Text as="span" variant="bodySm" fontWeight="semibold" tone="subdued">Quoted Price</Text>
                  <Text as="span" variant="bodySm" fontWeight="semibold" tone="subdued" alignment="end">Total</Text>
                  <span />
                </div>

                {items.map((i) => (
                  <div key={i.id} style={{ ...GRID, paddingBottom: 12, borderBottom: "1px solid var(--p-color-border-secondary)" }}>
                    <InlineStack gap="300" wrap={false} blockAlign="start">
                      <Thumb src={i.image} />
                      <BlockStack gap="050">
                        <Text as="span" variant="bodySm" fontWeight="semibold">{i.title}</Text>
                        {i.variantTitle && i.variantTitle !== "Default Title" && (
                          <Text as="span" variant="bodySm" tone="subdued">{i.variantTitle}</Text>
                        )}
                        <Text as="span" variant="bodySm" tone="magic">{money(i.price, getCurrency(quote))}</Text>
                        {i.originalPrice !== i.price && (
                          <span style={{ textDecoration: "line-through" }}>
                            <Text as="span" variant="bodySm" tone="subdued">{money(i.originalPrice, getCurrency(quote))}</Text>
                          </span>
                        )}
                        {i.sku && <Text as="span" variant="bodySm" tone="subdued">SKU: {i.sku}</Text>}
                        {(i.properties ?? []).map((p) => (
                          <Text key={p.name} as="span" variant="bodySm" tone="subdued">{p.name}: {p.value}</Text>
                        ))}
                        {itemDiscountAmt(i) > 0 && (
                          <Text as="span" variant="bodySm" tone="success">
                            Discount: -{money(itemDiscountAmt(i), getCurrency(quote))}{i.discountType === "percentage" ? ` (${i.discountValue}%)` : ""}
                          </Text>
                        )}
                        <div>
                          <Button variant="plain" size="micro" icon={PlusCircleIcon} onClick={() => setDiscItemId(i.id)}>
                            {itemDiscountAmt(i) > 0 ? "Edit discount" : "Add discount"}
                          </Button>
                        </div>
                        <div>
                          <Button variant="plain" size="micro" icon={PlusCircleIcon} onClick={() => setPropItemId(i.id)}>
                            {(i.properties ?? []).length ? "Edit properties" : "Add property"}
                          </Button>
                        </div>
                      </BlockStack>
                    </InlineStack>
                    <TextField label="Quantity" labelHidden type="number" min={1} autoComplete="off" value={String(i.qty)}
                      onChange={(v) => patchItem(i.id, { qty: Math.max(0, Number(v) || 0) })} />
                    <TextField label="Quoted price" labelHidden type="number" min={0} autoComplete="off" value={String(i.price)}
                      onChange={(v) => patchItem(i.id, { price: Math.max(0, Number(v) || 0) })} />
                    <Text as="span" variant="bodySm" alignment="end">{money(lineTotal(i), getCurrency(quote))}</Text>
                    <Button variant="tertiary" icon={DeleteIcon} accessibilityLabel={`Remove ${i.title}`} onClick={() => removeItem(i.id)} />
                  </div>
                ))}
                {items.length === 0 && <Text as="p" tone="subdued">No products in this quote.</Text>}
              </BlockStack>
            </Card>

            {/* Payment information */}
            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingSm">Payment Information</Text>
                <Box borderWidth="025" borderColor="border" borderRadius="200" padding="300">
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span" fontWeight="semibold">Subtotal</Text>
                      <Text as="span">{money(subtotal, getCurrency(quote))}</Text>
                    </InlineStack>
                    {extraRow("discount", "Add discount", "Edit discount", discountAmt,
                      extras.discount.type === "percentage" && discountAmt > 0 ? `(${extras.discount.value}%)` : "")}
                    {extraRow("shipping", "Add shipping", "Edit shipping", shippingAmt, shippingAmt > 0 ? extras.shipping.name : "")}
                    {extraRow("tax", "Add tax", "Edit tax", taxAmt,
                      taxAmt > 0
                        ? [extras.tax.name, extras.tax.type === "percentage" ? `(${extras.tax.value}%)` : ""].filter(Boolean).join(" ")
                        : "")}
                    {taxAmt > 0 && taxWarn && (
                      <Banner tone="warning" onDismiss={() => setTaxWarn(false)}>
                        This tax won't show up in draft order created from this quote.
                      </Banner>
                    )}
                    <Divider />
                    <InlineStack align="space-between">
                      <Text as="span" fontWeight="bold">Total</Text>
                      <Text as="span" fontWeight="bold">{money(total, getCurrency(quote))}</Text>
                    </InlineStack>
                  </BlockStack>
                </Box>
                <InlineStack align="end" gap="200">
                  <Popover
                    active={syncOpen}
                    onClose={() => setSyncOpen(false)}
                    activator={<Button size="slim" disclosure disabled={!plan.can("sync")} onClick={() => setSyncOpen((v) => !v)}>Sync Quote</Button>}
                  >
                    <ActionList items={[{ content: "Sync from draft order", onAction: () => syncDraftOrder("from") }, { content: "Sync to draft order", onAction: () => syncDraftOrder("to") }]} />
                  </Popover>
                  <Button size="slim" onClick={startSendProposal}>Send Proposal Email</Button>
                  {quote.draftOrderId && (
                    <>
                      <Button size="slim" onClick={handleDownloadInvoice} loading={invoiceDownloading}>Download Invoice</Button>
                      <Button size="slim" onClick={startSendInvoice}>Send Invoice</Button>
                    </>
                  )}
                </InlineStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>

        {/* ============ RIGHT ============ */}
        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            {/* Customer */}
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h2" variant="headingSm">Customer</Text>
                  <Button variant="tertiary"  accessibilityLabel="Customer actions" />
                </InlineStack>
                <TextField label="Email address" value={quote.email} disabled autoComplete="off" />

                <Box borderWidth="025" borderColor="border" borderRadius="200">
                  <Box padding="200">
                    <div role="button" tabIndex={0} style={{ cursor: "pointer" }} onClick={() => setInfoOpen((v) => !v)}
                      onKeyDown={(e) => e.key === "Enter" && setInfoOpen((v) => !v)}>
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="span" variant="bodySm" fontWeight="semibold">Customer Information</Text>
                        <Icon source={infoOpen ? ChevronUpIcon : ChevronDownIcon} />
                      </InlineStack>
                    </div>
                    <Collapsible open={infoOpen} id="customer-info">
                      <Box paddingBlockStart="200">
                        <BlockStack gap="100">
                          {quote.customerInfo.map((r, idx) => (
                            <Text key={`${r.label}-${idx}`} as="span" variant="bodySm">
                              <Text as="span" variant="bodySm" tone="subdued">{r.label}: </Text>{r.value}
                            </Text>
                          ))}
                        </BlockStack>
                      </Box>
                    </Collapsible>
                  </Box>
                </Box>

                {(quote.site || quote.customerMessage) && (
                  <Box borderWidth="025" borderColor="border" borderRadius="200">
                    <Box padding="200">
                      <div role="button" tabIndex={0} style={{ cursor: "pointer" }} onClick={() => setNoteOpen((v) => !v)}
                        onKeyDown={(e) => e.key === "Enter" && setNoteOpen((v) => !v)}>
                        <InlineStack align="space-between" blockAlign="center">
                          <Text as="span" variant="bodySm" fontWeight="semibold">Customer note</Text>
                          <Icon source={noteOpen ? ChevronUpIcon : ChevronDownIcon} />
                        </InlineStack>
                      </div>
                      <Collapsible open={noteOpen} id="customer-note">
                        <Box paddingBlockStart="200">
                          <BlockStack gap="100">
                            {quote.site && <Text as="p" variant="bodySm"><b>Site:</b> {quote.site}</Text>}
                            {quote.customerMessage && <Text as="p" variant="bodySm"><b>Message:</b> {quote.customerMessage}</Text>}
                          </BlockStack>
                        </Box>
                      </Collapsible>
                    </Box>
                  </Box>
                )}

                <TextField label="Message" multiline={3} placeholder="The quote's special note" autoComplete="off"
                  value={note} onChange={setNote} />
              </BlockStack>
            </Card>

            {/* Due date */}
            <Card>
              <BlockStack gap="200">
                <Text as="h2" variant="headingSm">Due date</Text>
                <TextField label="Due date" labelHidden type="date" autoComplete="off" value={dueDate} onChange={setDueDate} />
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}