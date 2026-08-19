import {Card,Text,TextField,Checkbox,BlockStack,InlineStack,Button,Divider,Box,} from '@shopify/polaris';
import {TextAlignLeftIcon,TextAlignCenterIcon,TextAlignRightIcon,ChevronDownIcon,ChevronUpIcon,} from '@shopify/polaris-icons';
import ColorSwatchField from '../components/Colorswatchfield';

const ALIGN_OPTIONS = [
  { value: 'left', icon: TextAlignLeftIcon },
  { value: 'center', icon: TextAlignCenterIcon },
  { value: 'right', icon: TextAlignRightIcon },
];

const FORMAT_OPTIONS = [
  { value: 'bold', label: 'B' },
  { value: 'italic', label: 'I' },
  { value: 'underline', label: 'U' },
];

// Reusable "3 numeric fields in a row"
function DimensionFields({ fontSize, cornerRadius, borderThickness, onChange, showFontSize = true }) {
  return (
    <InlineStack gap="300" wrap={false}>
      {showFontSize && (
        <div style={{ flex: 1 }}>
          <TextField
            label="Font size"
            type="number"
            suffix="px"
            value={String(fontSize)}
            onChange={(v) => onChange('fontSize', Number(v) || 0)}
            autoComplete="off"
          />
        </div>
      )}
      <div style={{ flex: 1 }}>
        <TextField
          label="Corner radius"
          type="number"
          suffix="px"
          value={String(cornerRadius)}
          onChange={(v) => onChange('cornerRadius', Number(v) || 0)}
          autoComplete="off"
        />
      </div>
      <div style={{ flex: 1 }}>
        <TextField
          label="Border thickness"
          type="number"
          suffix="px"
          value={String(borderThickness)}
          onChange={(v) => onChange('borderThickness', Number(v) || 0)}
          autoComplete="off"
        />
      </div>
    </InlineStack>
  );
}

