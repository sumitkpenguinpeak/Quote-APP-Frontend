import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Card,
  Box,
  Text,
  TextField,
  Button,
  InlineStack,
  BlockStack,
  Divider,
  Checkbox,
  Icon,
  Page,
} from "@shopify/polaris";

import {
  EmailIcon,
  IncomingIcon,
  ChatIcon,
  CheckCircleIcon,
  XCircleIcon,
  CartIcon,
  ClockIcon,
  CodeIcon,
  TextAlignLeftIcon,
  ViewIcon,
  SendIcon,
  SaveIcon,
  UndoIcon,
  ClipboardIcon,
  CheckIcon,
} from "@shopify/polaris-icons";
import AppLayout from "../components/AppLayout";
import { getQuoteEmail, sendTestEmail, updateEmailTemplate } from "../services/api";

const TEMPLATE_TYPES = [
  {
    type: "new_quote_to_merchant",
    label: "New quote received",
    icon: IncomingIcon,
    recipient: "Merchant",
  },
  {
    type: "quote_received_to_customer",
    label: "Quote confirmation",
    icon: EmailIcon,
    recipient: "Customer",
  },
  {
    type: "quote_approved",
    label: "Quote approved",
    icon: CheckCircleIcon,
    recipient: "Customer",
  },
  {
    type: "quote_rejected",
    label: "Quote rejected",
    icon: XCircleIcon,
    recipient: "Customer",
  },
  {
    type: "new_message",
    label: "New negotiation message",
    icon: ChatIcon,
    recipient: "Both",
  },
  {
    type: "quote_converted_to_order",
    label: "Converted to order",
    icon: CartIcon,
    recipient: "Customer",
  },
  {
    type: "quote_expiring_soon",
    label: "Quote expiring soon",
    icon: ClockIcon,
    recipient: "Customer",
  },
];

const AVAILABLE_TOKENS = [
  "customer_name",
  "quote_number",
  "quote_total",
  "subtotal",
  "discount",
  "grand_total",
  "store_name",
  "expiry_date",
  "current_date",
  "year",
  "consultant_name",
  "product_1",
  "description_1",
  "qty_1",
  "price_1",
  "total_1",
];

const seedTemplates = {
  new_quote_to_merchant: {
    is_customized: true,
    is_active: true,
    is_full_document: false,
    subject: "New quote request: {{quote_number}}",
    body_html: `<p>You received a new quote request <strong>{{quote_number}}</strong> from {{customer_name}}.</p>\n<p>{{quote_items_count}} item(s) - estimated total {{quote_total}}.</p>\n<p>Log in to your admin panel to review and respond.</p>`,
  },
  quote_received_to_customer: {
    is_customized: false,
    is_active: true,
    is_full_document: false,
    subject: "We received your quote request - {{quote_number}}",
    body_html: `<p>Hi {{customer_name}},</p>\n<p>Thanks for your quote request <strong>{{quote_number}}</strong> to {{store_name}}. We will get back to you shortly with pricing.</p>`,
  },
  quote_approved: {
    is_customized: false,
    is_active: true,
    is_full_document: false,
    subject: "Your quote {{quote_number}} has been approved",
    body_html: `<p>Hi {{customer_name}},</p>\n<p>Good news - your quote <strong>{{quote_number}}</strong> has been approved. Final total: {{quote_total}}.</p>`,
  },
  quote_rejected: {
    is_customized: false,
    is_active: true,
    is_full_document: false,
    subject: "Update on your quote {{quote_number}}",
    body_html: `<p>Hi {{customer_name}},</p>\n<p>Unfortunately we are unable to fulfill quote <strong>{{quote_number}}</strong> at this time.</p>`,
  },
  new_message: {
    is_customized: false,
    is_active: true,
    is_full_document: false,
    subject: "New message on quote {{quote_number}}",
    body_html: `<p>There is a new message on quote <strong>{{quote_number}}</strong>. Log in to view and reply.</p>`,
  },
  quote_converted_to_order: {
    is_customized: false,
    is_active: true,
    is_full_document: false,
    subject: "Your order is ready - quote {{quote_number}}",
    body_html: `<p>Hi {{customer_name}},</p>\n<p>Your quote <strong>{{quote_number}}</strong> has been converted into an order. Total: {{quote_total}}.</p>`,
  },
  quote_expiring_soon: {
    is_customized: false,
    is_active: true,
    is_full_document: false,
    subject: "Your quote {{quote_number}} is expiring soon",
    body_html: `<p>Hi {{customer_name}},</p>\n<p>Just a reminder that your quote <strong>{{quote_number}}</strong> will expire soon.</p>`,
  },
};

