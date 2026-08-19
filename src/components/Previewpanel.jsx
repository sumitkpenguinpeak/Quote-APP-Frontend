import { useState } from 'react';
import { Card, Text, BlockStack, InlineStack, Button, Box } from '@shopify/polaris';
import { MinusIcon, PlusIcon } from '@shopify/polaris-icons';
import { hexToRgba } from '../utils/date';


export default function PreviewPanel({ productImage, productTitle, productPrice, productDescription, quoteButtonLabel, buttonStyle, showQuoteButton }) {
  const [quantity, setQuantity] = useState(1);
  const [isHovering, setIsHovering] = useState(false);
  const step = (delta) => setQuantity((prev) => Math.max(1, prev + delta));
  const useHoverStyle = showQuoteButton && buttonStyle.hover && isHovering;

  const quoteButtonStyle = {
    width: '100%',
    padding: '10px 16px',
    fontSize: `${useHoverStyle ? buttonStyle.hoverFontSize : buttonStyle.fontSize}px`,
    fontWeight: buttonStyle.textFormat.includes('bold') ? 700 : 400,
    fontStyle: buttonStyle.textFormat.includes('italic') ? 'italic' : 'normal',
    textDecoration: buttonStyle.textFormat.includes('underline') ? 'underline' : 'none',
    textAlign: buttonStyle.alignment,
    borderRadius: `${useHoverStyle ? buttonStyle.hoverCornerRadius : buttonStyle.cornerRadius}px`,
    borderWidth: `${useHoverStyle ? buttonStyle.hoverBorderThickness : buttonStyle.borderThickness}px`,
    borderStyle: 'solid',
    borderColor: hexToRgba(
      useHoverStyle ? buttonStyle.hoverOutlineColor : buttonStyle.outlineColor,
      useHoverStyle ? buttonStyle.hoverOutlineColorOpacity : buttonStyle.outlineColorOpacity
    ),
    backgroundColor: hexToRgba(
      useHoverStyle ? buttonStyle.hoverButtonColor : buttonStyle.buttonColor,
      useHoverStyle ? buttonStyle.hoverButtonColorOpacity : buttonStyle.buttonColorOpacity
    ),
    color: hexToRgba(
      useHoverStyle ? buttonStyle.hoverTextColor : buttonStyle.textColor,
      useHoverStyle ? buttonStyle.hoverTextColorOpacity : buttonStyle.textColorOpacity
    ),
    boxShadow: buttonStyle.dropShadow ? '0 2px 6px rgba(0,0,0,0.2)' : 'none',
    cursor: 'pointer',
    transition: 'all 120ms ease',
  };

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h2" variant="headingMd">Preview</Text>
        <Box borderRadius="200" overflowX="hidden">
          <img
            src={productImage} alt={productTitle}
            style={{ width: '100%', height: 260, objectFit: 'contain', display: 'block' }}
          />
        </Box>

        <BlockStack gap="100">
          <Text as="h2" variant="headingSm">{productTitle}</Text>
          <Text as="p" variant="bodyLg" fontWeight="semibold">{productPrice}</Text>
        </BlockStack>

        <BlockStack gap="150">
          <Text as="span" variant="bodySm" tone="subdued">Quantity</Text>
          <InlineStack gap="0" blockAlign="center">
            <Button icon={MinusIcon} onClick={() => step(-1)} accessibilityLabel="Decrease quantity" variant="tertiary" />
            <div style={{ width: 36, textAlign: 'center' }}><Text as="span" variant="bodyMd" fontWeight="medium">{quantity}</Text></div>
            <Button icon={PlusIcon} onClick={() => step(1)} accessibilityLabel="Increase quantity" variant="tertiary" />
          </InlineStack>
        </BlockStack>

        <BlockStack gap="200">
          <Button fullWidth variant="secondary">Add to cart</Button>
          {showQuoteButton && (
            <button type="button" style={quoteButtonStyle} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)} >{quoteButtonLabel || 'Add to Quote'}</button>
          )}

          <Button fullWidth variant="secondary" tone="critical">Buy it now</Button>
        </BlockStack>
        <Text as="p" variant="bodySm" tone="subdued">{productDescription}</Text>
      </BlockStack>
    </Card>
  );
}