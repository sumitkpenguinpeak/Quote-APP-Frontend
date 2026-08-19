/**
 * Real @shopify/polaris implementation.
 *
 * SETUP (run in your local React project):
 *   npm install @shopify/polaris @shopify/polaris-icons
 *
 * In your app's root (e.g. main.jsx / App.jsx), wrap everything once with:
 *
 *   import '@shopify/polaris/build/esm/styles.css';
 *   import { AppProvider } from '@shopify/polaris';
 *   import en from '@shopify/polaris/locales/en.json';
 *
 *   <AppProvider i18n={en}>
 *     <SettingsPage />
 *   </AppProvider>
 *
 * Then just render <SettingsPage /> anywhere inside that provider.
 */

import React, { useState, useCallback } from "react";
import {
  Page,
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Button,
  Box,
  Divider,
  Icon,
  Select,
  Checkbox,
} from "@shopify/polaris";
import {
  PersonIcon,
  CartIcon,
  EditIcon,
  FileIcon,
  EmailIcon,
  ArrowRightIcon,
  TeamIcon,
  CodeIcon,
  NotificationIcon,
  CheckIcon,
  ViewIcon,
  SendIcon,
  ClipboardIcon,
  SaveIcon,
  ArrowLeftIcon,
} from "@shopify/polaris-icons";

const navItems = [
  { key: "lead-scoring", label: "Lead scoring", icon: PersonIcon },
  { key: "abandoned", label: "Abandoned quotes", icon: CartIcon },
  { key: "formatting", label: "Formatting standards", icon: EditIcon },
  { key: "pdf-template", label: "PDF Template", icon: FileIcon },
  { key: "email", label: "Email notification", icon: EmailIcon },
  { key: "sync", label: "Sync Data", icon: ArrowRightIcon },
  { key: "members", label: "Members and Permission", icon: TeamIcon },
  { key: "css", label: "CSS", icon: CodeIcon },
  { key: "quote-reminder", label: "Quote Reminder", icon: NotificationIcon },
  { key: "other-notification", label: "Other Notification", icon: NotificationIcon },
];

/* ---------------- Sidebar ---------------- */

function SettingsNav({ active, onSelect }) {
  return (
    <Card padding="200">
      <BlockStack gap="0">
        {navItems.map((item) => {
          const isActive = item.key === active;
          return (
            <div
              key={item.key}
              onClick={() => onSelect(item.key)}
              style={{
                cursor: "pointer",
                borderRadius: "8px",
                padding: "10px 12px",
                background: isActive ? "var(--p-color-bg-surface-active)" : "transparent",
              }}
            >
              <InlineStack align="space-between" blockAlign="center" wrap={false}>
                <InlineStack gap="200" blockAlign="center" wrap={false}>
                  <Icon source={item.icon} tone={isActive ? "base" : "subdued"} />
                  <Text
                    as="span"
                    variant="bodyMd"
                    fontWeight={isActive ? "semibold" : "regular"}
                  >
                    {item.label}
                  </Text>
                </InlineStack>
                {isActive && <Icon source={CheckIcon} tone="base" />}
              </InlineStack>
            </div>
          );
        })}
      </BlockStack>
    </Card>
  );
}

/* ---------------- Panels ---------------- */

function LeadScoringPanel() {
  const [rules, setRules] = useState([
    { label: "Quote value above ₹50,000", points: "20" },
    { label: "Repeat customer", points: "15" },
    { label: "Responded within 24 hours", points: "10" },
  ]);

  const updateRule = (i, field, value) => {
    const next = [...rules];
    next[i][field] = value;
    setRules(next);
  };

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingSm">
          Lead scoring rules
        </Text>
        {rules.map((r, i) => (
          <InlineStack key={i} gap="200" blockAlign="end">
            <Box minWidth="260px">
              <TextField
                label="Condition"
                labelHidden
                value={r.label}
                onChange={(v) => updateRule(i, "label", v)}
                autoComplete="off"
              />
            </Box>
            <Box width="100px">
              <TextField
                label="Points"
                labelHidden
                value={r.points}
                onChange={(v) => updateRule(i, "points", v)}
                autoComplete="off"
                suffix="pts"
              />
            </Box>
          </InlineStack>
        ))}
        <Box>
          <Button onClick={() => setRules([...rules, { label: "", points: "0" }])}>
            Add rule
          </Button>
        </Box>
      </BlockStack>
    </Card>
  );
}

