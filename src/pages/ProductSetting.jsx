import { useState } from 'react';
import {Page,Layout,Card,Text,TextField,Checkbox,ChoiceList, Select, BlockStack,InlineStack,Button,Tabs,Divider,Icon,Tooltip,Box} from '@shopify/polaris';
import { ChevronDownIcon, ChevronUpIcon, InfoIcon } from '@shopify/polaris-icons';

import AppLayout from '../components/AppLayout';
import PreviewPanel from '../components/PreviewPanel';
import ButtonAppearanceCard from '../components/ButtonAppearanceCard';
import priviewImg from '../assets/product_image.webp'

const TABS = [
  { id: 'quote-button', content: 'Quote button' },
  { id: 'hide-price', content: 'Hide price' },
  { id: 'hide-add-to-cart', content: 'Hide Add To Cart button' },
  { id: 'hide-buy-now', content: 'Hide Buy Now button' },
  { id: 'quote-cart-widget', content: 'Quote cart widget' },
  { id: 'checkout-page', content: 'Checkout page' },
  { id: 'more-views', content: 'More views' },
];

const POSITION_OPTIONS = [
  { label: "Under Button 'Add To Cart'", value: 'under_add_to_cart' },
  { label: "Above Button 'Add To Cart'", value: 'above_add_to_cart' },
  { label: 'Above price', value: 'above_price' },
  { label: 'Below price', value: 'below_price' },
];

const PRODUCT_AUDIENCE_CHOICES = [
  { label: 'All products', value: 'all_products' },
  { label: 'Selected products', value: 'selected_products' },
  { label: 'Selected collections', value: 'selected_collections' },
  { label: 'Custom condition', value: 'custom_condition' },
];

const CUSTOMER_AUDIENCE_CHOICES = [
  { label: 'All customer', value: 'all_customers' },
  { label: 'Logged-in customers', value: 'logged_in_customers' },
  { label: 'Guest customers', value: 'guest_customers' },
  { label: 'Customers with tags', value: 'customers_with_tags' },
  { label: 'Customers without tags', value: 'customers_without_tags' },
];

const QUOTE_LIMIT_CHOICES = [
  { label: 'Not required', value: 'not_required' },
  { label: 'Set quote quantity limit', value: 'quantity_limit' },
];

const CLICK_ACTION_CHOICES = [
  { label: 'Display inquiry popup', value: 'inquiry_popup' },
  { label: 'Direct to Request For Quote page', value: 'request_quote_page' },
  { label: 'Display a toast', value: 'toast' },
  { label: 'Get instant quote', value: 'instant_quote' },
];

const DEFAULT_BUTTON_STYLE = {
  fontSize: 14,
  textFormat: [], 
  alignment: 'center',
  textColor: '#141F50',
  textColorOpacity: 100,
  cornerRadius: 8,
  borderThickness: 2,
  buttonColor: '#FFFFFF',
  buttonColorOpacity: 100,
  outlineColor: '#141F50',
  outlineColorOpacity: 100,
  dropShadow: false,
  hover: true,
  hoverFontSize: 14,
  hoverCornerRadius: 8,
  hoverBorderThickness: 2,
  hoverTextColor: '#FFFFFF',
  hoverTextColorOpacity: 100,
  hoverButtonColor: '#141F50',
  hoverButtonColorOpacity: 100,
  hoverOutlineColor: '#141F50',
  hoverOutlineColorOpacity: 100,
};

