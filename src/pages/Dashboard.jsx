import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Page, Card, Text, Button, Badge, Icon, Popover, ActionList, Tooltip, Avatar, Thumbnail,
  Banner, BlockStack, InlineStack, InlineGrid, SkeletonBodyText, Divider,
} from '@shopify/polaris';
import {
  CalendarIcon, ChartVerticalIcon, XIcon, ReceiptIcon, ImageIcon,
} from '@shopify/polaris-icons';
import AppLayout from '../components/AppLayout';
import LineChart from '../components/Linechart';
import useShop from '../hooks/useShop';
import api from '../services/api';
import { useAppEmbed } from '../context/AppEmbedContext';

const RANGES = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' },
];

/* ---------------- helpers ---------------- */  
const money = (n, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(n || 0));
  } catch {
    return `$${Number(n || 0).toFixed(2)}`;
  }
};

// y-axis mate nano format: $1.2K
const compactMoney = (n, currency = 'USD') => {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(Number(n || 0));
  } catch {
    return `$${n}`;
  }
};

const fmtDay = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// API ma series na aave (juno backend) to chart zero line sathe dekhay
function emptySeries(days) {
  return Array.from({ length: days }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { date: iso, quotes: 0, value: 0, conversion_rate: 0 };
  });
}

const dotted = { borderBottom: '1px dotted var(--p-color-text-secondary)', cursor: 'help' };

// Shopify theme editor ma "App embeds" tab khole (jya thi embed on/off thay)
const openThemeEditor = (shop) => () => {
  if (!shop) return;
  const apiKey = import.meta.env.VITE_SHOPIFY_API_KEY;
  const handle = 'quote-app-embed';
  const params = new URLSearchParams({ context: 'apps', template: 'index' });
  if (apiKey) params.set('activateAppId', `${apiKey}/${handle}`);
  window.open(`https://${shop}/admin/themes/current/editor?${params.toString()}`, '_blank', 'noopener');
};

/* ---------------- small building blocks ---------------- */
function Dotted({ tip, children, variant = 'headingSm' }) {
  return (
    <Tooltip content={tip}>
      <span style={dotted}>
        <Text as="span" variant={variant} fontWeight="semibold">{children}</Text>
      </span>
    </Tooltip>
  );
}

function KpiCard({ label, tip, value, loading, tone }) {
  return (
    <Card>
      <BlockStack gap="200">
        <Dotted tip={tip}>{label}</Dotted>
        {loading ? (
          <div style={{ width: 70 }}><SkeletonBodyText lines={1} /></div>
        ) : (
          <Text as="p" variant="bodyLg" fontWeight="semibold" tone={tone}>{value}</Text>
        )}
      </BlockStack>
    </Card>
  );
}

function ChartCard({ title, tip, headline, loading, children }) {
  return (
    <Card>
      <BlockStack gap="200">
        <Dotted tip={tip}>{title}</Dotted>
        {loading ? <div style={{ width: 90 }}><SkeletonBodyText lines={1} /></div> : <Text as="p" variant="heading2xl">{headline}</Text>}
        {children}
      </BlockStack>
    </Card>
  );
}

function ListCard({ title, tip, loading, empty, children }) {
  return (
    <Card>
      <BlockStack gap="300">
        <Dotted tip={tip}>{title}</Dotted>
        {loading ? (
          <SkeletonBodyText lines={5} />
        ) : empty ? (
          <div style={{ minHeight: 230, display: 'grid', placeItems: 'center' }}>
            <Text as="p" tone="subdued">No data for this date range</Text>
          </div>
        ) : (
          <BlockStack gap="300">{children}</BlockStack>
        )}
      </BlockStack>
    </Card>
  );
}