function AbandonedQuotesPanel() {
  const [enabled, setEnabled] = useState(true);
  const [hours, setHours] = useState("24");
  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingSm">
          Abandoned quotes
        </Text>
        <Checkbox
          label="Enable abandoned quote recovery"
          helpText="Automatically follow up on quotes left incomplete"
          checked={enabled}
          onChange={setEnabled}
        />
        <Box maxWidth="240px">
          <TextField
            label="Mark abandoned after (hours)"
            value={hours}
            onChange={setHours}
            type="number"
            autoComplete="off"
          />
        </Box>
      </BlockStack>
    </Card>
  );
}

function FormattingStandardsPanel() {
  const [prefix, setPrefix] = useState("Q");
  const [suffix, setSuffix] = useState("-SUF");
  const [quoteFormat, setQuoteFormat] = useState("IW{{create_date}}-{{quote_id}}");
  const [invoiceFormat, setInvoiceFormat] = useState("IW{{order_date}}-{{quote_id}}");

  return (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingSm">
            Quote ID format
          </Text>
          <TextField label="Prefix" value={prefix} onChange={setPrefix} autoComplete="off" />
          <TextField label="Suffix" value={suffix} onChange={setSuffix} autoComplete="off" />
          <TextField
            label="Quote ID preview"
            value={`${prefix}1000`}
            disabled
            autoComplete="off"
          />
        </BlockStack>
      </Card>

      <Card>
        <BlockStack gap="400">
          <Text as="h2" variant="headingSm">
            PDF name format
          </Text>

          <BlockStack gap="200">
            <InlineStack align="space-between">
              <Text as="h3" variant="bodyMd" fontWeight="semibold">
                PDF quote
              </Text>
              <Button variant="plain">Dynamic value</Button>
            </InlineStack>
            <TextField
              label="Format"
              labelHidden
              value={quoteFormat}
              onChange={setQuoteFormat}
              autoComplete="off"
            />
            <TextField
              label="Preview"
              value="IW2024-01-24-Q0001"
              disabled
              autoComplete="off"
            />
          </BlockStack>

          <Divider />

          <BlockStack gap="200">
            <InlineStack align="space-between">
              <Text as="h3" variant="bodyMd" fontWeight="semibold">
                PDF invoice
              </Text>
              <Button variant="plain">Dynamic value</Button>
            </InlineStack>
            <TextField
              label="Format"
              labelHidden
              value={invoiceFormat}
              onChange={setInvoiceFormat}
              autoComplete="off"
            />
            <TextField
              label="Preview"
              value="IW2024-01-24-Q0001"
              disabled
              autoComplete="off"
            />
          </BlockStack>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}

const pdfTemplateRows = [
  {
    key: "quote",
    name: "Quote PDF",
    description: "Template used to convert quote to PDF file",
    heading: "Quote confirmation",
    subheading: "Using default template",
    storeName: "Khan Interiors",
    defaultSubject: "We received your quote request - {{quote_number}}",
    defaultBody:
      "<p>Hi {{customer_name}},</p>\n<p>Thanks for your quote request <strong>{{quote_number}}</strong> to {{store_name}}. We will get back to you shortly with pricing.</p>",
    previewFooter: "This email was sent regarding your quote request.",
  },
  {
    key: "invoice",
    name: "Invoice PDF",
    description: "Template used to convert a draft order to PDF file",
    heading: "Invoice confirmation",
    subheading: "Using default template",
    storeName: "Khan Interiors",
    defaultSubject: "Your invoice is ready - {{quote_number}}",
    defaultBody:
      "<p>Hi {{customer_name}},</p>\n<p>Your invoice <strong>{{quote_number}}</strong> from {{store_name}} is ready. Please review the attached PDF.</p>",
    previewFooter: "This email was sent regarding your invoice.",
  },
];

// Sample values used to render the live preview — mirrors the tokens below.
const sampleData = {
  customer_name: "Priya Shah",
  quote_number: "Q-1042",
  quote_total: "₹85,000",
  subtotal: "₹80,000",
  discount: "₹5,000",
  grand_total: "₹85,000",
  store_name: "Khan Interiors",
  expiry_date: "30 Jun 2026",
  current_date: "19 Aug 2026",
  year: "2026",
  consultant_name: "Aman Shah",
  product_1: "Modular Sofa",
  description_1: "3-seater fabric sofa",
  qty_1: "1",
  price_1: "₹45,000",
  total_1: "₹45,000",
};

function renderTokens(str) {
  return String(str || "").replace(/\{\{\s*([\w]+)\s*\}\}/g, (match, key) =>
    key in sampleData ? sampleData[key] : match
  );
}

const availableTokens = [
  "{{customer_name}}",
  "{{quote_number}}",
  "{{quote_total}}",
  "{{subtotal}}",
  "{{discount}}",
  "{{grand_total}}",
  "{{store_name}}",
  "{{expiry_date}}",
  "{{current_date}}",
  "{{year}}",
  "{{consultant_name}}",
  "{{product_1}}",
  "{{description_1}}",
  "{{qty_1}}",
  "{{price_1}}",
  "{{total_1}}",
];

function TemplateEditor({ template, onBack }) {
  const [fullHtml, setFullHtml] = useState(false);
  const [subject, setSubject] = useState(template.defaultSubject);
  const [body, setBody] = useState(template.defaultBody);
  const [testEmail, setTestEmail] = useState("");

  const copyToken = (token) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(token);
    }
  };

  const toggleFullHtml = useCallback(() => setFullHtml((v) => !v), []);

  return (
    <BlockStack gap="300">
      <InlineStack gap="200" blockAlign="center">
        <Button icon={ArrowLeftIcon} variant="tertiary" onClick={onBack}>
          Back to PDF Template
        </Button>
      </InlineStack>

      <InlineStack gap="400" align="start" wrap={false}>
        {/* Left: editor */}
        <Box width="100%">
          <Card padding="0">
            <Box padding="400" borderBlockEndWidth="025" borderColor="border">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="0">
                  <Text as="h2" variant="headingSm">
                    {template.heading}
                  </Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {template.subheading}
                  </Text>
                </BlockStack>
                <InlineStack gap="300" blockAlign="center">
                  <InlineStack gap="150" blockAlign="center">
                    <div
                      onClick={toggleFullHtml}
                      style={{
                        cursor: "pointer",
                        width: 36,
                        height: 20,
                        borderRadius: 999,
                        background: fullHtml
                          ? "var(--p-color-bg-fill-success)"
                          : "var(--p-color-bg-fill-tertiary)",
                        position: "relative",
                        transition: "background 150ms ease",
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          top: 2,
                          left: fullHtml ? 18 : 2,
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: "white",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
                          transition: "left 150ms ease",
                        }}
                      />
                    </div>
                    <Text as="span" variant="bodySm">
                      Full HTML design
                    </Text>
                  </InlineStack>
                  <Button icon={ViewIcon}>Preview</Button>
                </InlineStack>
              </InlineStack>
            </Box>

            <Box padding="400">
              <BlockStack gap="400">
                <TextField
                  label="Subject line"
                  value={subject}
                  onChange={setSubject}
                  autoComplete="off"
                />
                <TextField
                  label="Message body"
                  value={body}
                  onChange={setBody}
                  multiline={8}
                  autoComplete="off"
                  monospaced
                />

                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" fontWeight="semibold" tone="subdued">
                    Available tokens — click to copy
                  </Text>
                  <InlineStack gap="150" wrap>
                    {availableTokens.map((token) => (
                      <Button
                        key={token}
                        size="micro"
                        icon={ClipboardIcon}
                        onClick={() => copyToken(token)}
                      >
                        {token}
                      </Button>
                    ))}
                  </InlineStack>
                </BlockStack>

                <Divider />

                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="200" blockAlign="center">
                    <Box maxWidth="220px">
                      <TextField
                        label="Test email"
                        labelHidden
                        placeholder="test@email.com"
                        value={testEmail}
                        onChange={setTestEmail}
                        autoComplete="off"
                      />
                    </Box>
                    <Button icon={SendIcon}>Send test</Button>
                  </InlineStack>
                  <Button variant="primary" icon={SaveIcon}>
                    Save template
                  </Button>
                </InlineStack>
              </BlockStack>
            </Box>
          </Card>
        </Box>

        {/* Right: live preview */}
        <Box minWidth="360px" maxWidth="360px">
          <BlockStack gap="200">
            <Text as="p" variant="bodySm" tone="subdued">
              Live preview — sample data
            </Text>
            <Card padding="0">
              <Box
                padding="400"
                background="bg-fill-inverse"
                borderRadius="200"
              >
                <Text as="h3" variant="headingSm" tone="text-inverse">
                  {template.storeName}
                </Text>
              </Box>
              <Box padding="400">
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">
                    {renderTokens(subject)}
                  </Text>
                  <div
                    style={{ fontSize: 14, lineHeight: 1.5, color: "var(--p-color-text)" }}
                    // Body is authored by the merchant in this settings screen (same
                    // trust boundary as the editor field), so we render the typed
                    // HTML directly after swapping in sample token values.
                    dangerouslySetInnerHTML={{ __html: renderTokens(body) }}
                  />
                </BlockStack>
              </Box>
              <Box
                padding="300"
                background="bg-surface-secondary"
                borderBlockStartWidth="025"
                borderColor="border"
              >
                <Text as="p" variant="bodySm" tone="subdued">
                  {template.previewFooter}
                </Text>
              </Box>
            </Card>
          </BlockStack>
        </Box>
      </InlineStack>
    </BlockStack>
  );
}

