import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {Page,Layout,Card,Text,TextField,BlockStack,InlineStack, Button,Box,Spinner,Divider} from "@shopify/polaris";
import { SearchIcon } from "@shopify/polaris-icons";
import AppLayout from "../components/AppLayout";
import ProductRow from "../components/ProductRow";
import CustomerPanel from "../components/CustomerPanel";
import useQuoteDetail from "../hooks/useQuoteDetail";
import {getShopFromUrl, updateQuoteStatus,updateQuote} from "../services/api";
import { formatMoney, toDateInputValue } from "../utils/date";
import { ErrorState, LoadingState } from "../components/CommonLoading";

const PENDING_STATUSES = ["pending", "new_received"];

// Api data get Function
function extractProducts(quote) {
  const items = Array.isArray(quote?.items) ? quote.items : [];

  return items.map((item, index) => ({
    id: item.id ?? String(index),
    name: item.product_title || 'Unnamed product',
    image: item.image_url || '',
    sku: item.sku || '',

    // READ ONLY
    original_price: Number(item.original_price) || 0,
    customer_requested_price:Number(item.customer_requested_price) || 0,

    // EDITABLE
    merchant_offered_price:Number(item.merchant_offered_price ?? item.customer_requested_price ?? item.original_price ??0),
    quantity: Number(item.quantity) || 1,

    shopify_product_id: item.shopify_product_id || '',
    shopify_variant_id: item.shopify_variant_id || '',
    product_title: item.product_title || '',
    variant_title: item.variant_title || '',
    image_url: item.image_url || '',
  }));
}

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const shop = getShopFromUrl();
  const { quote, loading, error, fetchQuote } = useQuoteDetail(id);
  const withShop = (path) => `${path}?shop=${encodeURIComponent(shop)}`;

  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState("");
  const [merchantNote, setMerchantNote] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [discount, setDiscount] = useState(0);
  // Edit State
  const [originalItems, setOriginalItems] = useState([]);
  const [initialProducts, setInitialProducts] = useState([]);
  const [initialMerchantNote, setInitialMerchantNote] = useState("");
  const [initialDueDate, setInitialDueDate] = useState("");
  const [initialDiscount, setInitialDiscount] = useState(0);
  const [saving, setSaving] = useState(false);

  const [showDiscountInput, setShowDiscountInput] = useState(false);
  // Check if quote is editable (only when status is 'read' ||  'update')
const editableStatuses = ['read', 'update', 'viewed'];
const isEditable = editableStatuses.includes(quote?.status);

  // SYNC LOCAL STATE WHEN QUOTE LOADS  
