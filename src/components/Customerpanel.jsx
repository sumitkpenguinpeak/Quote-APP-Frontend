import { useState } from 'react';
import {Card,Text,TextField,BlockStack,InlineStack,Collapsible,Button,Thumbnail,Divider,Box,} from '@shopify/polaris';
import { ChevronDownIcon, ChevronUpIcon } from '@shopify/polaris-icons';

function CollapsibleSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <BlockStack gap="200">
      <Button variant="plain" textAlign="left" fullWidth onClick={() => setOpen((prev) => !prev)}
        icon={open ? ChevronUpIcon : ChevronDownIcon}>
        <Text variant="bodyMd" fontWeight="semibold">{title}</Text>
      </Button>
      <Collapsible open={open} id={`section-${title}`}>
        <Box paddingBlockStart="200">{children}</Box>
      </Collapsible>
    </BlockStack>
  );
}

export default function CustomerPanel({ quote, message, onMessageChange, dueDate, onDueDateChange }) {
  const customer = quote?.customer || {};
  const shipping = customer.shipping_address || {};
 const note = quote?.customer_note || '';
  const alsoViewed = quote?.also_viewed || [];
  const fullName = [customer.first_name, customer.last_name].filter(Boolean).join(' ');

  return (
    <BlockStack gap="400">
      <Card>
        <BlockStack gap="400">
          <Box><Text as="h2" variant="headingMd">Customer</Text></Box>
          <Box paddingBlock="300" paddingInline="300" background="bg-surface-secondary" borderRadius="150" >
            <TextField
              label="Email address"
              labelHidden
              value={customer.email || ''}
              placeholder="Email address"
              disabled
              autoComplete="off"
            />
          </Box>

          <Divider />

          <CollapsibleSection title="Customer Information">
            <BlockStack gap="200">
              <Box paddingBlock="200" paddingInline="200" background="bg-surface-tertiary" borderRadius="100">
                <BlockStack gap="100">
                  <Text as="p" variant="bodyMd" fontWeight="semibold">{fullName || '-'}</Text>
                  <Text as="p" variant="bodySm" tone="subdued">{customer.email || '-'}</Text>
                  <Text as="p" variant="bodySm" tone="subdued">{customer.phone || '-'}</Text>
                </BlockStack>
              </Box>

              {shipping.address1 && (
                <Box paddingBlock="200" paddingInline="200" background="bg-surface-tertiary" borderRadius="100">
                  <BlockStack gap="100">
                    <Text as="p" variant="bodySm" fontWeight="semibold">Shipping address</Text>
                    <Text as="p" variant="bodySm">
                      {[shipping.company, shipping.address1, shipping.city, shipping.province, shipping.zip, shipping.country]
                        .filter(Boolean)
                        .join(', ')}
                    </Text>
                  </BlockStack>
                </Box>
              )}
            </BlockStack>
          </CollapsibleSection>

          <Divider />

          <CollapsibleSection title="Customer note">
            <BlockStack gap="200">
               <Text as="p" variant="bodyMd"><Text as="span" fontWeight="semibold">Site:</Text>{note.site || '-'}</Text>
              {note && (
                <Box paddingBlock="200" paddingInline="200" background="bg-surface-tertiary" borderRadius="100" borderColor="border" borderWidth="1">
                  <Text as="p" variant="bodySm">{note}</Text>
                </Box>
              )}
              {!note && ( <Text as="p" variant="bodySm" tone="subdued">No customer notes</Text>)}
            </BlockStack>
          </CollapsibleSection>

          <Box paddingBlockStart="200">
            <TextField
              label="Message"
              multiline={4}
              value={message}
              onChange={onMessageChange}
              placeholder="The quote's special note"
              autoComplete="off"
            />
          </Box>

          <TextField
            label="Due date"
            type="date"
            value={dueDate} 
            onChange={onDueDateChange}
            autoComplete="off"
          />
        </BlockStack>
      </Card>

      {alsoViewed.length > 0 && (
        <Card>
          <BlockStack gap="400">
            <Box><Text as="h2" variant="headingMd">This customer also viewed</Text></Box>

            <BlockStack gap="300">
              {alsoViewed.map((item) => (
                <Box 
                  key={item.id}
                  paddingBlock="200" paddingInline="200" background="bg-surface-secondary" borderRadius="150">
                  <InlineStack gap="300" wrap={false} blockAlign="start">
                    <Thumbnail source={item.image || ''} alt={item.name} size="small" />
                    <BlockStack gap="050">
                      <Text as="span" variant="bodyMd" fontWeight="medium">{item.name}</Text>
                      <Text as="span" variant="bodySm" tone="subdued">Viewed at {item.viewed_at || '-'}</Text>
                      <Text as="span" variant="bodySm" tone="subdued">Visit times: {item.visit_count ?? 0}</Text>
                    </BlockStack>
                  </InlineStack>
                </Box>
              ))}
            </BlockStack>
          </BlockStack>
        </Card>
      )}
    </BlockStack>
  );
}