export default function ProductSetting() {
  const [selectedTab, setSelectedTab] = useState(0);
  const [showOnProductPage, setShowOnProductPage] = useState(true);
  const [showOnCatalogPage, setShowOnCatalogPage] = useState(true);
  const [position, setPosition] = useState('under_add_to_cart');
  const [productAudience, setProductAudience] = useState(['all_products']);
  const [customerAudience, setCustomerAudience] = useState(['all_customers']);
  const [quoteLimit, setQuoteLimit] = useState(['not_required']);
  const [clickAction, setClickAction] = useState(['toast']);

  // TEXT & TRANSLATION SECTION STATE
  const [textSectionOpen, setTextSectionOpen] = useState(true);
  const [quoteButtonLabel, setQuoteButtonLabel] = useState('Add to Quote');
  const [toastLabel, setToastLabel] = useState('Your quote is successfully added');

  // BUTTON APPEARANCE SECTION STATE
  const [appearanceSectionOpen, setAppearanceSectionOpen] = useState(true);
  const [buttonStyle, setButtonStyle] = useState(DEFAULT_BUTTON_STYLE);
  const [showBundlePromo, setShowBundlePromo] = useState(true);

  return (
    <AppLayout>
      <Page title="Quote Button">
        <Card padding="0">
          <Tabs tabs={TABS} selected={selectedTab} onSelect={setSelectedTab} fitted />
        </Card>

        <Box paddingBlockStart="400">
          <Layout>
            {/* LEFT COLUMN — SETTINGS FORM */}
            <Layout.Section>
              <BlockStack gap="400">
                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingMd">Logic</Text>
                      <Select label="Store" labelHidden options={[{ label: 'Default store', value: 'default' }]} value="default" onChange={() => {}}/>
                    </InlineStack>

                    <BlockStack gap="200">
                      <Text as="p" variant="bodyMd" fontWeight="medium">Display button on what position?</Text>
                      <BlockStack gap="150">
                        <Checkbox label="Product page" checked={showOnProductPage} onChange={setShowOnProductPage}/>
                        <Checkbox label="Catalog/collection page" checked={showOnCatalogPage} onChange={setShowOnCatalogPage}/>
                        <Checkbox label="Cart page" checked={false} disabled onChange={() => {}} />
                      </BlockStack>
                    </BlockStack>

                    <Select label="Select position" options={POSITION_OPTIONS} value={position} onChange={setPosition}/>

                    <Divider />

                    <ChoiceList title="Display button for what products?"
                      choices={PRODUCT_AUDIENCE_CHOICES}
                      selected={productAudience}
                      onChange={setProductAudience}
                    />

                    <Divider />

                    <ChoiceList
                      title="Who will see this button?"
                      choices={CUSTOMER_AUDIENCE_CHOICES}
                      selected={customerAudience}
                      onChange={setCustomerAudience}
                    />

                    <Divider />

                    <InlineStack gap="150" blockAlign="center">
                      <Text as="p" variant="bodyMd" fontWeight="medium">What is the quote limit?</Text>
                      <Tooltip content="Limit how many units a customer can request per quote."><Icon source={InfoIcon} tone="subdued" /></Tooltip>
                    </InlineStack>
                    <ChoiceList titleHidden choices={QUOTE_LIMIT_CHOICES} selected={quoteLimit} onChange={setQuoteLimit}/>

                    <Divider />

                    <ChoiceList title="Click button to" choices={CLICK_ACTION_CHOICES} selected={clickAction} onChange={setClickAction}/>
                  </BlockStack>
                </Card>

                {/* TEXT & TRANSLATION CARD */}
                <Card>
                  <BlockStack gap="400">
                    <InlineStack align="space-between" blockAlign="center">
                      <Text as="h2" variant="headingMd">Text & translation</Text>
                      <InlineStack gap="200" blockAlign="center">
                        <Select label="Language" labelHidden options={[{ label: 'English', value: 'en' }]} value="en" onChange={() => {}}/>
                        <Button
                          variant="plain" icon={textSectionOpen ? ChevronUpIcon : ChevronDownIcon}
                          accessibilityLabel="Toggle section"
                          onClick={() => setTextSectionOpen((prev) => !prev)}
                        />
                      </InlineStack>
                    </InlineStack>

                    {textSectionOpen && (
                      <BlockStack gap="300">
                        <TextField 
                          label="Quote button label *"
                          value={quoteButtonLabel}
                          onChange={setQuoteButtonLabel}
                          autoComplete="off"
                        />
                        <TextField
                          label="Label: Display a toast *"
                          value={toastLabel}
                          onChange={setToastLabel}
                          autoComplete="off"
                        />
                        <Checkbox label="Set as default" checked={false} disabled onChange={() => {}} />
                      </BlockStack>
                    )}
                  </BlockStack>
                </Card>

                {/* BUTTON APPEARANCE CARD */}
                <ButtonAppearanceCard
                  value={buttonStyle}
                  onChange={setButtonStyle}
                  open={appearanceSectionOpen}
                  onToggleOpen={() => setAppearanceSectionOpen((prev) => !prev)}
                />
              </BlockStack>
            </Layout.Section>

            {/* RIGHT COLUMN — STICKY PREVIEW */}
            <Layout.Section variant="oneThird">
              <Box position="sticky" insetBlockStart="400">
                <PreviewPanel
                  productImage={priviewImg}
                  productTitle="Women Turtleneck"
                  productPrice="$1,725.00"
                  productDescription="Made from soft and cozy materials, this turtleneck will keep you warm and stylish on those chilly days. The slim fit design flatters your figure, while the turtleneck collar keeps you snug and protected from the cold."
                  quoteButtonLabel={quoteButtonLabel}
                  buttonStyle={buttonStyle}
                  showQuoteButton={showOnProductPage}
                />
              </Box>
            </Layout.Section>
          </Layout>
        </Box>
      </Page>
    </AppLayout>
  );
}