useEffect(() => {
  if (!quote) return;
  const loadedProducts = extractProducts(quote);
  setProducts(loadedProducts);
  setOriginalItems(quote.items || []);
  setMerchantNote(quote.merchant_note || '');
  setDueDate(toDateInputValue(quote.expires_at));
  setDiscount(Number(quote.discount_value) || 0);
}, [quote]);

  // OPEN PAGE + STATUS PENDING API
  useEffect(() => {
    if (!quote) return;
    if (!PENDING_STATUSES.includes(quote.status)) return;
    Promise.resolve(updateQuoteStatus(id, "read")).catch((err) => {
      console.error("Failed to mark quote as read:", err);
    });
  }, [quote?.id]);

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLowerCase();
    if (!search) return products;
    return products.filter((p) => (p.name || "").toLowerCase().includes(search),);
  }, [products, productSearch]);

  const subtotal = useMemo(() =>products.reduce((sum, p) => sum + (Number(p.quantity) || 0) * (Number(p.quoted_price) || 0),0,), [products],);
  const total = Math.max(subtotal - discount, 0);

  const handleQuantityChange = (productId, value) => { 
    if (!isEditable) return;setProducts((prev) => prev.map((p) =>p.id === productId ? { ...p, quantity: Number(value) || 0 } : p,),);};
  const handlePriceChange = (productId, value) => { if (!isEditable) return;
     setProducts((prev) => prev.map((product) =>String(product.id) === String(productId) ? {...product, customer_requested_price: Number(value) || 0, }: product));
  };

  // Edit data save 
    const updatedItems = originalItems.map((originalItem) => {
      const editedItem = products.find( (product) =>String(product.id) === String(originalItem.id));

      if (!editedItem) { return originalItem;}

      return {
        ...originalItem,
        // Editable fields only
        quantity: Number(editedItem.quantity) || 0,
        merchant_offered_price:Number(editedItem.merchant_offered_price) || 0,};
    });

    // Edit Changes Function
    const buildUpdatePayload = () => {
      const updatedItems = originalItems.map((originalItem) => {
        const editedItem = products.find((product) => String(product.id) === String(originalItem.id));
        if (!editedItem) {return originalItem;}
        return {
          ...originalItem,
          quantity: Number(editedItem.quantity) || 0,
          merchant_offered_price:
            Number(editedItem.merchant_offered_price) || 0,
        };
      });

      return {
        items: updatedItems,
        merchant_note: merchantNote,
        expires_at: dueDate,
        discount_value: Number(discount) || 0,
      };
    };

 // Save Data Function
  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = buildUpdatePayload();
      const response = await updateQuote(id, payload);
      // Auto-update status after successful save
      await updateQuoteStatus(id, 'update');
      await fetchQuote();
    } catch (error) {
      console.error("❌ Update quote failed:", error);
    } finally {
      setSaving(false);
    }
  };  
  const actualSubtotal = useMemo(() =>products.reduce((sum, product) =>sum + (Number(product.quantity) || 0) * (Number(product.original_price) || 0),0),[products]);

  // Loading & Error Component
  if (loading)return (<LoadingState title="Quote Detail" accessibilityLabel="Loading quote" />);
  if (error)return ( <ErrorState title="Quote Detail" message="Failed to load quote." onRetry={fetchQuote}/>);

  return (
    <AppLayout>
   <Page title={quote?.quote_number || `Quote #${id}`}
      backAction={{ content: 'Quotes', onAction: () => {navigate(withShop('/quotelist'));},}}
      primaryAction={{ content: 'Save', onAction: handleSave, loading: saving, disabled: !isEditable,}}
    >
        {!isEditable && (
          <Box padding="400" background="bg-surface-warning">
            <Text as="p" variant="bodyMd" tone="warning">📋 This quote is in read-only mode. Only quotes with 'Read' status can be edited.</Text>
          </Box>
        )}
        <Layout>
          <Layout.Section>
            <BlockStack gap="400">
              <Card>
                <BlockStack gap="400">
                  <Box><Text as="h2" variant="headingMd">Products</Text></Box>
                  <TextField
                    label="Search product"
                    labelHidden prefix={<span style={{ color: "#8a8a8a" }}><SearchIcon width={16} height={16} /> </span>}
                    placeholder="Search product"
                    value={productSearch}
                    onChange={setProductSearch}
                    autoComplete="off"
                    disabled={!isEditable}
                  />

                  <Box paddingBlock="200" paddingInline="0" background="bg-surface-tertiary" borderRadius="150" paddingInlineStart="400" paddingInlineEnd="400">
                    <InlineStack gap="400" wrap={false}>
                      <div style={{ flex: 1 }}>
                        {" "}
                        <Text as="span" variant="bodySm" tone="subdued" fontWeight="semibold">Product</Text>
                      </div>
                      <div style={{ width: 80 }}>
                        <Text as="span" variant="bodySm" tone="subdued" fontWeight="semibold">Quantity</Text>
                      </div>
                      <div style={{ width: 32 }} />
                    </InlineStack>
                  </Box>

                  {filteredProducts.length === 0 ? (
                    <Box padding="400">
                      <Text as="p" tone="subdued" alignment="center">No products found.</Text>
                    </Box>
                  ) : (
                    <BlockStack gap="0">
                      {filteredProducts.map((product) => (
                        <ProductRow
                          key={product.id}
                          product={product}
                          onQuantityChange={handleQuantityChange}
                          onPriceChange={handlePriceChange}
                        />
                      ))}
                    </BlockStack>
                  )}
                </BlockStack>
              </Card>

            <Card>
              <BlockStack gap="400">
                <Box>
                  <Text as="h2" variant="headingMd">Payment Information</Text>
                </Box>

                <Box paddingBlock="300" borderRadius="150" background="bg-surface-secondary" paddingInline="300" >
                  <BlockStack gap="300">
                    {/* Actual Price Total */}
                    <InlineStack align="space-between">
                      <Text as="span" variant="bodyMd">Actual Price</Text>
                      <Text as="span" variant="bodyMd" fontWeight="semibold">{formatMoney((actualSubtotal*100),'${{amount}}')}</Text>
                    </InlineStack>

                    {/* Discount */}
                    {showDiscountInput ? (
                      <InlineStack align="space-between" blockAlign="center" gap="200" >
                        <div style={{ width: 140 }}>
                          <TextField
                            label="Discount"
                            labelHidden
                            type="number"
                            prefix="$"
                            value={String(discount)}
                            onChange={(value) => isEditable && setDiscount(Number(value) || 0)}
                            disabled={!isEditable}
                            autoComplete="off"
                          />
                        </div>

                        <Text as="span" variant="bodyMd">-{formatMoney(discount)}</Text>
                      </InlineStack>
                    ) : (
                      <InlineStack align="space-between" blockAlign="center">
                        <Button variant="plain" onClick={() => setShowDiscountInput(true)}>Add discount</Button>
                        <Text as="span" variant="bodyMd">-{formatMoney((discount*100),'${{amount}}')}</Text>
                      </InlineStack>
                    )}

                    <Divider />

                    <InlineStack align="space-between">
                      <Text as="span" variant="headingSm">Total</Text>
                      <Text as="span" variant="headingSm" tone="success">{formatMoney((Math.max(actualSubtotal - discount, 0)) * 100, '${{amount}}')}</Text>
                    </InlineStack>
                  </BlockStack>
                </Box>
              </BlockStack>
            </Card>
            </BlockStack>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <CustomerPanel
              quote={quote}
              message={merchantNote}
              onMessageChange={setMerchantNote}
              dueDate={dueDate}
              onDueDateChange={setDueDate}
            />
          </Layout.Section>
        </Layout>
      </Page>
    </AppLayout>
  );
}