export default function ButtonAppearanceCard({ value, onChange, open, onToggleOpen }) {
  const set = (key, val) => onChange({ ...value, [key]: val });

  const toggleFormat = (format) => {
    const next = value.textFormat.includes(format) ? value.textFormat.filter((f) => f !== format) : [...value.textFormat, format];
    set('textFormat', next);
  };

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">Button appearance</Text>
          <Button variant="plain" icon={open ? ChevronUpIcon : ChevronDownIcon} accessibilityLabel="Toggle section" onClick={onToggleOpen} />
        </InlineStack>

        {open && (
          <BlockStack gap="400">
            <InlineStack gap="400" wrap={false} blockAlign="start">
              <div style={{ width: 100 }}>
                <TextField
                  label="Font size"
                  type="number"
                  suffix="px"
                  value={String(value.fontSize)}
                  onChange={(v) => set('fontSize', Number(v) || 0)}
                  autoComplete="off"
                />
              </div>

              <BlockStack gap="100">
                <Text as="span" variant="bodyMd">Text format</Text>
                <InlineStack gap="0">
                  {FORMAT_OPTIONS.map((opt) => (<Button key={opt.value} variant={value.textFormat.includes(opt.value) ? 'primary' : 'secondary'} onClick={() => toggleFormat(opt.value)} >{opt.label}</Button>))}
                </InlineStack>
              </BlockStack>

              <BlockStack gap="100">
                <Text as="span" variant="bodyMd">Alignment</Text>
                <InlineStack gap="0">
                  {ALIGN_OPTIONS.map((opt) => (<Button key={opt.value} icon={opt.icon} variant={value.alignment === opt.value ? 'primary' : 'secondary'} accessibilityLabel={`Align ${opt.value}`} onClick={() => set('alignment', opt.value)}/>))}
                </InlineStack>
              </BlockStack>

              <ColorSwatchField
                label="Text color" hex={value.textColor} opacity={value.textColorOpacity} onHexChange={(hex) => set('textColor', hex)}
                onOpacityChange={(opacity) => set('textColorOpacity', opacity)}
              />
            </InlineStack>

            <Divider />

            <Text as="p" variant="bodyMd" fontWeight="semibold"> Button </Text>

            <InlineStack gap="400" wrap={false} blockAlign="start">
              <div style={{ width: 100 }}>
                <TextField
                  label="Corner radius"
                  type="number"
                  suffix="px"
                  value={String(value.cornerRadius)}
                  onChange={(v) => set('cornerRadius', Number(v) || 0)}
                  autoComplete="off"
                />
              </div>
              <div style={{ width: 100 }}>
                <TextField
                  label="Border thickness"
                  type="number"
                  suffix="px"
                  value={String(value.borderThickness)}
                  onChange={(v) => set('borderThickness', Number(v) || 0)}
                  autoComplete="off"
                />
              </div>

              <ColorSwatchField
                label="Button color"
                hex={value.buttonColor}
                opacity={value.buttonColorOpacity}
                onHexChange={(hex) => set('buttonColor', hex)}
                onOpacityChange={(opacity) => set('buttonColorOpacity', opacity)}
              />

              <ColorSwatchField
                label="Outline color"
                hex={value.outlineColor}
                opacity={value.outlineColorOpacity}
                onHexChange={(hex) => set('outlineColor', hex)}
                onOpacityChange={(opacity) => set('outlineColorOpacity', opacity)}
              />
            </InlineStack>

            <Checkbox label="Drop shadow" checked={value.dropShadow} onChange={(checked) => set('dropShadow', checked)}/>
            <Checkbox label="Hover" checked={value.hover} onChange={(checked) => set('hover', checked)}/>

            {value.hover && (
              <>
                <Divider />
                <Text as="p" variant="bodyMd" fontWeight="semibold">Hover state</Text>

                <InlineStack gap="400" wrap={false} blockAlign="start">
                  <div style={{ width: 100 }}>
                    <TextField
                      label="Font size"
                      type="number"
                      suffix="px"
                      value={String(value.hoverFontSize)}
                      onChange={(v) => set('hoverFontSize', Number(v) || 0)}
                      autoComplete="off"
                    />
                  </div>
                  <div style={{ width: 100 }}>
                    <TextField
                      label="Corner radius"
                      type="number"
                      suffix="px"
                      value={String(value.hoverCornerRadius)}
                      onChange={(v) => set('hoverCornerRadius', Number(v) || 0)}
                      autoComplete="off"
                    />
                  </div>
                  <div style={{ width: 100 }}>
                    <TextField
                      label="Border thickness"
                      type="number"
                      suffix="px"
                      value={String(value.hoverBorderThickness)}
                      onChange={(v) => set('hoverBorderThickness', Number(v) || 0)}
                      autoComplete="off"
                    />
                  </div>
                </InlineStack>

                <InlineStack gap="400" wrap={false} blockAlign="start">
                  <ColorSwatchField
                    label="Text color"
                    hex={value.hoverTextColor}
                    opacity={value.hoverTextColorOpacity} onHexChange={(hex) => set('hoverTextColor', hex)}
                    onOpacityChange={(opacity) => set('hoverTextColorOpacity', opacity)}
                  />
                  <ColorSwatchField
                    label="Button color"
                    hex={value.hoverButtonColor} opacity={value.hoverButtonColorOpacity}
                    onHexChange={(hex) => set('hoverButtonColor', hex)}
                    onOpacityChange={(opacity) => set('hoverButtonColorOpacity', opacity)}
                  />
                  <ColorSwatchField
                    label="Outline color"
                    hex={value.hoverOutlineColor}
                    opacity={value.hoverOutlineColorOpacity} onHexChange={(hex) => set('hoverOutlineColor', hex)}
                    onOpacityChange={(opacity) => set('hoverOutlineColorOpacity', opacity)}
                  />
                </InlineStack>
              </>
            )}
          </BlockStack>
        )}
      </BlockStack>
    </Card>
  );
}