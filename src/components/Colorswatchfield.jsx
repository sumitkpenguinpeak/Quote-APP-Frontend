import { useState } from 'react';
import { Text, BlockStack, InlineStack, Popover, RangeSlider, Box } from '@shopify/polaris';

export default function ColorSwatchField({ label, hex, opacity, onHexChange, onOpacityChange }) {
  const [opacityPopoverOpen, setOpacityPopoverOpen] = useState(false);

  return (
    <BlockStack gap="100">
      <Text as="span" variant="bodyMd">{label}</Text>

      <InlineStack gap="200" blockAlign="center" wrap={false}>
        <label style={{ position: 'relative', display: 'inline-block', cursor: 'pointer', flexShrink: 0 }}>
          <div style={{width: 32,height: 32, borderRadius: '50%', backgroundColor: hex, border: '1px solid var(--p-color-border, #d1d1d1)', }}/>
          <input
            type="color"
            value={hex}
            onChange={(e) => onHexChange(e.target.value)}
            style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
            aria-label={`${label} color picker`}
          />
        </label>

        <BlockStack gap="0">
          <Text as="span" variant="bodySm">{hex.toUpperCase()}</Text>

          <Popover
            active={opacityPopoverOpen}
            onClose={() => setOpacityPopoverOpen(false)}
            activator={
              <button
                type="button"
                onClick={() => setOpacityPopoverOpen((prev) => !prev)}
                style={{ background: 'none',border: 'none', padding: 0, cursor: 'pointer',color: 'var(--p-color-text-subdued, #6d7175)', fontSize: 13,textAlign: 'left',}}
              >
                {opacity}%
              </button>
            }
          >
            <Box padding="300" minWidth="220px">
              <RangeSlider
                label="Opacity"
                value={opacity}
                min={0}
                max={100}
                onChange={onOpacityChange}
                suffix={`${opacity}%`}
              />
            </Box>
          </Popover>
        </BlockStack>
      </InlineStack>
    </BlockStack>
  );
}