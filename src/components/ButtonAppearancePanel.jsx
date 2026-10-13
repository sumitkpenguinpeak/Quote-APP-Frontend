import React, { useState, useCallback, useMemo } from "react";
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  TextField,
  Button,
  Box,
  Checkbox,
  RangeSlider,
} from "@shopify/polaris";
import AppBridgeSaveBar from "./AppBridgeSaveBar";

const DEFAULT_FORM = {
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

export default function ButtonAppearancePanel() {
  // `savedForm` is the last-persisted state (what the server has).
  // `form` is the live draft the merchant is editing.
  const [savedForm, setSavedForm] = useState(DEFAULT_FORM);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedForm),
    [form, savedForm]
  );

  const update = useCallback((patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

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

      <InlineStack gap="400" align="start" wrap={false}>
        <Box width="100%">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingSm">
                  Button text &amp; color
                </Text>
                <TextField
                  label="Button text"
                  value={form.buttonText}
                  onChange={(v) => update({ buttonText: v })}
                  autoComplete="off"
                />
                <InlineStack gap="300" wrap={false}>
                  <Box width="100%">
                    <TextField
                      label="Button color"
                      value={form.buttonColor}
                      onChange={(v) => update({ buttonColor: v })}
                      autoComplete="off"
                      prefix="#"
                    />
                  </Box>
                  <Box width="100%">
                    <TextField
                      label="Text color"
                      value={form.textColor}
                      onChange={(v) => update({ textColor: v })}
                      autoComplete="off"
                      prefix="#"
                    />
                  </Box>
                </InlineStack>
                <RangeSlider
                  label={`Corner radius (${form.cornerRadius}px)`}
                  min={0}
                  max={24}
                  value={form.cornerRadius}
                  onChange={(v) => update({ cornerRadius: v })}
                  output
                />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingSm">
                  Where should the button show?
                </Text>
                <Checkbox
                  label="Product page"
                  checked={form.showOnProduct}
                  onChange={(v) => update({ showOnProduct: v })}
                />
                <Checkbox
                  label="Collection page"
                  checked={form.showOnCollection}
                  onChange={(v) => update({ showOnCollection: v })}
                />
                <Checkbox
                  label="Cart page"
                  checked={form.showOnCart}
                  onChange={(v) => update({ showOnCart: v })}
                />
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingSm">
                  Pricing behavior
                </Text>
                <Checkbox
                  label="Hide price on all products (quote-only pricing)"
                  checked={form.hidePriceGlobally}
                  onChange={(v) => update({ hidePriceGlobally: v })}
                />
                <Checkbox
                  label="Hide add-to-cart button on all products"
                  checked={form.hideAddToCart}
                  onChange={(v) => update({ hideAddToCart: v })}
                />
              </BlockStack>
            </Card>

            {/* A regular in-page Save button still works too - some merchants
                won't notice the top bar right away. Both call the same handler. */}
            <InlineStack align="end">
              <Button onClick={handleDiscard} disabled={!isDirty}>
                Discard
              </Button>
              <Button variant="primary" onClick={handleSave} loading={saving} disabled={!isDirty}>
                Save
              </Button>
            </InlineStack>
          </BlockStack>
        </Box>

        {/* Live preview */}
        <Box minWidth="280px" maxWidth="280px">
          <BlockStack gap="200">
            <Text as="p" variant="bodySm" tone="subdued">
              Live preview
            </Text>
            <Card>
              <BlockStack gap="300">
                <Box background="bg-surface-secondary" padding="600" borderRadius="200">
                  <BlockStack gap="200" align="center">
                    <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                      Product name
                    </Text>
                    {!form.hidePriceGlobally && (
                      <Text as="p" variant="headingMd" alignment="center">
                        ₹1,499
                      </Text>
                    )}
                    <button
                      style={{
                        marginTop: 8,
                        padding: "10px 18px",
                        borderRadius: `${form.cornerRadius}px`,
                        border: "none",
                        background: form.buttonColor,
                        color: form.textColor,
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: "default",
                        width: "100%",
                      }}
                    >
                      {form.buttonText || "Request a Quote"}
                    </button>
                    {!form.hideAddToCart && (
                      <button
                        style={{
                          padding: "10px 18px",
                          borderRadius: `${form.cornerRadius}px`,
                          border: "1px solid var(--p-color-border)",
                          background: "transparent",
                          color: "var(--p-color-text)",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "default",
                          width: "100%",
                        }}
                      >
                        Add to cart
                      </button>
                    )}
                  </BlockStack>
                </Box>
              </BlockStack>
            </Card>
          </BlockStack>
        </Box>
      </InlineStack>
    </>
  );
}