function PdfTemplatePanel() {
  const [editingKey, setEditingKey] = useState(null);
  const editingTemplate = pdfTemplateRows.find((r) => r.key === editingKey);

  if (editingTemplate) {
    return <TemplateEditor template={editingTemplate} onBack={() => setEditingKey(null)} />;
  }

  return (
    <Card padding="0">
      <Box padding="400">
        <Text as="h2" variant="headingSm">
          PDF Template
        </Text>
      </Box>
      <Box paddingInline="400" paddingBlockEnd="200">
        <InlineStack align="space-between">
          <Text as="span" variant="bodySm" fontWeight="semibold" tone="subdued">
            Name
          </Text>
          <Text as="span" variant="bodySm" fontWeight="semibold" tone="subdued">
            Action
          </Text>
        </InlineStack>
      </Box>
      <Divider />
      <BlockStack gap="0">
        {pdfTemplateRows.map((row, i) => (
          <Box
            key={row.key}
            padding="400"
            borderBlockEndWidth={i < pdfTemplateRows.length - 1 ? "025" : "0"}
            borderColor="border"
          >
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="0">
                <Text as="span" variant="bodyMd" fontWeight="semibold">
                  {row.name}
                </Text>
                <Text as="span" variant="bodySm" tone="subdued">
                  {row.description}
                </Text>
              </BlockStack>
              <Button icon={EditIcon} onClick={() => setEditingKey(row.key)} accessibilityLabel={`Edit ${row.name}`} />
            </InlineStack>
          </Box>
        ))}
      </BlockStack>
    </Card>
  );
}

