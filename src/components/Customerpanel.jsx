import { useState } from "react";
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Button,
  Box,
  Icon,
} from "@shopify/polaris";
import { ChevronUpIcon, ChevronDownIcon, CalendarIcon, XCircleIcon } from "@shopify/polaris-icons";

function getInitials(name) {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function CollapsibleSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingSm">
            {title}
          </Text>
          <Button
            variant="tertiary"
            icon={open ? ChevronUpIcon : ChevronDownIcon}
            accessibilityLabel={open ? `Collapse ${title}` : `Expand ${title}`}
            onClick={() => setOpen((v) => !v)}
          />
        </InlineStack>
        {open && children}
      </BlockStack>
    </Card>
  );
}

export default function CustomerPanel({
  quote,
  message,
  onMessageChange,
  dueDate,
  onDueDateChange,
  onEditCustomer,
  isEditable = true,
}) {
  const customerName = quote?.customer_name || "Unknown customer";
  const customerEmail = quote?.customer_email || "";
  const customerPhone = quote?.customer_phone || "";
  // The customer's own note captured at submission time — read-only here.
  const customerSiteNote = quote?.customer_note || "";

  const [email, setEmail] = useState(customerEmail);
  const [phone, setPhone] = useState(customerPhone);

  return (
    <BlockStack gap="400">
      {/* Customer summary */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h2" variant="headingMd">
              Customer
            </Text>
            <Button variant="tertiary" onClick={onEditCustomer}>
              Edit
            </Button>
          </InlineStack>

          <InlineStack gap="300" blockAlign="center" wrap={false}>
            <Box
              minWidth="48px"
              minHeight="48px"
              borderRadius="full"
              background="bg-fill-success-secondary"
            >
              <InlineStack align="center" blockAlign="center">
                <Box paddingBlock="150">
                  <Text as="span" variant="bodyMd" fontWeight="semibold">
                    {getInitials(customerName)}
                  </Text>
                </Box>
              </InlineStack>
            </Box>
            <BlockStack gap="0">
              <Text as="span" variant="bodyMd" fontWeight="semibold">
                {customerName}
              </Text>
              {customerEmail && (
                <Text as="span" variant="bodySm" tone="subdued">
                  {customerEmail}
                </Text>
              )}
              {customerPhone && (
                <Text as="span" variant="bodySm" tone="subdued">
                  {customerPhone}
                </Text>
              )}
            </BlockStack>
          </InlineStack>
        </BlockStack>
      </Card>

      {/* Editable contact info */}
      <CollapsibleSection title="Customer Information">
        <BlockStack gap="300">
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
            disabled={!isEditable}
            autoComplete="off"
          />
          <TextField
            label="Phone number"
            type="tel"
            value={phone}
            onChange={setPhone}
            disabled={!isEditable}
            autoComplete="off"
          />
        </BlockStack>
      </CollapsibleSection>

      {/* Notes */}
      <CollapsibleSection title="Customer note">
        <BlockStack gap="300">
          <TextField
            label="Site"
            value={customerSiteNote}
            disabled
            autoComplete="off"
          />
          <TextField
            label="Message"
            value={message}
            onChange={onMessageChange}
            multiline={4}
            placeholder="The quote's special note"
            disabled={!isEditable}
            autoComplete="off"
          />
          <TextField
            label="Due date"
            type="date"
            value={dueDate}
            onChange={onDueDateChange}
            disabled={!isEditable}
            autoComplete="off"
            prefix={<Icon source={CalendarIcon} tone="subdued" />}
            connectedRight={
              dueDate ? (
                <Button
                  variant="tertiary"
                  icon={XCircleIcon}
                  accessibilityLabel="Clear due date"
                  onClick={() => onDueDateChange?.("")}
                  disabled={!isEditable}
                />
              ) : null
            }
          />
        </BlockStack>
      </CollapsibleSection>
    </BlockStack>
  );
}