const MOCK_PREVIEW_VALUES = {
  customer_name: "Priya Shah",
  quote_number: "Q-1042",
  quote_total: "₹78,000",
  subtotal: "₹84,500",
  discount: "-₹6,500",
  grand_total: "₹78,000",
  store_name: "Khan Interiors",
  expiry_date: "24 Aug 2026",
  current_date: "18 Aug 2026",
  year: "2026",
  consultant_name: "Neha S.",
  product_1: "Premium Cotton Fabric",
  description_1: "Navy Blue",
  qty_1: "200",
  price_1: "₹310",
  total_1: "₹62,000",
};

function renderPreviewHtml(bodyHtml, isFullDocument) {
  let rendered = bodyHtml.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (m, key) => MOCK_PREVIEW_VALUES[key.toLowerCase()] ?? "",
  );

  if (isFullDocument) return rendered;

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head>
    <body style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#F5F5F4;padding:24px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E7E5E4;">
        <tr><td style="background:#1C1917;padding:20px 24px;"><span style="color:#fff;font-size:16px;font-weight:600;">Khan Interiors</span></td></tr>
        <tr><td style="padding:28px 24px;color:#1C1917;font-size:14px;line-height:1.6;">${rendered}</td></tr>
        <tr><td style="padding:16px 24px;background:#FAFAF9;border-top:1px solid #E7E5E4;"><span style="font-size:11.5px;color:#A8A29E;">This email was sent regarding your quote request.</span></td></tr>
      </table>
    </body></html>`;
}

// Copies text to the clipboard, with a fallback for contexts where
// navigator.clipboard is unavailable (e.g. non-HTTPS iframes)
async function copyToClipboard(text) {
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to legacy fallback below
    }
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let succeeded = false;
  try {
    succeeded = document.execCommand("copy");
  } catch {
    succeeded = false;
  }
  document.body.removeChild(textarea);
  return succeeded;
}

export default function Setting() {
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState(TEMPLATE_TYPES[0].type);
  const [showPreview, setShowPreview] = useState(true);
  const [testEmail, setTestEmail] = useState("");
  const [copiedToken, setCopiedToken] = useState(null);
  const [saveState, setSaveState] = useState("idle"); 
  const [testState, setTestState] = useState("idle");
  const copyResetTimeout = useRef(null);
  const [updateData, setUpdateData] = useState({});
  // Update State
  const [originalItems, setOriginalItems] = useState({});

  // Fetch email templates from API on component mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        setLoading(true);
        const response = await getQuoteEmail();

        // Transform API response array into object format
        // Merge with seedTemplates to provide defaults for null/empty fields
        const templatesObj = {};
        response.data.data.forEach((template) => {
          const seedDefault = seedTemplates[template.type] || {};
          templatesObj[template.type] = {
            is_customized: template.is_customized,
            is_active: template.is_active,
            is_full_document: template.is_full_document || seedDefault.is_full_document || false,
            subject: template.subject || seedDefault.subject || "",
            body_html: template.body_html || seedDefault.body_html || "",
          };
        });

        setTemplates(templatesObj);
        setOriginalItems(templatesObj);
        if (Object.keys(templatesObj).length > 0) {
          setSelectedType(Object.keys(templatesObj)[0]);
        }
      } catch (error) {
        console.error("Error fetching email templates:", error);
        setTemplates({});
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  const current = templates[selectedType] || seedTemplates[selectedType] || {
    is_customized: false,
    is_active: true,
    is_full_document: false,
    subject: "",
    body_html: "",
  };
  const meta = TEMPLATE_TYPES.find((t) => t.type === selectedType);

  const previewSrcDoc = useMemo(
    () =>current.body_html ? renderPreviewHtml(current.body_html, current.is_full_document) : "",
    [current.body_html, current.is_full_document],
  );

  const updateCurrent = useCallback(
    (patch) => {
      setTemplates((prev) => ({
        ...prev,
        [selectedType]: {
          ...prev[selectedType],
          ...patch,
          is_customized: true,
        },
      }));
    },
    [selectedType],
  );


  const handleSave = useCallback(async () => {
    if (!current || !selectedType) return;
    setSaveState("saving");
    try {
      const payload = {
        subject: current.subject,
        body_html: current.body_html,
        is_full_document: current.is_full_document,
        is_active: current.is_active,
      };
      
      await updateEmailTemplate(selectedType, payload);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2200);
    } catch (error) {
      console.error("Error saving email template:", error);
      setSaveState("idle");
    }
  }, [current, selectedType]);

  // Send email
  const handleSendTest = useCallback(async () => {
    if (!testEmail.trim() || !selectedType) return;
    setTestState("sending");
    try {
      await sendTestEmail(selectedType, testEmail);
      setTestState("sent");
      setTimeout(() => setTestState("idle"), 2200);
    } catch (error) {
      console.error("Error sending test email:", error);
      setTestState("idle");
    }
  }, [testEmail, selectedType]);

  const handleRevert = useCallback(() => {
    const seedDefault = seedTemplates[selectedType] || {};
    setTemplates((prev) => ({
      ...prev,
      [selectedType]: {
        is_customized: false,
        is_active: seedDefault.is_active ?? true,
        is_full_document: seedDefault.is_full_document ?? false,
        subject: seedDefault.subject || "",
        body_html: seedDefault.body_html || "",
      },
    }));
  }, [selectedType]);

  const copyToken = useCallback(async (token) => {
    const succeeded = await copyToClipboard(`{{${token}}}`);
    if (!succeeded) return;

    setCopiedToken(token);
    if (copyResetTimeout.current) clearTimeout(copyResetTimeout.current);
    copyResetTimeout.current = setTimeout(() => setCopiedToken(null), 1200);
  }, []);

  return (
    <AppLayout>
      <Page title="Quote Email Templates" fullWidth>
        <Card padding="0">
          {loading ? (
            <Box padding="600">
              <BlockStack gap="300" align="center">
                <Text variant="headingMd">Loading email templates...</Text>
              </BlockStack>
            </Box>
          ) : Object.keys(templates).length === 0 ? (
            <Box padding="600">
              <BlockStack gap="300" align="center">
                <Text variant="headingMd" tone="subdued">
                  No email templates found
                </Text>
              </BlockStack>
            </Box>
          ) : (
            <>
              {/* Top bar */}
              <Box padding="400">
                <BlockStack gap="100">
                  <Text variant="headingMd" as="h1">
                    Email templates
                  </Text>
                  <Text tone="subdued">
                    Customize the emails sent to customers and your team
                  </Text>
                </BlockStack>
              </Box>

              <Divider />

              <div style={{ display: "flex", minHeight: 540 }}>
                {/* LEFT: template list */}
                <Box
                  width="260px"
                  borderInlineEndWidth="025"
                  borderColor="border"
                  padding="300"
                >
                  <BlockStack gap="100">
                    {TEMPLATE_TYPES.map((t) => {
                      const tpl = templates[t.type];
                      const isSelected = t.type === selectedType;

                      return (
                        <Box position="relative" key={t.type}>
                          <Button
                            fullWidth
                            textAlign="start"
                            variant={isSelected ? "primary" : "tertiary"}
                            icon={t.icon}
                            onClick={() => setSelectedType(t.type)}
                          >
                            <BlockStack gap="050">
                              <Text
                                variant="bodyMd"
                                fontWeight={isSelected ? "semibold" : "medium"}
                              >
                                {t.label}
                              </Text>
                              <Text
                                variant="bodySm"
                                tone={isSelected ? "base" : "subdued"}
                              >
                                To: {t.recipient}
                              </Text>
                            </BlockStack>
                          </Button>

                          {tpl.is_customized && (
                            <Box
                              position="absolute"
                              insetBlockStart="200"
                              insetInlineEnd="200"
                              background="bg-fill-info"
                              borderRadius="full"
                              minWidth="8px"
                              minHeight="8px"
                            />
                          )}
                        </Box>
                      );
                    })}
                  </BlockStack>
                </Box>

                {/* RIGHT: editor + preview */}
                <div style={{ flex: 1, display: "flex" }}>
                  <div
                    style={{
                      flex: showPreview ? "1 1 50%" : "1 1 100%",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <Box
                      borderInlineEndWidth={showPreview ? "025" : "0"}
                      borderColor="border"
                    >
                      {/* Editor header */}
                      <Box padding="400">
                        <InlineStack
                          align="space-between"
                          blockAlign="center"
                          gap="300"
                          wrap
                        >
                          <BlockStack gap="050">
                            <Text variant="headingMd" as="h2">
                              {meta.label}
                            </Text>
                            <Text
                              variant="bodySm"
                              tone={current.is_customized ? "magic" : "subdued"}
                            >
                              {current.is_customized
                                ? "Customized"
                                : "Using default template"}
                            </Text>
                          </BlockStack>

                          <InlineStack gap="300" blockAlign="center">
                            <Checkbox
                              label="Full HTML design"
                              checked={current.is_full_document}
                              onChange={(v) =>
                                updateCurrent({ is_full_document: v })
                              }
                            />

                            <Button
                              icon={ViewIcon}
                              pressed={showPreview}
                              onClick={() => setShowPreview((s) => !s)}
                            >
                              Preview
                            </Button>
                          </InlineStack>
                        </InlineStack>
                      </Box>

                      <Divider />

                      <Box padding="500">
                        <BlockStack gap="500">
                          <TextField
                            label="Subject line"
                            value={current.subject}
                            onChange={(v) => updateCurrent({ subject: v })}
                            autoComplete="off"
                          />

                          <BlockStack gap="200">
                            <InlineStack gap="100" blockAlign="center">
                              <Icon
                                source={
                                  current.is_full_document
                                    ? CodeIcon
                                    : TextAlignLeftIcon
                                }
                                tone="subdued"
                              />
                              <Text
                                variant="bodySm"
                                fontWeight="semibold"
                                tone="subdued"
                              >
                                {current.is_full_document
                                  ? "Full HTML document"
                                  : "Message body"}
                              </Text>
                            </InlineStack>

                            <TextField
                              labelHidden
                              label={
                                current.is_full_document
                                  ? "Full HTML document"
                                  : "Message body"
                              }
                              value={current.body_html}
                              onChange={(v) => updateCurrent({ body_html: v })}
                              multiline={10}
                              autoComplete="off"
                              monospaced={current.is_full_document}
                            />
                          </BlockStack>

                          <BlockStack gap="200">
                            <Text variant="bodySm" fontWeight="semibold">
                              AVAILABLE TOKENS — CLICK TO COPY
                            </Text>

                            <InlineStack gap="200" wrap>
                              {AVAILABLE_TOKENS.map((token) => {
                                const wasCopied = copiedToken === token;

                                return (
                                  <Button
                                    key={token}
                                    size="slim"
                                    icon={wasCopied ? CheckIcon : ClipboardIcon}
                                    tone={wasCopied ? "success" : undefined}
                                    onClick={() => copyToken(token)}
                                  >
                                    {wasCopied ? "Copied!" : `{{${token}}}`}
                                  </Button>
                                );
                              })}
                            </InlineStack>
                          </BlockStack>
                        </BlockStack>
                      </Box>

                      <Divider />

                      {/* Footer actions */}
                      <Box padding="300">
                        <InlineStack
                          align="space-between"
                          blockAlign="center"
                          gap="300"
                          wrap
                        >
                          <InlineStack gap="200" blockAlign="center">
                            <Box minWidth="180px">
                              <TextField
                                value={testEmail}
                                onChange={setTestEmail}
                                placeholder="test@email.com"
                                autoComplete="off"
                                type="email"
                              />
                            </Box>

                            <Button
                              icon={testState === "sent" ? CheckIcon : SendIcon}
                              loading={testState === "sending"}
                              disabled={!testEmail.trim()}
                              tone={
                                testState === "sent" ? "success" : undefined
                              }
                              onClick={handleSendTest}
                            >
                              {testState === "sent" ? "Sent" : "Send test"}
                            </Button>
                          </InlineStack>

                          <InlineStack gap="200">
                            {current.is_customized && (
                              <Button icon={UndoIcon} onClick={handleRevert}>
                                Revert to default
                              </Button>
                            )}

                            <Button
                              variant="primary"
                              icon={
                                saveState === "saved" ? CheckIcon : SaveIcon
                              }
                              loading={saveState === "saving"}
                              tone={
                                saveState === "saved" ? "success" : undefined
                              }
                              onClick={handleSave}
                            >
                              {saveState === "saved"
                                ? "Saved"
                                : "Save template"}
                            </Button>
                          </InlineStack>
                        </InlineStack>
                      </Box>
                    </Box>
                  </div>

                  {/* Preview pane */}
                  {showPreview && (
                    <div
                      style={{
                        flex: "1 1 50%",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <Box background="bg-surface-secondary" minHeight="100%">
                        <Box padding="300">
                          <Text variant="bodySm" tone="subdued">
                            Live preview — sample data
                          </Text>
                        </Box>

                        <Divider />

                        <iframe
                          title="Email preview"
                          srcDoc={previewSrcDoc}
                          style={{
                            border: "none",
                            width: "100%",
                            minHeight: 460,
                          }}
                          sandbox=""
                        />
                      </Box>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </Card>
      </Page>
    </AppLayout>
  );
}
