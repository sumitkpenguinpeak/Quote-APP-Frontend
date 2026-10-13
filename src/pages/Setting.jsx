import React, { useState, useCallback, useMemo, useEffect } from "react";
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
  Toast,
  Frame,
  Modal,
  Banner,
} from "@shopify/polaris";
import {
  EditIcon,
  FileIcon,
  EmailIcon,
  CodeIcon,
  CheckIcon,
  ViewIcon,
  SendIcon,
  ClipboardIcon,
  SaveIcon,
  ArrowLeftIcon,
  PaintBrushFlatIcon,
  SettingsIcon,
} from "@shopify/polaris-icons";

const navItems = [
  { key: "formatting", label: "Formatting standards", icon: EditIcon },
  { key: "button-appearance", label: "Button appearance", icon: PaintBrushFlatIcon },
  { key: "email-config", label: "Email Configuration", icon: SettingsIcon },
  { key: "pdf-template", label: "PDF Template", icon: FileIcon },
  { key: "email-template", label: "Email Templates", icon: EmailIcon },
  { key: "css", label: "CSS", icon: CodeIcon },
];

import ButtonAppearanceBar from '../components/ButtonAppearanceBar.jsx'
import FormattingStandardsBar from '../components/FormattingStandardsBar.jsx' 
import CustomCSS from '../components/CustomCSS.jsx'
import EmailConfiguration from '../components/EmailConfiguration.jsx'
import Quotepdftemplateeditor  from '../components/Quotepdftemplateeditor.jsx'
import InvoicePdfTemplateEditor  from '../components/Invoicepdftemplateeditor.jsx'
import AppBridgeSaveBar from '../components/AppBridgeSaveBar.jsx'
import { sendTestEmail, updateEmailTemplate, getEmailTemplate } from '../services/api';
import usePlan from '../hooks/usePlan';

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

function FormattingStandardsPanel() {

  return (
      <FormattingStandardsBar />
  );
}

const BUTTON_APPEARANCE_DEFAULTS = {
  buttonText: "Request a Quote",
  buttonColor: "#1C1917",
  textColor: "#FFFFFF",
  cornerRadius: 8,
  showOnProduct: true,
  showOnCollection: true,  
  showOnCart: false,
  hidePriceGlobally: false,
  hideAddToCart: false,
};

