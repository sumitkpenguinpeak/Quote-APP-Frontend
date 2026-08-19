import React, { useState } from 'react';
import { Page, Card, Button, Banner, BlockStack, Text, Badge, SkeletonBodyText } from '@shopify/polaris';
import AppLayout from '../components/AppLayout';
import useShop from '../hooks/useShop';
import api from '../services/api';

/**
 * Billing
 *
 * Shows the merchant the Review Pro Basic plan details and their current
 * subscription status. Starting a subscription redirects the top-level
 * window to Shopify's confirmation page, per Shopify's billing UX
 * requirements (charge approval cannot happen inside an iframe).
 */
export default function Billing() {
  const { data, loading, error, refetch, shop } = useShop('/billing/status');
  const [starting, setStarting] = useState(false);
  const [actionError, setActionError] = useState('');

  const handleSubscribe = async () => {
    setStarting(true);
    setActionError('');

    try {
      const response = await api.get('/billing');
      const confirmationUrl = response.data.confirmation_url;

      if (confirmationUrl) {
        // Shopify requires billing confirmation to happen in the top-level
        // window, not inside the embedded app's iframe.
        if (window.top) {
          window.top.location.href = confirmationUrl;
        } else {
          window.location.href = confirmationUrl;
        }
      } else {
        setActionError('Shopify did not return a confirmation URL.');
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Unable to start billing.');
    } finally {
      setStarting(false);
    }
  };

  const handleCancel = async () => {
    setStarting(true);
    setActionError('');

    try {
      await api.post('/billing/cancel');
      await refetch();
    } catch (err) {
      setActionError(err.response?.data?.message || 'Unable to cancel subscription.');
    } finally {
      setStarting(false);
    }
  };

  return (
    <AppLayout>
      <Page title="Billing">
        <BlockStack gap="400">
          {error && <Banner tone="critical">{error}</Banner>}
          {actionError && <Banner tone="critical">{actionError}</Banner>}
          {!shop && <Banner tone="warning">No shop detected in the URL.</Banner>}

          <Card>
            {loading ? (
              <SkeletonBodyText lines={4} />
            ) : (
              <BlockStack gap="400">
                <BlockStack gap="100">
                  <Text as="h2" variant="headingMd">
                    {data?.plan_name || 'Review Pro Basic'}
                  </Text>
                  <Text as="p" tone="subdued">
                    ${data?.price ?? '9.99'} / month
                  </Text>
                </BlockStack>

                <div>
                  <Badge tone={data?.is_subscribed ? 'success' : 'attention'}>
                    {data?.is_subscribed ? 'Active' : data?.billing_status || 'Not subscribed'}
                  </Badge>
                </div>

                {data?.is_subscribed ? (
                  <Button tone="critical" onClick={handleCancel} loading={starting}>
                    Cancel Subscription
                  </Button>
                ) : (
                  <Button variant="primary" onClick={handleSubscribe} loading={starting}>
                    Subscribe Now
                  </Button>
                )}
              </BlockStack>
            )}
          </Card>
        </BlockStack>
      </Page>
    </AppLayout>
  );
}