function EmailNotificationPanel() {
  const [subject, setSubject] = useState("Your quote {{quote_id}} is ready");
  const [body, setBody] = useState(
    "Hi {{customer_name}},\n\nYour quote is ready for review.\n\nThanks,\n{{company_name}}"
  );
  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingSm">
          Email notification
        </Text>
        <TextField label="Subject" value={subject} onChange={setSubject} autoComplete="off" />
        <TextField
          label="Body"
          value={body}
          onChange={setBody}
          multiline={6}
          autoComplete="off"
        />
      </BlockStack>
    </Card>
  );
}

function SyncDataPanel() {
  const [autoSync, setAutoSync] = useState(true);
  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingSm">
          Sync Data
        </Text>
        <Checkbox
          label="Auto-sync with Shopify"
          helpText="Keep quotes and products in sync automatically"
          checked={autoSync}
          onChange={setAutoSync}
        />
        <Box>
          <Button>Sync now</Button>
        </Box>
      </BlockStack>
    </Card>
  );
}

function MembersPanel() {
  const members = [
    { name: "Riya Patel", role: "Admin" },
    { name: "Aman Shah", role: "Editor" },
    { name: "Karan Mehta", role: "Viewer" },
  ];
  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingSm">
          Members and Permission
        </Text>
        <BlockStack gap="0">
          {members.map((m, i) => (
            <Box key={i} paddingBlock="200" borderBlockEndWidth={i < members.length - 1 ? "025" : "0"} borderColor="border">
              <InlineStack align="space-between">
                <Text as="span" variant="bodyMd">
                  {m.name}
                </Text>
                <Text as="span" variant="bodySm" tone="subdued">
                  {m.role}
                </Text>
              </InlineStack>
            </Box>
          ))}
        </BlockStack>
        <Box>
          <Button variant="primary">Invite member</Button>
        </Box>
      </BlockStack>
    </Card>
  );
}

