import { Page, Card, Box, InlineStack, BlockStack, Spinner, Text, Button } from '@shopify/polaris';
import AppLayout from './AppLayout';

// Loading common component 
export function LoadingState({ title, accessibilityLabel = 'Loading' }) {
  return (
    <AppLayout>
      <Page title={title}>
        <Card>
          <Box padding="600">
            <InlineStack align="center" blockAlign="center"><Spinner size="small" accessibilityLabel={accessibilityLabel} /></InlineStack>
          </Box>
        </Card>
      </Page>
    </AppLayout>
  );
}

// Error Common Component 
export function ErrorState({ title, message = 'Something went wrong.', onRetry }) {
  return (
    <AppLayout>
      <Page title={title}>
        <Card>
          <Box padding="400">
            <BlockStack gap="300">
              <Text as="p" tone="critical">{message}</Text>
              {onRetry && (
                <InlineStack><Button onClick={onRetry}>Try again</Button></InlineStack>
              )}
            </BlockStack>
          </Box>
        </Card>
      </Page>
    </AppLayout>
  );
}