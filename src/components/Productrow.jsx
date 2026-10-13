import { InlineStack, BlockStack, Box, Text, TextField, Button } from "@shopify/polaris";
import { DeleteIcon, MinusIcon, PlusIcon } from "@shopify/polaris-icons";
import { formatMoney } from "../utils/date";

// Keep this identical to the template used for the table header in QuoteDetail.jsx
// so every column lines up regardless of screen width.
// Keep this identical to PRODUCT_ROW_GRID in QuoteDetail.jsx so every column
// lines up with the table header, regardless of screen width.
const PRODUCT_ROW_GRID = "56px minmax(160px, 1fr) 110px 130px 130px 90px 36px";

export default function ProductRow({
  product,
  isEditable = true,
  onQuantityChange,
  onPriceChange,
  onRemove,
}) {
  const quantity = Number(product.quantity) || 0;
  const quotedPrice = Number(product.merchant_offered_price) || 0;
  const originalPrice = Number(product.original_price) || 0;
  const customerRequestedPrice = Number(product.customer_requested_price) || 0;

  const lineTotal = quantity * quotedPrice;
  const actualLineTotal = quantity * originalPrice;
  const requestedLineTotal = quantity * customerRequestedPrice;

  return (
    <BlockStack gap="0">
      {/* Main row — fixed grid, never wraps. Card wraps this in an overflow-x:auto
          container so very narrow screens scroll instead of breaking the layout. */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: PRODUCT_ROW_GRID,
          columnGap: 16,
          alignItems: "center",
          minWidth: "fit-content",
        }}
      >
        {/* Product image */}
        <Box
          width="56px"
          minHeight="56px"
          borderRadius="150"
          overflowX="hidden"
          overflowY="hidden"
          background="bg-surface-secondary"
        >
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              style={{ width: 56, height: 56, objectFit: "cover", display: "block" }}
            />
          ) : null}
        </Box>

        {/* Name + SKU */}
        <BlockStack gap="0">
          <Text as="span" variant="bodyMd" fontWeight="semibold">
            {product.name}
          </Text>
          <Text as="span" variant="bodySm" tone="subdued">
            SKU: {product.sku || "-"}
          </Text>
        </BlockStack>

        {/* Original price — read only */}
        <Box
          padding="200"
          background="bg-surface-secondary"
          borderRadius="150"
          borderWidth="025"
          borderColor="border"
        >
          <Text as="span" variant="bodyMd" tone="subdued">
            $ {originalPrice.toFixed(2)}
          </Text>
        </Box>

        {/* Quoted price — editable */}
        <TextField
          label="Quoted price"
          labelHidden
          type="number"
          prefix="$"
          value={String(quotedPrice)}
          onChange={(value) => onPriceChange?.(product.id, value)}
          disabled={!isEditable}
          autoComplete="off"
        />

        {/* Quantity stepper */}
        <InlineStack gap="0" blockAlign="center" wrap={false}>
          <Button
            icon={MinusIcon}
            accessibilityLabel="Decrease quantity"
            onClick={() => onQuantityChange?.(product.id, Math.max(quantity - 1, 0))}
            disabled={!isEditable || quantity <= 0}
          />
          <Box width="40px">
            <Text as="span" variant="bodyMd" alignment="center">
              {quantity}
            </Text>
          </Box>
          <Button
            icon={PlusIcon}
            accessibilityLabel="Increase quantity"
            onClick={() => onQuantityChange?.(product.id, quantity + 1)}
            disabled={!isEditable}
          />
        </InlineStack>

        {/* Line total */}
        <Text as="span" variant="bodyMd" fontWeight="semibold">
          {formatMoney(lineTotal * 100, "${{amount}}")}
        </Text>

        {/* Remove row */}
        <Button
          icon={DeleteIcon}
          variant="tertiary"
          tone="critical"
          accessibilityLabel={`Remove ${product.name}`}
          onClick={() => onRemove?.(product.id)}
          disabled={!isEditable}
        />
      </div>

      {/* Breakdown detail panel */}
      <Box padding="300" background="bg-surface-secondary" borderRadius="150" marginBlockStart="200">
        <InlineStack gap="600" wrap={false}>
          <BlockStack gap="050">
            <Text as="span" variant="bodySm" tone="subdued">
              Actual product price
            </Text>
            <Text as="span" variant="bodyMd" fontWeight="semibold">
              {quantity} × {formatMoney(originalPrice * 100, "${{amount}}")}
            </Text>
            <Text as="span" variant="bodySm" tone="subdued">
              {formatMoney(actualLineTotal * 100, "${{amount}}")}
            </Text>
          </BlockStack>

          <BlockStack gap="050">
            <Text as="span" variant="bodySm" tone="subdued">
              Customer requested price
            </Text>
            <Text as="span" variant="bodyMd" fontWeight="semibold">
              {quantity} × {formatMoney(customerRequestedPrice * 100, "${{amount}}")}
            </Text>
            <Text as="span" variant="bodySm" tone="subdued">
              {formatMoney(requestedLineTotal * 100, "${{amount}}")}
            </Text>
          </BlockStack>

          <BlockStack gap="050">
            <Text as="span" variant="bodySm" tone="subdued">
              Quoted total
            </Text>
            <Text as="span" variant="bodyMd" fontWeight="semibold">
              {quantity} × {formatMoney(quotedPrice * 100, "${{amount}}")}
            </Text>
            <Text as="span" variant="bodyMd" fontWeight="semibold">
              {formatMoney(lineTotal * 100, "${{amount}}")}
            </Text>
          </BlockStack>
        </InlineStack>
      </Box>
    </BlockStack>
  );
}