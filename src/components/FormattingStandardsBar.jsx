import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
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
  Checkbox,
  RangeSlider,
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
} from "@shopify/polaris-icons";
import api from '../services/api';

function AppBridgeSaveBar({ visible, onSave, onDiscard, saving = false }) {
  const barRef = useRef(null);
  const saveBtnRef = useRef(null);
  const discardBtnRef = useRef(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    if (visible) {
      bar.show?.();
    } else {
      bar.hide?.();
    }
  }, [visible]);

  useEffect(() => {
    const saveBtn = saveBtnRef.current;
    const discardBtn = discardBtnRef.current;
    if (!saveBtn || !discardBtn) return;

    const handleSave = () => onSave?.();
    const handleDiscard = () => onDiscard?.();

    saveBtn.addEventListener("click", handleSave);
    discardBtn.addEventListener("click", handleDiscard);

    return () => {
      saveBtn.removeEventListener("click", handleSave);
      discardBtn.removeEventListener("click", handleDiscard);
    };
  }, [onSave, onDiscard]);

  useEffect(() => {
    const saveBtn = saveBtnRef.current;
    if (!saveBtn) return;
    if (saving) {
      saveBtn.setAttribute("loading", "");
    } else {
      saveBtn.removeAttribute("loading");
    }
  }, [saving]);

  return (
    <ui-save-bar id="app-save-bar" ref={barRef}>
      <button variant="primary" ref={saveBtnRef}></button>
      <button ref={discardBtnRef}></button>
    </ui-save-bar>
  );
}

/* ---------------- Formatting Standards ---------------- */

const FORMATTING_DEFAULTS = {
  prefix: "Q-",
  suffix: "-SUF",
  quoteFormat: "IW{{create_date}}-{{quote_id}}",
  invoiceFormat: "IW{{order_date}}-{{quote_id}}",
};


// Map API response shape -> form shape. Adjust here if API keys differ.
function mapApiToForm(data) {
  return {
    prefix: data?.extra_settings?.prefix ?? FORMATTING_DEFAULTS.prefix,
    suffix: data?.extra_settings?.suffix ?? FORMATTING_DEFAULTS.suffix,
    quoteFormat: data?.extra_settings?.quoteFormat ?? FORMATTING_DEFAULTS.quoteFormat,
    invoiceFormat: data?.extra_settings?.invoiceFormat ?? FORMATTING_DEFAULTS.invoiceFormat,
  };
}

// Map form shape -> API request body. Adjust here if API expects different keys.
function mapFormToApi(form) {
  return {
    prefix: form.prefix,
    suffix: form.suffix,
    quoteFormat: form.quoteFormat,
    invoiceFormat: form.invoiceFormat,
  };
}

async function fetchSettings() {
  // Goes through the shared axios instance -> App Bridge session token is attached.
  const res = await api.get('/settings');
  return res.data;
}

export default function FormattingStandardsBar() {
  // `savedForm` = last-persisted state (what the server has).
  // `form` = the live draft the merchant is editing.
  const [savedForm, setSavedForm] = useState(FORMATTING_DEFAULTS);
  const [form, setForm] = useState(FORMATTING_DEFAULTS);
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
          const mapped = mapApiToForm(data?.data);

          console.log("MAPPED:", data?.data?.extra_settings);
          console.log("PREFIX:", mapped.prefix);


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
    // aa j fields chhe je table ma direct columns tarike chhe (fixed, thoda j hoy)
    const knownFields = [
      "allow_quantity_edit",
      "quote_expiry_days",
      "auto_create_draft_order_on_approve",
      "notification_email",
      "notify_merchant_on_new_quote",
      "notify_customer_on_status_change",
    ];

    const payload = {};
    const extra_settings = {};

    Object.entries(form).forEach(([key, value]) => {
      if (knownFields.includes(key)) {
        payload[key] = value;
      } else {
        extra_settings[key] = value;
      }
    });

    const finalPayload = { ...payload, extra_settings };

    await api.put('/settings', finalPayload);
    await new Promise((r) => setTimeout(r, 500));
    setSavedForm(form);
  } finally {
    setSaving(false);
  }
}

  function handleDiscard() {  
    setForm(savedForm); // revert every field back to last-saved values
  }

  const formatCurrentDate = () => {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const getPreview = (format) => {
    const currentDate = formatCurrentDate();
    return format
      .replaceAll("{{create_date}}", currentDate)
      .replaceAll("{{order_date}}", currentDate)
      .replaceAll("{{quote_id}}", 1000);
  };

  return (
    <>
      {/* Renders Shopify's native top Save Bar - only visible when isDirty */}
      <AppBridgeSaveBar
        visible={isDirty}
        saving={saving}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />

      <BlockStack gap="400">
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingSm">
              Quote ID formats
            </Text>
            <TextField
              label="Prefix"
              value={form.prefix}
              onChange={(v) => update({ prefix: v })}
              autoComplete="off"
            />
            <TextField
              label="Suffix"
              value={form.suffix}
              onChange={(v) => update({ suffix: v })}
              autoComplete="off"
            />
            <TextField
              label="Quote ID preview"
              value={`${form.prefix}1000${form.suffix}`}
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
                value={form.quoteFormat}
                onChange={(v) => update({ quoteFormat: v })}
                autoComplete="off"
              />
              <TextField
                label="Preview"
                value={getPreview(form.quoteFormat)}
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
                value={form.invoiceFormat}
                onChange={(v) => update({ invoiceFormat: v })}
                autoComplete="off"
              />
              <TextField
                label="Preview"
                value={getPreview(form.invoiceFormat)}
                disabled
                autoComplete="off"
              />
            </BlockStack>
          </BlockStack>
        </Card>
 
        {/* In-page Save/Discard still works too, in case the merchant
            doesn't notice the top bar. Both paths call the same handlers. */}
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
    </>
  );
}