function ButtonAppearancePanel() {
  // `savedForm` = last-persisted state (what the server has).
  // `form` = the live draft the merchant is editing.
  const [savedForm, setSavedForm] = useState(BUTTON_APPEARANCE_DEFAULTS);
  const [form, setForm] = useState(BUTTON_APPEARANCE_DEFAULTS);
  const [saving, setSaving] = useState(false);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedForm),
    [form, savedForm]
  );

  async function handleSave() {
    setSaving(true);
    try {
      // await api.put('/settings/button-appearance', form);
      await new Promise((r) => setTimeout(r, 500));
      setSavedForm(form); // draft becomes the new "saved" baseline
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    setForm(savedForm); // revert every field back to last-saved values
  }

  return (
    <>
      {/* Renders Shopify's native top Save Bar - only visible when isDirty */}
      <AppBridgeSaveBar
        visible={isDirty}
        saving={saving}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />

      <ButtonAppearanceBar form={form} handleDiscard={handleDiscard} isDirty={isDirty} handleSave={handleSave} saving={saving} BUTTON_APPEARANCE_DEFAULTS={BUTTON_APPEARANCE_DEFAULTS} setForm={setForm} />
    </>
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

const EmailTemplateRows = [
  {
    key: "new_quote_to_merchant", 
    name: "New Quote to Merchant",
    description: "Notify the merchant when a new quote request is received.",
    heading:"New Quote to Merchant",
    subheading:"",
    storeName: "",
    defaultSubject:"New quote request: {{quote_number}}",
    defaultBody: "<p>You received a new quote request <strong>{{quote_number}}</strong> from {{customer_name}} ({{customer_email}}).</p><p>{{quote_items_count}} item(s) - estimated total {{quote_total}}.</p><p>Log in to your admin panel to review and respond.</p>",
    previewFooter: "",
  },
  {
    key: "quote_received_to_customer", 
    name: "Received Quote to Customer",
    description: "Notify the customer when their quote request has been received.",
    heading:"Received Quote to Customer",
    subheading:"",
    storeName: "",
    defaultSubject:"We received your quote request - {{quote_number}}",
    defaultBody: "<p>Hi {{customer_name}},</p><p>Thanks for your quote request <strong>{{quote_number}}</strong> to {{store_name}}. We will get back to you shortly with pricing.</p>",
    previewFooter: "",
  },
  {
    key: "quote_approved", 
    name: "Quote approved",
    description: "Notify the customer when their quote has been approved.",
    heading:"Quote approved",
    subheading:"",
    storeName: "",
    defaultSubject:"Your quote {{quote_number}} has been approved",
    defaultBody: "<p>Hi {{customer_name}},</p><p>Good news - your quote <strong>{{quote_number}}</strong> has been approved. Final total: {{quote_total}}.</p><p>We will follow up shortly with next steps to complete your order.</p>",
    previewFooter: "",
  },
  {
    key: "quote_rejected", 
    name: "Quote Rejected",
    description: "Notify the customer when their quote request has been rejected.",
    heading:"Quote Rejected",
    subheading:"",
    storeName: "",
    defaultSubject:"Update on your quote {{quote_number}}",
    defaultBody: "<p>Hi {{customer_name}},</p><p>Unfortunately we are unable to fulfill quote <strong>{{quote_number}}</strong> at this time. Feel free to reach out with any questions.</p>",
    previewFooter: "",
  },
  {
    key: "new_message", 
    name: "New Message",
    description: "Notify the recipient when a new message is received regarding a quote.",
    heading:"New Message",
    subheading:"",
    storeName: "",
    defaultSubject:"New message on quote {{quote_number}}",
    defaultBody: "<p>There is a new message on quote <strong>{{quote_number}}</strong>. Log in to view and reply.</p>",
    previewFooter: "",
  },
  {
    key: "quote_converted_to_order", 
    name: "Quote Convert to Order",
    description: "Notify the customer when their approved quote is converted into an order.",
    heading:"Quote Convert to Order",
    subheading:"",
    storeName: "",
    defaultSubject:"Your order is ready - quote {{quote_number}}",
    defaultBody: "<p>Hi {{customer_name}},</p><p>Your quote <strong>{{quote_number}}</strong> has been converted into an order. Total: {{quote_total}}.</p><p>You will receive a separate invoice/checkout link to complete payment.</p>",
    previewFooter: "",
  },
  {
    key: "quote_expiring_soon", 
    name: "Quote Expiring Soon",
    description: "Remind the customer when their quote is approaching its expiration date.",
    heading:"Quote Expiring Soon",
    subheading:"454545",
    storeName: "97887",
    defaultSubject:"Your quote {{quote_number}} is expiring soon",
    defaultBody: "<p>Hi {{customer_name}},</p><p>Just a reminder that your quote <strong>{{quote_number}}</strong> will expire soon. Reach out if you would like to proceed.</p>",
    previewFooter: "",
  },
  {
    key: "invoice_sent",
    name: "Invoice Email",
    description: "Email sent to the customer with the invoice PDF attached (Send Invoice button on the quote).",
    heading: "Invoice",
    subheading: "",
    storeName: "",
    defaultSubject: "Invoice {{invoice_number}} from {{store_name}}",
    defaultBody: "<p>Hi {{customer_name}},</p><p>Please find your invoice <strong>{{invoice_number}}</strong> (quote {{quote_number}}) attached. Amount due: {{quote_total}}.</p>{{custom_message}}{{payment_section}}<p>Reply to this email if you have any questions.</p>",
    previewFooter: "",
  }
];

// Sample values used to render the live preview — mirrors the tokens below.
const sampleData = {
  customer_name: "Priya Shah",
  customer_email:"priyashah@gmail.com",
  quote_number: "Q-1042",
  invoice_number: "IW2026-10-09-42",
  custom_message: "",
  payment_section: "",
  quote_total: "₹85,000",
  quote_items_count: "3",
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
  "{{invoice_number}}",
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

// Baseline draft used for both the initial state and for resetting on discard.
function buildInitialTemplateState(template) {
  return {
    subject: template.defaultSubject,
    body: template.defaultBody,
    fullHtml: false,
    isTemplateActive: true,
  };
}

function TemplateEditor({ template, onBack }) {
  const initialState = useMemo(() => buildInitialTemplateState(template), [template]);

  // `savedTemplateState` = last-persisted state (what the server has).
  // The individual fields below are the live draft being edited.
  const [savedTemplateState, setSavedTemplateState] = useState(initialState);

  const [fullHtml, setFullHtml] = useState(initialState.fullHtml);
  const [subject, setSubject] = useState(initialState.subject);
  const [body, setBody] = useState(initialState.body);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTestMail, setSendingTestMail] = useState(false);

  // Whether this template is enabled / will actually be sent.
  const [isTemplateActive, setIsTemplateActive] = useState(initialState.isTemplateActive);
  // Controls the "Live preview" popup.
  const [previewModalActive, setPreviewModalActive] = useState(false);
  // Loading state for the Save template call.
  const [savingTemplate, setSavingTemplate] = useState(false);

  const currentTemplateState = useMemo(
    () => ({ subject, body, fullHtml, isTemplateActive }),
    [subject, body, fullHtml, isTemplateActive]
  );

  const isDirty = useMemo(
    () => JSON.stringify(currentTemplateState) !== JSON.stringify(savedTemplateState),
    [currentTemplateState, savedTemplateState]
  );

  const [loadingTemplate, setLoadingTemplate] = useState(true);

  // Fetch the saved template from the server and hydrate the form with it.
  useEffect(() => {
    let cancelled = false;

    async function fetchTemplate() {
      setLoadingTemplate(true);
      try {
        const response = await getEmailTemplate(template.key);
        const data = response?.data?.data || response?.data || {};

        if (cancelled) return;

        const fetchedState = {
          subject: data.subject ?? template.defaultSubject,
          body: data.body_html ?? template.defaultBody,
          fullHtml: !!data.full_document,
          isTemplateActive: data.active ?? true,
        };

        setSubject(fetchedState.subject);
        setBody(fetchedState.body);
        setFullHtml(fetchedState.fullHtml);
        setIsTemplateActive(fetchedState.isTemplateActive);
        setSavedTemplateState(fetchedState);
      } catch (err) {
        console.error("Fetch template error:", err);
        showToast(
          err?.response?.data?.message || "Failed to load template.",
          true
        );
      } finally {
        if (!cancelled) setLoadingTemplate(false);
      }
    }

    fetchTemplate();

    return () => {
      cancelled = true;
    };
  }, [template.key]);

  const [toastActive, setToastActive] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastError, setToastError] = useState(false);

  const showToast = (message, isError = false) => {
    setToastMessage(message);
    setToastError(isError);
    setToastActive(true);
  };

  const dismissToast = useCallback(() => setToastActive(false), []);

  const testMail = async () => {
    if (!testEmail.trim()) {
      showToast("Please enter test email address.", true);
      return;
    }
    
    setSendingTestMail(true);


    console.log("template.key", template.key);

    try {
      // setLoading(true);
      // setError(null);
      const response = await sendTestEmail(template.key,testEmail);
      const quotes = response?.data?.data || response?.data || [];
      console.log("response", response);
      showToast(response?.data?.message || "Test email sent successfully.", false);
    } catch (err) {
      console.error("Send test mail error:", err);

      showToast(
      err?.response?.data?.message || "Failed to send test email.",
      true
    );
    } finally {
      setSendingTestMail(false);
    }

  };

  const handleSaveTemplate = async () => {
    setSavingTemplate(true);
    try {
      const response = await updateEmailTemplate(template.key, {
        subject,
        body_html: body,
        is_full_document: fullHtml,
        is_active: isTemplateActive,
      });
      showToast(response?.data?.message || "Template saved successfully.", false);
      // Draft becomes the new "saved" baseline — clears the Save Bar.
      setSavedTemplateState(currentTemplateState);
    } catch (err) {
      console.error("Save template error:", err);
      showToast(
        err?.response?.data?.message || "Failed to save template.",
        true
      );
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDiscardTemplate = () => {
    // Revert every field back to the last-saved values.
    setSubject(savedTemplateState.subject);
    setBody(savedTemplateState.body);
    setFullHtml(savedTemplateState.fullHtml);
    setIsTemplateActive(savedTemplateState.isTemplateActive);
  };

  const copyToken = (token) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(token);
    }
  };

  const toggleFullHtml = useCallback(() => setFullHtml((v) => !v), []);

  return (
    <BlockStack gap="300">
      {/* Renders Shopify's native top Save Bar - only visible when isDirty */}
      <AppBridgeSaveBar
        visible={isDirty}
        saving={savingTemplate}
        onSave={handleSaveTemplate}
        onDiscard={handleDiscardTemplate}
      />

      <InlineStack gap="200" blockAlign="center">
        <Button icon={ArrowLeftIcon} variant="tertiary" onClick={onBack}>
          Back to {template.heading}
        </Button>
      </InlineStack>

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
                {/* Active / Inactive toggle — controls whether this template is enabled */}
                <InlineStack gap="150" blockAlign="center">
                  <div
                    onClick={() => setIsTemplateActive((v) => !v)}
                    style={{
                      cursor: "pointer",
                      width: 36,
                      height: 20,
                      borderRadius: 999,
                      background: isTemplateActive
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
                        left: isTemplateActive ? 18 : 2,
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
                    {isTemplateActive ? "Active" : "Inactive"}
                  </Text>
                </InlineStack>

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
                <Button icon={ViewIcon} onClick={() => setPreviewModalActive(true)}>
                  Preview
                </Button>
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
                disabled={loadingTemplate}
              />
              <TextField
                label="Message body"
                value={body}
                onChange={setBody}
                multiline={8}
                autoComplete="off"
                monospaced
                disabled={loadingTemplate}
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
                  <Button onClick={testMail} icon={SendIcon} loading={sendingTestMail} disabled={!testEmail.trim() || loadingTemplate}>Send test</Button>
                </InlineStack>
                <Button
                  variant="primary"
                  icon={SaveIcon}
                  onClick={handleSaveTemplate}
                  loading={savingTemplate}
                  disabled={loadingTemplate}
                >
                  Save template
                </Button>
              </InlineStack>
            </BlockStack>
          </Box>
        </Card>
      </Box>

      {/* Live preview popup */}
      <Modal
        open={previewModalActive}
        onClose={() => setPreviewModalActive(false)}
        title="Live preview — sample data"
      >
        <Modal.Section>
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
        </Modal.Section>
      </Modal>

      {toastActive && (
      <Frame>
        <Toast
          content={toastMessage}
          error={toastError}
          onDismiss={dismissToast}
          duration={3000}
        />
      </Frame>
    )}
    </BlockStack>
  );
}

function NewPDFTemplatePanel({ template, onBack }) {
  return (
    <BlockStack gap="400">
      <InlineStack gap="200" blockAlign="center">
        <Button icon={ArrowLeftIcon} variant="tertiary" onClick={onBack} accessibilityLabel="Back to PDF templates" />
        <Text as="h2" variant="headingMd">Template / {template.name}</Text>
      </InlineStack>

      {template.key === "invoice" ? <InvoicePdfTemplateEditor /> : <Quotepdftemplateeditor />}
    </BlockStack>
  );
}

function PdfTemplatePanel() {
  const plan = usePlan();
  const [editingKey, setEditingKey] = useState(null);
  const editingTemplate = pdfTemplateRows.find((r) => r.key === editingKey);

  if (editingTemplate) {
    return (
      <NewPDFTemplatePanel
        template={editingTemplate}
        onBack={() => setEditingKey(null)}
      />
    );
  }

  return (
    <Card padding="0">
      {!plan.loading && !plan.can("templates") && (
        <Box padding="400">
          <Banner
            tone="info"
            title="Modifying templates is a Pro feature"
            action={{ content: "Upgrade to Pro", onAction: () => { window.location.href = `/billing${window.location.search}`; } }}
          >
            You are on the {plan.name} plan, so the default templates are used. Upgrade to Pro to edit them.
          </Banner>
        </Box>
      )}
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
              <Button icon={EditIcon} disabled={!plan.can("templates")} onClick={() => setEditingKey(row.key)} accessibilityLabel={`Edit ${row.name}`} />
            </InlineStack>
          </Box>
        ))}
      </BlockStack>
    </Card>
  );
}



