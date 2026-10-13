import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  Box,
  Text,
  Button,
  Banner,
  Modal,
  BlockStack,
  InlineStack,
  SkeletonBodyText,
} from "@shopify/polaris";
import { getEmailConfig, getEmailConnectUrl, disconnectEmailConfig } from "../services/api";

function toast(message, isError = false) {
  window.shopify?.toast?.show(message, isError ? { isError: true } : undefined);
}

// Small coloured square with the first letter of the connected email (matches the design).
function AccountAvatar({ email }) {
  const letter = (email || "?").trim().charAt(0).toUpperCase();
  return (
    <div
      aria-hidden="true"
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: "#9B7BFF",
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 13,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {letter}
    </div>
  );
}

export default function EmailConfiguration() {
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState(null); // null = not connected
  const [error, setError] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getEmailConfig();
      const data = res?.data?.data ?? res?.data ?? {};
      setEmail(data.connected === false ? null : data.email || null);
    } catch (e) {
      setError(e?.response?.data?.message || "Could not load email configuration. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Google redirects back here with ?email_config=connected|error&reason=...
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("email_config");
    if (!result) return;

    if (result === "connected") {
      toast("Email account connected");
    } else {
      setError(params.get("reason") || "Could not connect the email account. Please try again.");
    }

    params.delete("email_config");
    params.delete("reason");
    const qs = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
  }, []);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const res = await getEmailConnectUrl();
      const url = res?.data?.data?.url ?? res?.data?.url;
      if (!url) throw new Error("Missing connect URL");
      // Embedded Shopify apps must leave the iframe for the OAuth screen.
      window.open(url, "_top");
    } catch (e) {
      setConnecting(false);
      setError(e?.response?.data?.message || "Could not start the email connection. Please try again.");
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true);
    try {
      await disconnectEmailConfig();
      setEmail(null);
      setConfirmOpen(false);
      toast("Email account disconnected");
    } catch (e) {
      toast(e?.response?.data?.message || "Could not disconnect the email account. Please try again.", true);
    } finally {
      setDisconnecting(false);
    }
  }, []);

  return (
    <Card padding="0">
      <Box padding="400">
        <Text as="h2" variant="headingSm">
          Email Configuration
        </Text>
      </Box>

      <Box paddingInline="400" paddingBlockEnd="400">
        <BlockStack gap="300">
          {error && (
            <Banner
              tone="critical"
              onDismiss={() => setError(null)}
              action={{ content: "Retry", onAction: loadConfig }}
            >
              {error}
            </Banner>
          )}

          {loading ? (
            <Box padding="400" borderWidth="025" borderColor="border" borderRadius="300">
              <SkeletonBodyText lines={2} />
            </Box>
          ) : email ? (
            <Box padding="400" borderWidth="025" borderColor="border" borderRadius="300">
              <InlineStack align="space-between" blockAlign="center" wrap={false} gap="400">
                <InlineStack gap="300" blockAlign="center" wrap={false}>
                  <AccountAvatar email={email} />
                  <BlockStack gap="100">
                    <Text as="span" variant="bodyMd" fontWeight="semibold">
                      Account connect
                    </Text>
                    <Text as="span" variant="bodySm" tone="subdued">
                      {email}
                    </Text>
                  </BlockStack>
                </InlineStack>
                <Button onClick={() => setConfirmOpen(true)}>Disconnect</Button>
              </InlineStack>
            </Box>
          ) : (
            <Box padding="400" borderWidth="025" borderColor="border" borderRadius="300">
              <InlineStack align="space-between" blockAlign="center" wrap={false} gap="400">
                <BlockStack gap="100">
                  <Text as="span" variant="bodyMd" fontWeight="semibold">
                    No account connected
                  </Text>
                  <Text as="span" variant="bodySm" tone="subdued">
                    Connect an email account to send quote emails from your own address.
                  </Text>
                </BlockStack>
                <Button variant="primary" onClick={handleConnect} loading={connecting}>
                  Connect
                </Button>
              </InlineStack>
            </Box>
          )}
        </BlockStack>
      </Box>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Disconnect email account?"
        primaryAction={{
          content: "Disconnect",
          destructive: true,
          loading: disconnecting,
          onAction: handleDisconnect,
        }}
        secondaryActions={[{ content: "Cancel", onAction: () => setConfirmOpen(false) }]}
      >
        <Modal.Section>
          <Text as="p">
            Emails will no longer be sent from {email}. You can connect an account again at any time.
          </Text>
        </Modal.Section>
      </Modal>
    </Card>
  );
}