/* ---------------- page ---------------- */
export default function Dashboard() {
  const navigate = useNavigate();
  const [days, setDays] = useState(7);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [hidden, setHidden] = useState({}); // dismissed cards

  const { data, loading, error, shop } = useShop(`/dashboard/stats?days=${days}`);

  // App embed ON/OFF status: nav menu, route guard ane aa page badhu ek j context (AppEmbedContext) thi vaape chhe.
  // Theme editor ma toggle karine pacha aavo to focus par auto re-check thay chhe.
  const { status: embedCtxStatus, refresh: recheckEmbed } = useAppEmbed();
  const embedStatus = embedCtxStatus === 'idle' || embedCtxStatus === 'loading' ? null : embedCtxStatus; // 'on' | 'off' | 'unknown' | null
  const range = RANGES.find((r) => r.days === days);
  const currency = data?.currency || 'USD';

  const series = useMemo(
    () => (data?.series?.length ? data.series : emptySeries(days)),
    [data, days]
  );
  const valueData = useMemo(() => series.map((p) => ({ title: p.date, label: fmtDay(p.date), y: Number(p.value) || 0 })), [series]);
  const quotesData = useMemo(() => series.map((p) => ({ title: p.date, label: fmtDay(p.date), y: Number(p.quotes) || 0 })), [series]);
  const rateData = useMemo(() => series.map((p) => ({ title: p.date, label: fmtDay(p.date), y: Number(p.conversion_rate) || 0 })), [series]);

  const topProducts = data?.top_products ?? [];
  const topCustomers = data?.top_customers ?? [];

  return (
    <AppLayout>
      <Page>
        <BlockStack gap="400">
          {error && <Banner tone="critical">{error}</Banner>}

          {/* App embed off hoy tyare sudhi baki app lock (nav menu + route guard) */}
          {embedStatus === 'off' && (
            <Banner
              tone="warning"
              title="Turn on the app embed to unlock the rest of the app"
              action={{ content: 'Enable app embed', onAction: openThemeEditor(shop || data?.shop) }}
              secondaryAction={{ content: "I've enabled it - check again", onAction: () => recheckEmbed(true) }}
            >
              <p>
                Quotes, Product Settings, Settings and Billing stay locked until the app embed is switched on in your
                theme. After turning it on, press <b>Save</b> in the theme editor and come back here.
              </p>
            </Banner>
          )}

          {/* ---------- App embed + Account status ---------- */}
          <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h3" variant="headingSm">App embed</Text>
                  {embedStatus === 'on' && <Badge tone="success">Embedded</Badge>}
                  {embedStatus === 'off' && <Badge tone="critical">Not embedded</Badge>}
                  {embedStatus === 'unknown' && <Badge>Status unavailable</Badge>}
                </InlineStack>
                <Text as="p" tone="subdued">
                  Show the quote button on your storefront by embedding QuoteSnap in your theme.
                </Text>
                <div>
                  <Button
                    size="slim"
                    variant={embedStatus === 'off' ? 'primary' : undefined}
                    onClick={openThemeEditor(shop || data?.shop)}
                  >
                    {embedStatus === 'off' ? 'Enable app embed' : 'Configure'}
                  </Button>
                </div>
              </BlockStack>
            </Card>

            {!hidden.account && (
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="h3" variant="headingSm">Your account status</Text>
                    <Button variant="tertiary" size="micro" icon={XIcon} accessibilityLabel="Dismiss"
                      onClick={() => setHidden((h) => ({ ...h, account: true }))} />
                  </InlineStack>
                  <BlockStack gap="200">
                    <InlineStack gap="200" blockAlign="center" wrap={false}>
                      <Icon source={ReceiptIcon} tone="base" />
                      <Text as="span">Current plan: {data?.current_plan || '—'}</Text>
                    </InlineStack>
                    <InlineStack gap="200" blockAlign="center" wrap={false}>
                      <Icon source={ChartVerticalIcon} tone="base" />
                      <Text as="span">Quote number: {data?.quote_limit || 'Unlimited'}</Text>
                    </InlineStack>
                  </BlockStack>
                  <div>
                    <Button size="slim" onClick={() => navigate(`/billing${window.location.search}`)}>Upgrade plan</Button>
                  </div>
                </BlockStack>
              </Card>
            )}
          </InlineGrid>

          {/* ---------- Date range ---------- */}
          <div>
            <Popover
              active={rangeOpen}
              onClose={() => setRangeOpen(false)}
              activator={
                <Button icon={CalendarIcon} onClick={() => setRangeOpen((v) => !v)}>{range.label}</Button>
              }
            >
              <ActionList
                items={RANGES.map((r) => ({
                  content: r.label,
                  active: r.days === days,
                  onAction: () => { setDays(r.days); setRangeOpen(false); },
                }))}
              />
            </Popover>
          </div>

          {/* ---------- KPI cards ---------- */}
          <InlineGrid columns={{ xs: 2, sm: 3, lg: 5 }} gap="400">
            <KpiCard loading={loading} label="Total quote value" tip="Sum of all quote totals created in this period"
              value={money(data?.total_quote_value, currency)} />
            <KpiCard loading={loading} label="Total quotes" tip="Quote requests received in this period"
              value={data?.total_quotes ?? 0} />
            <KpiCard loading={loading} label="Total quotes rejected" tip="Quotes rejected in this period"
              value={data?.total_quotes_rejected ?? 0} />
            <KpiCard loading={loading} label="Total quotes converted" tip="Quotes converted into draft orders in this period"
              value={data?.total_quotes_converted ?? 0} />
            <KpiCard loading={loading} label="Conversion rate" tip="Converted quotes ÷ total quotes"
              value={`${data?.conversion_rate ?? 0}%`} />
            <KpiCard loading={loading} label="Lost profit (90 days)" tip="Discounts given on quotes in the last 90 days"
              value={money(data?.lost_profit_90d, currency)} tone="success" />
          </InlineGrid>

          {/* ---------- Value / quotes over time ---------- */}
          <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
            <ChartCard loading={loading} title="Total quote value over time" tip="Value of quotes created each day"
              headline={money(data?.total_quote_value, currency)}>
              <LineChart data={valueData} seriesName="Quotes value"
                formatValue={(v) => money(v, currency)} formatTick={(v) => compactMoney(v, currency)} />
            </ChartCard>

            <ChartCard loading={loading} title="Total quotes over time" tip="Number of quotes created each day"
              headline={data?.total_quotes ?? 0}>
              <LineChart data={quotesData} seriesName="Quotes" integer />
            </ChartCard>
          </InlineGrid>

          {/* ---------- Top products / customers ---------- */}
          <InlineGrid columns={{ xs: 1, md: 2 }} gap="400">
            <ListCard loading={loading} title="Top products converted" tip="Products in quotes that were converted, by value"
              empty={topProducts.length === 0}>
              {topProducts.map((p, i) => (
                <div key={`${p.title}-${i}`}>
                  {i > 0 && <div style={{ paddingBottom: 12 }}><Divider /></div>}
                  <InlineStack gap="300" blockAlign="center" wrap={false} align="space-between">
                    <InlineStack gap="300" blockAlign="center" wrap={false}>
                      <Thumbnail size="small" alt={p.title} source={p.image || ImageIcon} />
                      <BlockStack gap="050">
                        <Text as="span" variant="bodyMd" fontWeight="semibold">{p.title}</Text>
                        <Text as="span" variant="bodySm" tone="subdued">{p.quantity} unit{Number(p.quantity) === 1 ? '' : 's'}</Text>
                      </BlockStack>
                    </InlineStack>
                    <Text as="span" variant="bodyMd">{money(p.value, currency)}</Text>
                  </InlineStack>
                </div>
              ))}
            </ListCard>

            <ListCard loading={loading} title="Top customers by total quotes" tip="Customers who requested the most quotes"
              empty={topCustomers.length === 0}>
              {topCustomers.map((c, i) => (
                <div key={`${c.email || c.name}-${i}`}>
                  {i > 0 && <div style={{ paddingBottom: 12 }}><Divider /></div>}
                  <InlineStack gap="300" blockAlign="center" wrap={false} align="space-between">
                    <InlineStack gap="300" blockAlign="center" wrap={false}>
                      <Avatar size="md" name={c.name || c.email} />
                      <BlockStack gap="050">
                        <Text as="span" variant="bodyMd" fontWeight="semibold">{c.name || c.email}</Text>
                        {c.name && c.email && <Text as="span" variant="bodySm" tone="subdued">{c.email}</Text>}
                      </BlockStack>
                    </InlineStack>
                    <BlockStack gap="050" inlineAlign="end">
                      <Text as="span" variant="bodyMd">{c.quotes} quote{Number(c.quotes) === 1 ? '' : 's'}</Text>
                      <Text as="span" variant="bodySm" tone="subdued">{money(c.value, currency)}</Text>
                    </BlockStack>
                  </InlineStack>
                </div>
              ))}
            </ListCard>
          </InlineGrid>

          {/* ---------- Conversion rate over time ---------- */}
          <ChartCard loading={loading} title="Conversion rate over time" tip="Converted quotes ÷ quotes created, per day"
            headline={`${data?.conversion_rate ?? 0}%`}>
            <LineChart data={rateData} seriesName="Conversion rate"
              formatValue={(v) => `${v}%`} formatTick={(v) => `${v}%`} />
          </ChartCard>
        </BlockStack>
      </Page>
    </AppLayout>
  );
}