function EmailConfigPanel() {
  return <EmailConfiguration />;
}

function CssPanel() {

  return (
      <CustomCSS />
  ); 
}

function EmailTemplatePanel(){
    const plan = usePlan();
    const [editingKey, setEditingKey] = useState(null);
    const editingTemplate = EmailTemplateRows.find((r) => r.key === editingKey);

    if (editingTemplate) {
      return <TemplateEditor template={editingTemplate} onBack={() => setEditingKey(null)} />;
    }
  return(
        <Card padding="0">
      {!plan.loading && !plan.can("templates") && (
        <Box padding="400">
          <Banner
            tone="info"
            title="Modifying templates is a Pro feature"
            action={{ content: "Upgrade to Pro", onAction: () => { window.location.href = `/billing${window.location.search}`; } }}
          >
            You are on the {plan.name} plan, so the default templates are used. Upgrade to Pro to edit them.
          </Banner>
        </Box>
      )}
      <Box padding="400">
        <Text as="h2" variant="headingSm">
          Email Template
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
        {EmailTemplateRows.map((row, i) => (
          <Box
            key={row.key}
            padding="400"
            borderBlockEndWidth={i < EmailTemplateRows.length - 1 ? "025" : "0"}
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
              <Button icon={EditIcon} disabled={!plan.can("templates")} onClick={() => setEditingKey(row.key)} accessibilityLabel={`Edit ${row.name}`} />
            </InlineStack>
          </Box>
        ))}
      </BlockStack>
    </Card>
  )
}


const panelMap = {
  formatting: FormattingStandardsPanel,
  "button-appearance": ButtonAppearancePanel,
  "pdf-template": PdfTemplatePanel,
  "email-config": EmailConfigPanel,
  "email-template": EmailTemplatePanel,
   css: CssPanel,
};

export default function SettingsPage() {
  const [active, setActive] = useState(() =>
    new URLSearchParams(window.location.search).has("email_config") ? "email-config" : "formatting"
  );
  const ActivePanel = panelMap[active];
  const handleSelect = useCallback((key) => setActive(key), []);

  return (
    <Page
      title="Settings"
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