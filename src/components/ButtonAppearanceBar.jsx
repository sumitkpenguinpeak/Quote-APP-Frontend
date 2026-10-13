import React, { useState, useCallback, useMemo, useEffect } from "react";
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
import { SaveIcon } from "@shopify/polaris-icons";
import api from "../services/api";
import AppBridgeSaveBar from "./AppBridgeSaveBar"; // path adjust karo

/* ---------------- Defaults ---------------- */

const BUTTON_DEFAULTS = {
  buttonText: "Request a Quote",
  buttonColor: "000000",
  textColor: "FFFFFF",
  cornerRadius: 8,
  showOnProduct: true,
  showOnCollection: true,
  showOnCart: false,
  hidePriceGlobally: false,
  hideAddToCart: false,
};

function getShop() {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const shopFromUrl = params.get("shop");
    if (shopFromUrl) return shopFromUrl;
  }
  return "my-app-test-cameazlo.myshopify.com";
}

function mapApiToForm(data) {
  const extra = data?.extra_settings ?? {};
  return {
    buttonText: extra.buttonText ?? BUTTON_DEFAULTS.buttonText,
    buttonColor: extra.buttonColor ?? BUTTON_DEFAULTS.buttonColor,
    textColor: extra.textColor ?? BUTTON_DEFAULTS.textColor,
    cornerRadius: extra.cornerRadius ?? BUTTON_DEFAULTS.cornerRadius,
    showOnProduct: extra.showOnProduct ?? BUTTON_DEFAULTS.showOnProduct,
    showOnCollection: extra.showOnCollection ?? BUTTON_DEFAULTS.showOnCollection,
    showOnCart: extra.showOnCart ?? BUTTON_DEFAULTS.showOnCart,
    hidePriceGlobally: extra.hidePriceGlobally ?? BUTTON_DEFAULTS.hidePriceGlobally,
    hideAddToCart: extra.hideAddToCart ?? BUTTON_DEFAULTS.hideAddToCart,
  };
}

async function fetchSettings() {
  const shop = getShop();
  const res = await api.get(`/settings?shop=${encodeURIComponent(shop)}`);
  return res.data?.data;
}

export default function ButtonAppearanceBar() {
  const [savedForm, setSavedForm] = useState(BUTTON_DEFAULTS);
  const [form, setForm] = useState(BUTTON_DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedForm),
    [form, savedForm]
  );

  const update = useCallback((patch) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchSettings();
        if (cancelled) return;
        const mapped = mapApiToForm(data);
        setSavedForm(mapped);
        setForm(mapped);
      } catch (err) {
        if (cancelled) return;
        setError(err.message || "Failed to load settings.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave() {
    setSaving(true);
    try {
      const shop = getShop();
      const payload = { extra_settings: { ...form } };

      await api.put(`/settings?shop=${encodeURIComponent(shop)}`, payload);
      await new Promise((r) => setTimeout(r, 500));
      setSavedForm(form);
    } catch (err) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    setForm(savedForm);
  }

  return (
    <>
      {/* Shopify na native top Save Bar - fakt isDirty hoy tyare j visible */}
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

            <InlineStack align="end" gap="200">
              <Button onClick={handleDiscard} disabled={!isDirty}>
                Discard
              </Button>

              <Button
                variant="primary"
                icon={SaveIcon}
                onClick={handleSave}
                loading={saving}
                disabled={!isDirty}
              >
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
                        background: `#${form.buttonColor}`,
                        color: `#${form.textColor}`,
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