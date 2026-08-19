import {Thumbnail,Text,TextField,BlockStack,InlineStack,Button,Box,Divider,} from '@shopify/polaris';
import { formatMoney } from '../utils/date';

export default function ProductRow({product, onQuantityChange, onPriceChange, onDelete}) {
  const {id,image,name,sku,original_price: originalPrice,customer_requested_price: customerPrice,quantity} = product;

  const qty = Number(quantity) || 0;
  const actualPrice = Number(originalPrice) || 0;
  const quotedPrice = Number(customerPrice) || 0;

  // Calculations
  const actualTotal = qty * actualPrice;
  const customerTotal = qty * quotedPrice;
  const hasDiscount = actualPrice > quotedPrice;

  return (
    <Box padding="400" borderRadius="200" background="bg-surface-secondary" borderColor="border-subdued" borderWidth="1" style={{ marginBottom: '12px',}}>
       <Divider />
     
      <BlockStack gap="300">
        {/* Product Header */}
        <InlineStack gap="400" wrap={false} align="start">
          <Box style={{ flexShrink: 0 }}><Thumbnail source={image || ''} alt={name} size="medium" /></Box>

          <div style={{ flex: 1, minWidth: 0,}}>
            <BlockStack gap="100">
              <Text as="span" variant="bodyMd" fontWeight="semibold">{name}</Text>
              <Text as="span" variant="bodySm" tone="subdued"><strong>SKU:</strong> {sku || '-'}</Text>
            </BlockStack>
          </div>

          {/* Quantity */}
          <div style={{ width: 100, minWidth: 100}}>
            <TextField
              label="Quantity"
              labelHidden
              type="number"
              min={1}
              value={String(quantity ?? 1)}
              onChange={(value) =>onQuantityChange(id, value)}
              autoComplete="off"
            />
          </div>
        </InlineStack>

        <Divider />

        {/* Price Section */}
        <InlineStack gap="300" wrap={false} align="start">
          <div style={{ flex: 1 }}>
            <TextField
              label="Original Price"
              value={String(actualPrice.toFixed(2))}
              prefix="$"
              readOnly
              autoComplete="off"
              helpText="Actual product price"
            />
          </div>
          <div style={{ flex: 1 }}>
            <TextField
            label="Quoted Price"
            type="number"
            prefix="$"
            value={String(quotedPrice)}
            onChange={(value) => onPriceChange(id, value)}
            autoComplete="off" helpText="Customer requested price"
          />
          </div>
        </InlineStack>

        {/* Calculation Section */}
        <Box padding="300" background="bg-surface" borderRadius="150">
          <InlineStack align="space-between" gap="400" wrap={false}>
            <BlockStack gap="100">
              <Text as="span" variant="bodySm" tone="subdued">Actual Total</Text>
              <Text as="span" variant="bodyMd" fontWeight="semibold">{qty} × {formatMoney((actualPrice * 100), '${{amount}}')}</Text>
              <Text as="span" variant="bodyMd" >{formatMoney((actualTotal * 100), '${{amount}}')}</Text>
            </BlockStack>

            {/* Customer Total */}
            <BlockStack gap="100">
              <Text as="span" variant="bodySm" tone="subdued">Customer Total</Text>
              <Text as="span" variant="bodyMd" fontWeight="semibold">{qty} ×  {formatMoney((quotedPrice * 100), '${{amount}}')}</Text>
              <Text as="span" variant="bodyMd" > {formatMoney((customerTotal * 100), '${{amount}}')}</Text>
            </BlockStack>

            {/* Quoted Total */}
            <BlockStack gap="100">
              <Text as="span" variant="bodySm" tone="subdued">Quoted Total</Text>
              <Text as="span" variant="bodyMd" fontWeight="semibold" tone={hasDiscount ? 'success' : undefined}>{qty} × {formatMoney((quotedPrice*100),'${{amount}}')}</Text>
              <Text as="span" variant="headingSm" tone={hasDiscount ? 'success' : undefined}>{formatMoney((customerTotal*100),'${{amount}}')}</Text>
            </BlockStack>
          </InlineStack>
        </Box>
      </BlockStack>
    </Box>
  );
}