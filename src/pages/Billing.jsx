import React, { useState } from 'react';
import {
  Page, Card, Box, Button, Banner, BlockStack, InlineStack, InlineGrid, Text, Badge, Icon, Divider, SkeletonBodyText,
} from '@shopify/polaris';
import { CheckIcon } from '@shopify/polaris-icons';
import AppLayout from '../components/AppLayout';
import useShop from '../hooks/useShop';
import api from '../services/api';

/**
 * Pricing plans (single source of truth for the Billing page).
 * `key` is sent to the backend as `?plan=<key>` when subscribing.
 */
export const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: 0,
    features: [
      '10 Quotes/Month',
      'Basic Email Notification',
      'Export PDF: Quote and Invoice',
      'Gmail Account Integration',
      '24/7 Support',
    ],
  },
  {
    key: 'starter',
    name: 'Starter',
    price: 9.99,
    features: [
      '50 Quotes/Month',
      'Convert Quote to Draft Order',
      'Sync data',
      'Export PDF: Quote and Invoice',
      'Gmail Account Integration',
      '24/7 Support',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 19.99,
    popular: true,
    features: [
      'Unlimited Quotes/Month',
      'Settings: Tax, Discount, Shipping',
      'Modify PDF and Mail Templates',
      'Convert Quote to Draft Order',
      'Sync data',
      'Export PDF: Quote and Invoice',
      'Gmail Account Integration',
      '24/7 Support',
    ],
  },
];

/** Free trial (days) on every paid plan - keep in sync with SHOPIFY_BILLING_TRIAL_DAYS on the backend. */
const TRIAL_DAYS = 7;

const formatPrice = (p) => (p === 0 ? '$0' : `$${p.toFixed(2)}`);

/** Works out which plan key is active from whatever the backend returns. */
function resolveCurrentKey(data) {
  // Install pachhi haju plan select nathi karyo -> kyo plan "current" nathi
  if (data?.plan_selected === false) return null;
  const raw = String(data?.plan_key || data?.plan || data?.current_plan || data?.plan_name || '').toLowerCase();
  const match = PLANS.find((p) => raw === p.key || raw.includes(p.key));
  if (match) return match.key;
  return data?.is_subscribed ? null : 'free';
}

/**
 * Billing
 *
 * Shows the Free / Starter / Pro plans and the merchant's current plan.
 * Badha plans (Free pan) top-level window ne Shopify ni charge confirmation page par
 * redirect kare chhe (approval embedded iframe ma nathi thatu). Approve pachhi
 * merchant Dashboard par pahonche chhe.
 *
 * `onboarding` (route /pricing): install pachhi pehli screen - plan select karya vagar
 * Dashboard khulatu nathi.
 */
export default function Billing({ onboarding = false }) {
  const { data, loading, error, shop } = useShop('/billing/status');
  const [busyPlan, setBusyPlan] = useState('');
  const [actionError, setActionError] = useState('');

  const currentKey = resolveCurrentKey(data);

  const handleSubscribe = async (plan) => {
    setBusyPlan(plan.key);
    setActionError('');

    try {
      const response = await api.get('/billing', { params: { plan: plan.key } });
      const confirmationUrl = response.data.confirmation_url;

      if (confirmationUrl) {
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
      setBusyPlan('');
    }
  };

  const renderAction = (plan) => {
    if (plan.key === currentKey) {
      return <Button disabled fullWidth>Current plan</Button>;
    }
    if (plan.key === 'free') {
      // Free pan Shopify "Approve charges" screen par jay chhe (kyarey charge nathi thatu)
      return (
        <Button fullWidth onClick={() => handleSubscribe(plan)} loading={busyPlan === 'free'}>
          {onboarding ? 'Start with Free' : 'Switch to Free'}
        </Button>
      );
    }
    const currentIdx = PLANS.findIndex((p) => p.key === currentKey);
    const isUpgrade = PLANS.findIndex((p) => p.key === plan.key) > currentIdx;
    return (
      <Button
        fullWidth
        variant={plan.popular ? 'primary' : 'secondary'}
        onClick={() => handleSubscribe(plan)}
        loading={busyPlan === plan.key}
      >
        {isUpgrade ? `Start ${TRIAL_DAYS}-day free trial` : `Switch to ${plan.name}`}
      </Button>
    );
  };

  return (
    <AppLayout>
      <Page
        title={onboarding ? 'Choose your plan' : 'Billing'}
        subtitle={onboarding
          ? 'Select a plan to get started. You can change it anytime from the Billing page.'
          : 'Choose the plan that fits your store.'}
      >
        <BlockStack gap="400">
          {error && <Banner tone="critical">{error}</Banner>}
          {actionError && <Banner tone="critical">{actionError}</Banner>}
          {!shop && <Banner tone="warning">No shop detected in the URL.</Banner>}

          {loading ? (
            <Card><SkeletonBodyText lines={6} /></Card>
          ) : (
            <InlineGrid columns={{ xs: 1, md: 3 }} gap="400">
              {PLANS.map((plan) => (
                <Box
                  key={plan.key}
                  background="bg-surface"
                  borderRadius="300"
                  padding="400"
                  shadow="300"
                  minHeight="100%"
                >
                  {/* Equal-height cards: the action button is pinned to the bottom */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--p-space-400)', height: '100%' }}>
                    <BlockStack gap="100">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="h2" variant="headingLg">{plan.name}</Text>
                        {plan.key === currentKey ? (
                          <Badge tone="success">Active</Badge>
                        ) : plan.popular ? (
                          <Badge tone="info">Most popular</Badge>
                        ) : null}
                      </InlineStack>
                      <InlineStack gap="100" blockAlign="end">
                        <Text as="span" variant="heading2xl">{formatPrice(plan.price)}</Text>
                        {plan.price > 0 && <Text as="span" tone="subdued">/ month</Text>}
                      </InlineStack>
                      {plan.price > 0 ? (
                        <Text as="p" tone="success" fontWeight="semibold">
                          {TRIAL_DAYS}-day free trial, cancel anytime
                        </Text>
                      ) : (
                        <Text as="p" tone="subdued">Free forever, no charges</Text>
                      )}
                    </BlockStack>

                    <Divider />

                    <BlockStack gap="200">
                      {plan.features.map((f) => (
                        <InlineStack key={f} gap="200" blockAlign="start" wrap={false}>
                          <div style={{ flexShrink: 0 }}><Icon source={CheckIcon} tone="success" /></div>
                          <Text as="span">{f}</Text>
                        </InlineStack>
                      ))}
                    </BlockStack>

                    <div style={{ marginTop: 'auto' }}>{renderAction(plan)}</div>
                  </div>
                </Box>
              ))}
            </InlineGrid>
          )}
        </BlockStack>
      </Page>
    </AppLayout>
  );
}