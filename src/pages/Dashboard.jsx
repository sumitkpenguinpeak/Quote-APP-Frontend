import React from 'react';
import { Page, Card, SkeletonBodyText, Banner, BlockStack, InlineGrid, Text, Badge } from '@shopify/polaris';
import AppLayout from '../components/AppLayout';
import useShop from '../hooks/useShop';

/**
 * Dashboard
 *
 * Landing page after a successful install + active subscription. Displays
 * store name, current plan, billing status, installation date, and the
 * merchant's Shopify plan, as required by the project spec.
 */
export default function Dashboard() {
  const { data, loading, error } = useShop('/dashboard');

  return (
    <AppLayout>
      <Page title="Dashboard">
        <BlockStack gap="400">
          {error && <Banner tone="critical">{error}</Banner>}

          <Card>
            {loading ? (
              <SkeletonBodyText lines={5} />
            ) : (
              <InlineGrid columns={{ xs: 1, sm: 2 }} gap="400">
                <SummaryItem label="Store Name" value={data?.store_name} />
                <SummaryItem label="Current Plan" value={data?.current_plan} />
                <SummaryItem
                  label="Billing Status"
                  value={<BillingBadge status={data?.billing_status} />}
                />
                <SummaryItem label="Installation Date" value={data?.installation_date || 'N/A'} />
                <SummaryItem label="Shopify Plan" value={data?.shopify_plan || 'N/A'} />
              </InlineGrid>
            )}
          </Card>
        </BlockStack>
      </Page>
    </AppLayout>
  );
}

function SummaryItem({ label, value }) {
  return (
    <BlockStack gap="100">
      <Text as="span" variant="bodySm" tone="subdued">
        {label}
      </Text>
      <Text as="span" variant="headingMd">
        {value}
      </Text>
    </BlockStack>
  );
}

function BillingBadge({ status }) {
  const tones = {
    active: 'success',
    pending: 'attention',
    declined: 'critical',
    cancelled: 'critical',
    expired: 'warning',
  };

  return <Badge tone={tones[status] || 'info'}>{status || 'unknown'}</Badge>;
}
