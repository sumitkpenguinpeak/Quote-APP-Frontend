import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  BlockStack,
  Card,
  Text,
  TextField,
  Banner,
  SkeletonBodyText,
} from "@shopify/polaris";
import api from "../services/api";

const DEFAULT_CSS = ".quote-widget {\n  border-radius: 8px;\n}";

function getShop() {
  return new URLSearchParams(window.location.search).get("shop") || "";
}

function extractCss(data) {
  if (!data) return null;
  const root = data.settings ?? data;

  let extra = root.extra_settings;
  if (typeof extra === "string") {
    try {
      extra = JSON.parse(extra);
    } catch {
      extra = null;
    }
  }

  return extra?.custom_css ?? root.custom_css ?? null;
}

function AppBridgeSaveBar({ visible, onSave, onDiscard, saving = false }) {
  const barRef = useRef(null);
  const saveBtnRef = useRef(null);
  const discardBtnRef = useRef(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    if (visible) {
      bar.show?.() ?? window.shopify?.saveBar?.show("app-save-bar");
    } else {
      bar.hide?.() ?? window.shopify?.saveBar?.hide("app-save-bar");
    }
  }, [visible]);

  useEffect(() => {
    const saveBtn = saveBtnRef.current;
    const discardBtn = discardBtnRef.current;
    if (!saveBtn || !discardBtn) return;

    const handleSaveClick = () => onSave?.();
    const handleDiscardClick = () => onDiscard?.();

    saveBtn.addEventListener("click", handleSaveClick);
    discardBtn.addEventListener("click", handleDiscardClick);

    return () => {
      saveBtn.removeEventListener("click", handleSaveClick);
      discardBtn.removeEventListener("click", handleDiscardClick);
    };
  }, [onSave, onDiscard]);

  useEffect(() => {
    const saveBtn = saveBtnRef.current;
    if (!saveBtn) return;
    if (saving) saveBtn.setAttribute("loading", "");
    else saveBtn.removeAttribute("loading");
  }, [saving]);

  return (
    <ui-save-bar id="app-save-bar" ref={barRef}>
      <button variant="primary" ref={saveBtnRef}></button>
      <button ref={discardBtnRef}></button>
    </ui-save-bar>
  );
}

export default function CustomCSS() {
  const [form, setForm] = useState({ custom_css: DEFAULT_CSS });
  const [savedForm, setSavedForm] = useState({ custom_css: DEFAULT_CSS });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(savedForm),
    [form, savedForm]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSettings() {
      try {
        const shop = getShop();
        const res = await api.get(`/settings?shop=${encodeURIComponent(shop)}`);
        const css = extractCss(res?.data?.data) ?? DEFAULT_CSS;

        if (!cancelled) {
          setForm({ custom_css: css });
          setSavedForm({ custom_css: css });
        }
      } catch (e) {
        if (!cancelled) setError("Could not load settings. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleChange = useCallback(
    (value) => setForm((prev) => ({ ...prev, custom_css: value })),
    []
  );
  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const shop = getShop();
      const payload = { extra_settings: { custom_css: form.custom_css } };

      const res = await api.put(
        `/settings?shop=${encodeURIComponent(shop)}`,
        payload
      );

      const savedCss = extractCss(res?.data?.data) ?? form.custom_css;
      const next = { custom_css: savedCss };
      setForm(next);
      setSavedForm(next);
    } catch (e) {
      setError("Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [form]);

  const handleDiscard = useCallback(() => {
    setForm(savedForm);
  }, [savedForm]);

  return (
    <>
      <AppBridgeSaveBar
        visible={isDirty}
        saving={saving}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />

      <BlockStack gap="400">
        {error && (
          <Banner tone="critical" onDismiss={() => setError(null)}>
            {error}
          </Banner>
        )}

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingSm">
              Custom CSS
            </Text>

            {loading ? (
              <SkeletonBodyText lines={6} />
            ) : (
              <TextField
                label="CSS"
                value={form.custom_css}
                onChange={handleChange}
                multiline={8}
                autoComplete="off"
              />
            )}
          </BlockStack>
        </Card>
      </BlockStack>
    </>
  );
}