function CssPanel() {
  const [css, setCss] = useState(".quote-widget {\n  border-radius: 8px;\n}");
  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingSm">
          Custom CSS
        </Text>
        <TextField label="CSS" value={css} onChange={setCss} multiline={8} autoComplete="off" />
      </BlockStack>
    </Card>
  );
}

function QuoteReminderPanel() {
  const [enabled, setEnabled] = useState(true);
  const [days, setDays] = useState("3");
  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingSm">
          Quote Reminder
        </Text>
        <Checkbox
          label="Send reminder emails"
          helpText="Remind customers about pending quotes"
          checked={enabled}
          onChange={setEnabled}
        />
        <Box maxWidth="240px">
          <TextField
            label="Send reminder after (days)"
            value={days}
            onChange={setDays}
            type="number"
            autoComplete="off"
          />
        </Box>
      </BlockStack>
    </Card>
  );
}

function OtherNotificationPanel() {
  const [items, setItems] = useState([
    { label: "New quote request", checked: true },
    { label: "Quote accepted", checked: true },
    { label: "Quote expired", checked: false },
  ]);
  const toggle = (i) => {
    const next = [...items];
    next[i].checked = !next[i].checked;
    setItems(next);
  };
  return (
    <Card>
      <BlockStack gap="300">
        <Text as="h2" variant="headingSm">
          Other Notification
        </Text>
        {items.map((it, i) => (
          <Checkbox key={i} label={it.label} checked={it.checked} onChange={() => toggle(i)} />
        ))}
      </BlockStack>
    </Card>
  );
}

const panelMap = {
  "lead-scoring": LeadScoringPanel,
  abandoned: AbandonedQuotesPanel,
  formatting: FormattingStandardsPanel,
  "pdf-template": PdfTemplatePanel,
  email: EmailNotificationPanel,
  sync: SyncDataPanel,
  members: MembersPanel,
  css: CssPanel,
  "quote-reminder": QuoteReminderPanel,
  "other-notification": OtherNotificationPanel,
};

/* ---------------- Page ---------------- */

export default function SettingsPage() {
  const [active, setActive] = useState("formatting");
  const ActivePanel = panelMap[active];
  const handleSelect = useCallback((key) => setActive(key), []);

  return (
    <Page
      title="Settings"
      secondaryActions={[{ content: "English" }]}
      fullWidth
    >
      <InlineStack gap="400" align="start" wrap={false}>
        <Box minWidth="260px" maxWidth="260px">
          <SettingsNav active={active} onSelect={handleSelect} />
        </Box>
        <Box width="100%">
          <ActivePanel />
        </Box>
      </InlineStack>
    </Page>
  );
}