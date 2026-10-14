/**
 * Quote App - storefront embed script
 *
 * Kam shu kare chhe:
 *  1. Merchant na Button-appearance settings backend thi lave chhe (/collections) ane apply kare chhe:
 *       buttonText, buttonColor, textColor, cornerRadius,
 *       showOnProduct, showOnCollection, showOnCart,
 *       hidePriceGlobally, hideAddToCart
 *  2. Collection / Product / Cart page par "Request a Quote" button inject kare chhe.
 *  3. Quote page ( #ppQuoe_widget ) par product list + contact form render kari ne
 *     /storefront/quotes ma quote submit kare chhe.
 *  4. Header ma Quote icon + count automatic inject kare chhe (badhe page par, badhe tab ma sync).
 *
 * Override karva mate (optional, theme ma script pehla):
 *   window.PPQuoteApiUrl      = '/apps/quote-app';   // Shopify App Proxy (default)
 *   window.PPQuoteMoneyFormat = '₹{{amount}}';
 *   window.PPQuotePageUrl     = '/pages/your-quote-page';
 */
(function () {
    'use strict';

    if (window.__ppQuoteEmbedLoaded) return;
    window.__ppQuoteEmbedLoaded = true;

    /* =====================================================================
     * CONFIG
     * ===================================================================== */
    const QuoteAuthUrl = window.PPQuoteApiUrl || '/apps/quote-app';
    const MONEY_FORMAT = window.PPQuoteMoneyFormat || '${{amount}}';
    const STORAGE_KEY = 'ppQuoe__row';
    const SETTINGS_CACHE_KEY = 'ppQuoe__settings';
    const SETTINGS_CACHE_MS = 2 * 60 * 1000; // 2 min
    const VALID_SOURCES = ['product_page', 'collection_page', 'cart_page'];
    const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // header icon
    const QUOTE_PAGE_URL = window.PPQuotePageUrl || '/pages/request-a-quote'; // tamari quote page no URL
    const COUNT_BY_QTY = false;          // true = total quantity, false = alag alag product ni sankhya
    const HIDE_BADGE_WHEN_ZERO = false;  // true = 0 hoy tyare badge chhupavo

    const LOCALIZATION_DATA_URLS = {
        countries: 'https://cdn.jsdelivr.net/npm/countries-state-city-dropdown@2.0.7/countries.json',
        states: 'https://cdn.jsdelivr.net/npm/countries-state-city-dropdown@2.0.7/states.json',
        cities: 'https://cdn.jsdelivr.net/npm/countries-state-city-dropdown@2.0.7/cities.json'
    };

    const DEFAULT_SETTINGS = {
        buttonText: 'Request a Quote',
        buttonColor: '#000000',
        textColor: '#ffffff',
        cornerRadius: 8,
        showOnProduct: true,
        showOnCollection: false,
        showOnCart: false,
        hidePriceGlobally: false,
        hideAddToCart: false
    };

    /* =====================================================================
     * GLOBAL STATE
     * ===================================================================== */
    const PPshop = (window.Shopify && window.Shopify.shop) || document.location.host;

    function getPageType() {
        const st = window.__st && window.__st.p;
        if (st) return String(st);
        const path = window.location.pathname;
        if (/\/products\/[^/]+/.test(path)) return 'product';
        if (/\/collections(\/|$)/.test(path)) return 'collection';
        if (/\/cart\/?$/.test(path)) return 'cart';
        return '';
    }
    const PPIsPage = getPageType();

    let QuoteProLoad = true;
    let getQuoteLocalData = null;
    let QuoteLineItem = [];
    let QuiteisValidEmail = false;
    let CollectionObj = null;
    let storeSettings = Object.assign({}, DEFAULT_SETTINGS);
    let settingsReady = false;

    let countries = [];
    let states = [];
    let cities = [];
    let citiesLoadingPromise = null;
    let locationLoadingPromise = null;

    /* =====================================================================
     * SMALL HELPERS
     * ===================================================================== */
    function getWidget() {
        return document.querySelector('#ppQuoe_widget');
    }
    function getElement(id) {
        return document.getElementById(id);
    }
    function QuoteJsonstringify(data) {
        return JSON.stringify(data);
    }
    function esc(value) {
        return String(value === undefined || value === null ? '' : value).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function toBool(v) {
        return v === true || v === 'true' || v === 1 || v === '1';
    }
    function normalizeColor(value, fallback) {
        const v = String(value === undefined || value === null ? '' : value).trim();
        if (!v) return fallback;
        if (/^[0-9a-f]{3}$|^[0-9a-f]{6}$|^[0-9a-f]{8}$/i.test(v)) return '#' + v; // backend ma '#' vagar save thay chhe
        return v;
    }
    function debounce(fn, wait) {
        let t;
        return function () {
            const args = arguments;
            clearTimeout(t);
            t = setTimeout(function () { fn.apply(null, args); }, wait);
        };
    }
    function absoluteUrl(src) {
        if (!src) return null;
        try { return new URL(src, window.location.origin).href; } catch (e) { return null; }
    }
    function getShopifyCustomerId() {
        const id = (window.__st && window.__st.cid) ||
            (window.ShopifyAnalytics && window.ShopifyAnalytics.meta && window.ShopifyAnalytics.meta.page && window.ShopifyAnalytics.meta.page.customerId);
        return id ? String(id) : null;
    }

    /* ---------- money ---------- */
    function formatMoney(amount, format) {
        const fmt = format || MONEY_FORMAT;
        const num = Number(amount);
        const n = isNaN(num) ? 0 : num;
        const m = fmt.match(/\{\{\s*(\w+)\s*\}\}/);
        const type = m ? m[1] : 'amount';

        function withDelimiters(number, precision, thousands, decimal) {
            const parts = number.toFixed(precision).split('.');
            const whole = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
            return whole + (parts[1] ? decimal + parts[1] : '');
        }

        let value;
        switch (type) {
            case 'amount_no_decimals': value = withDelimiters(n, 0, ',', '.'); break;
            case 'amount_with_comma_separator': value = withDelimiters(n, 2, '.', ','); break;
            case 'amount_no_decimals_with_comma_separator': value = withDelimiters(n, 0, '.', ','); break;
            case 'amount_with_apostrophe_separator': value = withDelimiters(n, 2, "'", '.'); break;
            default: value = withDelimiters(n, 2, ',', '.');
        }
        return fmt.replace(/\{\{\s*\w+\s*\}\}/, value);
    }

    /* ---------- local storage (quote cart) ---------- */
    function emptyStore() {
        return { shop: PPshop, customer: {}, items: [], note: '', source: '', field_values: [] };
    }
    function normalizeStore(data) {
        const s = data && typeof data === 'object' ? data : emptyStore();
        s.shop = s.shop || PPshop;
        s.customer = s.customer && typeof s.customer === 'object' ? s.customer : {};
        s.items = Array.isArray(s.items) ? s.items : [];
        s.field_values = Array.isArray(s.field_values) ? s.field_values : [];
        return s;
    }
    function readStore() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? normalizeStore(JSON.parse(raw)) : null;
        } catch (e) {
            return null;
        }
    }
    function writeStore(data) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* storage full / blocked */ }
        updateHeaderCount(); // darek change (add / delete / qty / submit) par header count sync
    }

    /* ---------- header quote icon + count ---------- */
    function getQuoteCount() {
        const store = readStore();
        const items = store ? store.items : [];
        if (!COUNT_BY_QTY) return items.length;
        return items.reduce(function (sum, i) { return sum + (parseInt(i.quantity, 10) || 0); }, 0);
    }

    function updateHeaderCount() {
        const count = String(getQuoteCount());
        const hide = HIDE_BADGE_WHEN_ZERO && count === '0';
        document.querySelectorAll('.pp-quote-count, [data-pp-quote-count]').forEach(function (el) {
            // value badlay tyare j DOM aadvu (MutationObserver loop na thay e mate)
            if (el.textContent !== count) el.textContent = count;
            const wanted = hide ? 'none' : '';
            if (el.style.display !== wanted) el.style.display = wanted;
        });
    }

    function ensureHeaderCss() {
        if (document.getElementById('pp-quote-header-css')) return;
        const st = document.createElement('style');
        st.id = 'pp-quote-header-css';
        st.textContent =
            '.pp-quote-header-link{position:relative;display:inline-flex;align-items:center;justify-content:center;color:inherit;text-decoration:none;}' +
            '.pp-quote-header-link svg{width:24px;height:24px;display:block;}' +
            // newer themes (Horizon): header-actions na icons 20px chhe, tema jevo j size
            '.header-actions__action.pp-quote-header-link{display:inline-flex;align-items:center;justify-content:center;position:relative;cursor:pointer;}' +
            '.header-actions__action.pp-quote-header-link svg{width:20px;height:20px;}' +
            '.pp-quote-count{position:absolute;top:-6px;right:-8px;min-width:18px;height:18px;padding:0 4px;box-sizing:border-box;' +
            'border-radius:999px;background:#000;color:#fff;font-size:11px;line-height:18px;text-align:center;font-weight:600;}';
        (document.head || document.documentElement).appendChild(st);
    }

    function injectHeaderIcon() {
        // pehlathi icon (manual ke injected) hoy to navo na banavo, bas count update thase
        if (document.querySelector('.pp-quote-header-link, [data-pp-quote-count]')) {
            updateHeaderCount();
            return;
        }

        // theme ma cart icon shodho (header ni andar)
        const cartEl = document.querySelector(
            // Dawn/classic themes + newer themes (Horizon: <header-actions> ma cart <button> hoy chhe, link nahi)
            'header a[href="/cart"], header a[href$="/cart"], header a[href*="/cart?"], header [id*="cart-icon" i], header .header__icon--cart, ' +
            'header [data-testid="cart-drawer-trigger"], header button[aria-controls="cart-drawer"], header .header-actions__action[aria-label*="cart" i], ' +
            'header cart-icon, header cart-drawer-trigger, header [class*="cart-icon" i]'
        );
        if (!cartEl) return;
        const cartAnchor = cartEl.closest('a, button') || cartEl;

        ensureHeaderCss();

        const a = document.createElement('a');
        a.href = QUOTE_PAGE_URL;
        a.className = (cartAnchor.className || '') + ' pp-quote-header-link'; // theme na icon jevi j style
        a.setAttribute('aria-label', 'Quote');
        a.innerHTML =
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<path d="M6 3h9l4 4v14H6z"></path><path d="M14 3v5h5"></path><path d="M9 12h7"></path><path d="M9 16h7"></path></svg>' +
            '<span class="pp-quote-count">0</span>';

        cartAnchor.insertAdjacentElement('afterend', a); // cart pachi joie to 'afterend'
        updateHeaderCount();
    }

    /* ---------- toast ---------- */
    function showQuoteToast(message, isError) {
        document.querySelectorAll('.PP_toust__success_msg').forEach(function (el) { el.remove(); });
        const div = document.createElement('div');
        div.className = 'PP_toust__success_msg';
        div.textContent = message;
        if (isError) div.style.background = '#b42318';
        document.body.appendChild(div);
        setTimeout(function () { div.remove(); }, 3500);
    }

    /* =====================================================================
     * API
     * ===================================================================== */
    const PPQuoteAPIcallFack = async function (PATH, METHOD, DATA) {
        DATA = DATA || '';
        const headers = {
            'Accept': 'application/json'
        };
        let url = QuoteAuthUrl + PATH;
        const opts = { method: METHOD, headers: headers };

        if (METHOD === 'GET') {
            const qs = new URLSearchParams(DATA ? JSON.parse(DATA) : {}).toString();
            if (qs) url += '?' + qs;
        } else {
            headers['Content-Type'] = 'application/json';
            opts.body = DATA;
        }

        const response = await fetch(url, opts);
        let res = {};
        try { res = await response.json(); } catch (e) { res = {}; }
        if (res && typeof res === 'object') res._status = response.status;
        return res;
    };

    /* =====================================================================
     * STORE SETTINGS  (button appearance + hide price / hide add to cart)
     * ===================================================================== */
    function normalizeSettings(raw) {
        let src = raw;
        if (typeof src === 'string') {
            try { src = JSON.parse(src); } catch (e) { src = null; }
        }
        const s = Object.assign({}, DEFAULT_SETTINGS);
        if (src && typeof src === 'object' && !Array.isArray(src)) {
            Object.keys(DEFAULT_SETTINGS).forEach(function (k) {
                if (src[k] !== undefined && src[k] !== null && src[k] !== '') s[k] = src[k];
            });
        }
        s.buttonColor = normalizeColor(s.buttonColor, DEFAULT_SETTINGS.buttonColor);
        s.textColor = normalizeColor(s.textColor, DEFAULT_SETTINGS.textColor);
        s.cornerRadius = isNaN(parseInt(s.cornerRadius, 10)) ? DEFAULT_SETTINGS.cornerRadius : parseInt(s.cornerRadius, 10);
        s.showOnProduct = toBool(s.showOnProduct);
        s.showOnCollection = toBool(s.showOnCollection);
        s.showOnCart = toBool(s.showOnCart);
        s.hidePriceGlobally = toBool(s.hidePriceGlobally);
        s.hideAddToCart = toBool(s.hideAddToCart);
        s.buttonText = String(s.buttonText || DEFAULT_SETTINGS.buttonText);
        return s;
    }

    function readSettingsCache() {
        try {
            const c = JSON.parse(sessionStorage.getItem(SETTINGS_CACHE_KEY));
            if (c && c.shop === PPshop && Date.now() - c.t < SETTINGS_CACHE_MS) return c.data;
        } catch (e) { /* ignore */ }
        return null;
    }
    function writeSettingsCache(data) {
        try {
            sessionStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify({ shop: PPshop, t: Date.now(), data: data }));
        } catch (e) { /* ignore */ }
    }

    /**
     * hide price / hide add-to-cart  ->  CSS thi (theme-independent, dynamic content ma pan chale).
     * Quote widget ( #ppQuoe_widget ) ane aapdo potano button hide thato nathi.
     */
    function ensureDynamicCss() {
        if (document.getElementById('pp-quote-dynamic-css')) return;
        const st = document.createElement('style');
        st.id = 'pp-quote-dynamic-css';
        st.textContent =
            'html.pp-quote-hide-price :is([class*="price" i], .money, [data-price], [data-product-price]):not(html):not(body)' +
            ':not(#ppQuoe_widget):not(#ppQuoe_widget *):not(.my-app-quote-btn)' +
            ':not(:has(.my-app-quote-btn)):not(:has(#ppQuoe_widget)):not(:has(input, select, textarea)){display:none !important;}' +
            'html.pp-quote-hide-cart :is(form[action*="/cart/add"] [type="submit"], button[name="add"], [class*="add-to-cart" i], [class*="add_to_cart" i], ' +
            '.product-form__submit, .shopify-payment-button, [data-shopify="payment-button"]):not(.my-app-quote-btn)' +
            ':not(:has(.my-app-quote-btn)):not(:has(input, select, textarea)){display:none !important;}';
        (document.head || document.documentElement).appendChild(st);
    }

    function applyVisibilityClasses() {
        const root = document.documentElement;
        root.classList.toggle('pp-quote-hide-price', !!storeSettings.hidePriceGlobally);
        root.classList.toggle('pp-quote-hide-cart', !!storeSettings.hideAddToCart);
    }

    function applySettings(raw) {
        storeSettings = normalizeSettings(raw);
        settingsReady = true;
        ensureDynamicCss();
        applyVisibilityClasses();
        PPQuoteInjectButtons();
    }

    async function loadStoreSettings() {
        const cached = readSettingsCache();
        if (cached !== null && cached !== undefined) {
            applySettings(cached);
            return;
        }
        try {
            const Response = await PPQuoteAPIcallFack('/collections', 'GET', QuoteJsonstringify({ shop: PPshop }));
            CollectionObj = Response && Response.data ? Response.data : null;
            if (!CollectionObj) return; // API down -> kai nahi badalvanu
            const raw = CollectionObj.settings || {};
            writeSettingsCache(raw);
            applySettings(raw);
        } catch (error) {
            console.error('Quote API Error:', error);
        }
    }

    /* =====================================================================
     * ADD PRODUCT TO QUOTE  (collection / product / cart page)
     * ===================================================================== */
    function productHandleFromHref(href) {
        const m = String(href || '').match(/\/products\/([^/?#]+)/);
        if (!m) return null;
        try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
    }

    const openQuoteModal = async function (productHandle) {
        try {
            const response = await fetch(window.location.origin + '/products/' + encodeURIComponent(productHandle) + '.json', {
                method: 'GET',
                headers: { 'Accept': 'application/json' }
            });
            if (!response.ok) return null;
            const res = await response.json();
            return res && res.product ? res.product : null;
        } catch (error) {
            console.error('Quote API Error:', error);
            return null;
        }
    };

    function buildItemFromProduct(product, variantId, quantity) {
        const variants = product.variants || [];
        const variant = variants.find(function (v) { return String(v.id) === String(variantId); }) || variants[0] || {};
        let image = null;
        if (variant.image_id && Array.isArray(product.images)) {
            const img = product.images.find(function (i) { return i.id === variant.image_id; });
            if (img) image = img.src;
        }
        if (!image && product.image) image = product.image.src;

        return {
            shopify_product_id: String(product.id),
            shopify_variant_id: variant.id ? String(variant.id) : null,
            product_title: product.title,
            variant_title: variant.title && variant.title !== 'Default Title' ? variant.title : null,
            sku: variant.sku || null,
            image_url: absoluteUrl(image),
            quantity: Math.max(1, parseInt(quantity, 10) || 1),
            original_price: parseFloat(variant.price) || 0,
            customer_requested_price: null // 0 moklie to backend line_total 0 kari nakhe
        };
    }

    function mergeItemsIntoQuote(newItems, source, replaceQty) {
        const store = readStore() || emptyStore();
        newItems.forEach(function (n) {
            const existing = store.items.find(function (i) {
                return String(i.shopify_product_id) === String(n.shopify_product_id) &&
                    String(i.shopify_variant_id) === String(n.shopify_variant_id);
            });
            if (existing) {
                existing.quantity = replaceQty ? n.quantity : (parseInt(existing.quantity, 10) || 0) + n.quantity;
            } else {
                store.items.push(n);
            }
        });
        if (VALID_SOURCES.indexOf(source) !== -1) store.source = source;
        writeStore(store);
        getQuoteLocalData = store;
        return store;
    }

    async function addProductByHandle(handle, opts) {
        opts = opts || {};
        const product = await openQuoteModal(handle);
        if (!product) {
            showQuoteToast('Could not add this product to your quote. Please try again.', true);
            return false;
        }
        const item = buildItemFromProduct(product, opts.variantId, opts.quantity || 1);
        mergeItemsIntoQuote([item], opts.source, false);
        showQuoteToast('Your quote is successfully added');
        return true;
    }

    function setBusy(btn, busy) {
        btn.disabled = !!busy;
        btn.style.opacity = busy ? '0.6' : '';
        btn.style.cursor = busy ? 'wait' : 'pointer';
    }

    function createQuoteButton(extraClass) {
        const s = storeSettings;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-primary my-app-quote-btn' + (extraClass ? ' ' + extraClass : '');
        btn.textContent = s.buttonText;
        btn.style.backgroundColor = s.buttonColor;
        btn.style.color = s.textColor;
        btn.style.borderRadius = s.cornerRadius + 'px';
        btn.style.cursor = 'pointer';
        return btn;
    }

    /* ---------- collection page ---------- */
    function findCardAncestor(link) {
        let el = link;
        let depth = 0;
        let found = null;

        while (el && el !== document.body && depth < 6) {
            // ek card ma ek j product hovo joie
            const handles = new Set();
            el.querySelectorAll('a[href*="/products/"]').forEach(function (a) {
                const h = productHandleFromHref(a.getAttribute('href'));
                if (h) handles.add(h);
            });
            if (handles.size > 1) break;

            const hasImage = el.querySelector('img');
            const hasPriceOrCart =
                el.querySelector('[class*="price" i]') ||
                el.querySelector('button[name="add"]') ||
                el.querySelector('[class*="add-to-cart" i]');

            if (hasImage && hasPriceOrCart) { found = el; break; }
            el = el.parentElement;
            depth++;
        }

        if (!found) {
            const fallback = link.closest('li, article');
            if (fallback && fallback.querySelector('img')) found = fallback;
        }
        if (found && found.closest('header, footer, nav, [id*="cart-drawer" i], #ppQuoe_widget')) return null;
        return found;
    }

    function injectQuoteButton(card, link) {
        const productHandle = productHandleFromHref(link.getAttribute('href'));
        if (!productHandle) return;

        const btn = createQuoteButton();
        btn.dataset.productHandle = productHandle;
        btn.addEventListener('click', async function (e) {
            e.preventDefault();
            e.stopPropagation();
            setBusy(btn, true);
            await addProductByHandle(productHandle, { source: 'collection_page', quantity: 1 });
            setBusy(btn, false);
        });

        const addToCartBtn = card.querySelector('button[name="add"], [class*="add-to-cart" i]');
        if (addToCartBtn) {
            addToCartBtn.insertAdjacentElement('afterend', btn);
        } else {
            card.appendChild(btn);
        }
    }

    function detectProductCards() {
        const seenCards = new Set();
        document.querySelectorAll('a[href*="/products/"]').forEach(function (link) {
            const card = findCardAncestor(link);
            if (!card || seenCards.has(card)) return;
            seenCards.add(card);
            if (card.querySelector('.my-app-quote-btn')) return;
            injectQuoteButton(card, link);
        });
    }

    /* ---------- product page ---------- */
    function injectProductPageButton() {
        if (document.querySelector('.pp-quote-product-btn')) return;
        const handle = productHandleFromHref(window.location.pathname);
        if (!handle) return;

        const forms = Array.prototype.slice.call(document.querySelectorAll('form[action*="/cart/add"]'));
        const form = forms.find(function (f) {
            return !f.closest('header, footer, #ppQuoe_widget') && f.querySelector('[name="id"]');
        }) || forms[0];
        if (!form) return;

        const btn = createQuoteButton('pp-quote-product-btn');
        btn.style.width = '100%';
        btn.style.marginTop = '10px';
        btn.addEventListener('click', async function (e) {
            e.preventDefault();
            e.stopPropagation();
            const idInput = form.querySelector('[name="id"]');
            const qtyInput = form.querySelector('[name="quantity"]');
            setBusy(btn, true);
            await addProductByHandle(handle, {
                source: 'product_page',
                variantId: idInput ? idInput.value : null,
                quantity: qtyInput ? qtyInput.value : 1
            });
            setBusy(btn, false);
        });

        const submit = form.querySelector('button[name="add"], [type="submit"]');
        if (submit) {
            submit.insertAdjacentElement('afterend', btn);
        } else {
            form.appendChild(btn);
        }
    }

    /* ---------- cart page ---------- */
    function injectCartPageButton() {
        if (document.querySelector('.pp-quote-cart-btn')) return;

        const checkout = document.querySelector('[name="checkout"]');
        const cartForm = document.querySelector('form[action="/cart"]');
        if (!checkout && !cartForm) return;

        const btn = createQuoteButton('pp-quote-cart-btn');
        btn.style.width = '100%';
        btn.style.marginTop = '10px';
        btn.addEventListener('click', async function (e) {
            e.preventDefault();
            e.stopPropagation();
            setBusy(btn, true);
            try {
                const res = await fetch('/cart.js', { headers: { 'Accept': 'application/json' } });
                const cart = await res.json();
                const items = (cart.items || []).map(function (it) {
                    const unit = it.original_price !== undefined && it.original_price !== null ? it.original_price : it.price;
                    return {
                        shopify_product_id: String(it.product_id),
                        shopify_variant_id: String(it.variant_id),
                        product_title: it.product_title || it.title,
                        variant_title: it.variant_title && it.variant_title !== 'Default Title' ? it.variant_title : null,
                        sku: it.sku || null,
                        image_url: absoluteUrl(it.image),
                        quantity: Math.max(1, parseInt(it.quantity, 10) || 1),
                        original_price: (Number(unit) || 0) / 100,
                        customer_requested_price: null
                    };
                });
                if (!items.length) {
                    showQuoteToast('Your cart is empty.', true);
                } else {
                    mergeItemsIntoQuote(items, 'cart_page', true);
                    showQuoteToast('Your cart items are added to the quote');
                }
            } catch (err) {
                console.error('Quote API Error:', err);
                showQuoteToast('Could not read your cart. Please try again.', true);
            }
            setBusy(btn, false);
        });

        if (checkout) {
            checkout.insertAdjacentElement('afterend', btn);
        } else {
            cartForm.appendChild(btn);
        }
    }

    /* ---------- dispatcher ---------- */
    function PPQuoteInjectButtons() {
        injectHeaderIcon(); // header icon ne settings ni jarur nathi, badhe page par
        if (!settingsReady) return;
        if (PPIsPage === 'collection' && storeSettings.showOnCollection) detectProductCards();
        if (PPIsPage === 'product' && storeSettings.showOnProduct) injectProductPageButton();
        if (PPIsPage === 'cart' && storeSettings.showOnCart) injectCartPageButton();
    }
    window.PPQuoteCollectionPage = PPQuoteInjectButtons; // juna naam sathe compatible

    /* =====================================================================
     * LOCATION DATA (country / state / city)
     * ===================================================================== */
    async function fetchJSON(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Failed to load: ' + url + ' (' + response.status + ')');
        }
        return response.json();
    }
    function addOption(select, value, text) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = text;
        select.appendChild(option);
    }
    function resetSelect(select, placeholder) {
        if (!select) return;
        select.innerHTML = '';
        const option = document.createElement('option');
        option.value = '';
        option.textContent = placeholder;
        select.appendChild(option);
    }

    function loadLocationData() {
        if (countries.length && states.length) return Promise.resolve();
        if (locationLoadingPromise) return locationLoadingPromise;
        locationLoadingPromise = Promise.all([
            fetchJSON(LOCALIZATION_DATA_URLS.countries),
            fetchJSON(LOCALIZATION_DATA_URLS.states)
        ]).then(function (r) {
            countries = Array.isArray(r[0]) ? r[0] : (r[0].countries || []);
            states = Array.isArray(r[1]) ? r[1] : (r[1].states || []);
        }).catch(function (error) {
            console.error('Location data error', error);
            locationLoadingPromise = null;
        });
        return locationLoadingPromise;
    }

    // cities no file motu hoy chhe -> state select thay tyare j load thay chhe
    function ensureCities() {
        if (cities.length) return Promise.resolve();
        if (citiesLoadingPromise) return citiesLoadingPromise;
        citiesLoadingPromise = fetchJSON(LOCALIZATION_DATA_URLS.cities).then(function (r) {
            cities = Array.isArray(r) ? r : (r.cities || []);
        }).catch(function (error) {
            console.error('Cities data error', error);
            citiesLoadingPromise = null;
        });
        return citiesLoadingPromise;
    }

    async function populateCountries() {
        const select = document.querySelector('#country');
        if (!select) return;
        await loadLocationData();
        const sel = document.querySelector('#country'); // render badlaay to navo element
        if (!sel || sel.options.length > 1) return;
        countries.forEach(function (country) {
            addOption(sel, country.id, country.name);
        });
    }

    /* =====================================================================
     * QUOTE PAGE  ( #ppQuoe_widget )
     * ===================================================================== */
    function PPQuoteLoader() {
        return '<div class="Quote--loader"></div>';
    }

    function cust(key) {
        const c = getQuoteLocalData && typeof getQuoteLocalData.customer === 'object' && getQuoteLocalData.customer
            ? getQuoteLocalData.customer : {};
        return c[key] === undefined || c[key] === null ? '' : c[key];
    }

    function PPQuoteWidget(data) {
        const widget = getWidget();
        if (!widget) return;

        getQuoteLocalData = normalizeStore(data);
        QuoteLineItem = getQuoteLocalData.items;
        QuiteisValidEmail = false;

        let html = '<div class="quote-wrapper">';
        if (QuoteLineItem.length > 0) {
            html += '<div class="q-card quote-card" id="quote-card" data-type="product" open="true">' + PPQuoteProduct(QuoteLineItem) + '</div>';
            html += '<div class="q-card contact-form-card" id="contact-card" data-type="contact" open="false">' + PPQuoteContact() + '</div>';
            html += '<div class="totals">' + PPQuoteTotal() + '</div>';
            html += '<div class="quote-actions">' + PPQuoteAction() + '</div>';
        } else {
            html += '<div class="quote--empty"><div class="quote--empty-icon"><svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="30" fill="#737B8B"></circle><path d="M24 25.5C24 20.5 27.8 17 32.8 17C38.2 17 42 20.5 42 25.2C42 29.4 39.8 31.7 36.5 33.8C33.5 35.7 32 37.2 32 40.5" fill="none" stroke="#FFFFFF" stroke-width="6" stroke-linecap="round"></path><circle cx="32" cy="48" r="3" fill="#FFFFFF"></circle></svg></div><h2 class="quote-emty-title">Empty List</h2><p class="quote-emty-desc">Your quote is currently empty!</p><a href="/collections/all" class="btn btn-primary">Continue Shopping</a></div>';
        }
        html += '</div>';
        html += RequestMsgHtml();

        widget.innerHTML = html;
        bindWidgetEvents();
        populateCountries();
        PPCardAction();
    }

    function bindWidgetEvents() {
        /* ---- delete item ---- */
        document.querySelectorAll('.delete-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const row = btn.closest('.product-row');
                const idx = parseInt(row.getAttribute('data-key'), 10);
                if (isNaN(idx)) return;
                getQuoteLocalData.items.splice(idx, 1);
                writeStore(getQuoteLocalData);
                PPQuoteWidget(getQuoteLocalData);
            });
        });

        /* ---- qty +/- ---- */
        document.querySelectorAll('.ItemQtyBtn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const row = btn.closest('.product-row');
                const idx = parseInt(row.getAttribute('data-key'), 10);
                const item = QuoteLineItem[idx];
                if (!item) return;

                let qty = parseInt(item.quantity, 10) || 1;
                if (btn.getAttribute('data-btn') === 'minus') qty = Math.max(1, qty - 1);
                if (btn.getAttribute('data-btn') === 'plus') qty = qty + 1;
                item.quantity = qty;

                row.querySelector('.Quoteqty').textContent = qty;
                row.querySelector('.product-total').textContent = formatMoney(item.original_price * qty);
                writeStore(getQuoteLocalData);
                QuotePriceClac();
            });
        });

        /* ---- continue shopping ---- */
        document.querySelectorAll('.pp-continue-shopping').forEach(function (btn) {
            btn.addEventListener('click', function () { window.location.href = '/collections/all'; });
        });

        /* ---- step buttons (prev / next) ---- */
        document.querySelectorAll('.ppQutebtn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const btnKey = btn.getAttribute('data-key');
                if (btnKey !== 'next' && btnKey !== 'prev') return; // submit alag handle thay chhe

                const goingNext = btnKey === 'next';
                document.querySelectorAll('.ppQutebtn').forEach(function (b) {
                    const key = b.getAttribute('data-key');
                    const isStep2Btn = key === 'prev' || key === 'submit';
                    b.style.display = (goingNext ? isStep2Btn : !isStep2Btn) ? 'inline-flex' : 'none';
                });
                const quoteCard = document.querySelector('#quote-card');
                const contactCard = document.querySelector('#contact-card');
                if (quoteCard) quoteCard.setAttribute('open', goingNext ? 'false' : 'true');
                if (contactCard) contactCard.setAttribute('open', goingNext ? 'true' : 'false');
                showQuoteFormError('');
                PPCardAction();
            });
        });

        /* ---- submit ---- */
        const submitBtn = document.querySelector('#PPQuoteSubmitRequest');
        if (submitBtn) submitBtn.addEventListener('click', submitQuote);

        /* ---- accordions ---- */
        document.querySelectorAll('.accordion-header').forEach(function (header) {
            header.addEventListener('click', function () {
                const accordion = this.closest('.form-accordion');
                const isActive = accordion.classList.contains('active');
                accordion.classList.toggle('active');
                this.setAttribute('aria-expanded', String(!isActive));
                PPCardAction();
            });
        });

        /* ---- email validation (keypress ni jagya e input: last character pan gane) ---- */
        const emailInput = getElement('quoteemail');
        if (emailInput) {
            emailInput.addEventListener('input', function () { validateEmailField(emailInput); });
            if (emailInput.value) validateEmailField(emailInput);
        }

        /* ---- form values localStorage ma save (re-render par khovay nahi) ---- */
        const contactForm = document.querySelector('#quote--contact');
        if (contactForm) {
            const persist = debounce(persistContactForm, 300);
            contactForm.addEventListener('input', function (e) { persist(); showQuoteFormError(''); maybeReloadShipping(e); });
            contactForm.addEventListener('change', function (e) { persist(); maybeReloadShipping(e); });
            // re-render pachhi pehla na rates fari batavo, ane prefilled address hoy to rates lavo
            renderShippingRates();
            setTimeout(scheduleShippingRates, 1500);
        }

        /* ---- country -> state ---- */
        const countrySel = document.querySelector('#country');
        if (countrySel) {
            countrySel.addEventListener('change', function () {
                const stateSel = document.querySelector('#state');
                const citySel = document.querySelector('#city');
                resetSelect(stateSel, 'Select your State');
                resetSelect(citySel, 'Select your City');
                if (stateSel) stateSel.disabled = false;
                if (citySel) citySel.disabled = false;

                const countryId = this.value;
                if (!countryId) return;
                const countryStates = states.filter(function (s) {
                    return String(s.country_id) === String(countryId);
                }).sort(function (a, b) { return a.name.localeCompare(b.name); });

                if (!countryStates.length) {
                    addOption(stateSel, '', 'No State / Province');
                    stateSel.disabled = true;
                    return;
                }
                countryStates.forEach(function (s) { addOption(stateSel, s.id, s.name); });
            });
        }

        /* ---- state -> city ---- */
        const stateSel2 = document.querySelector('#state');
        if (stateSel2) {
            stateSel2.addEventListener('change', async function () {
                const citySel = document.querySelector('#city');
                resetSelect(citySel, 'Loading cities...');
                const stateId = this.value;
                if (!stateId) { resetSelect(citySel, 'Select your City'); return; }

                await ensureCities();
                resetSelect(citySel, 'Select your City');
                const stateCities = cities.filter(function (c) {
                    return String(c.state_id) === String(stateId);
                }).sort(function (a, b) { return a.name.localeCompare(b.name); });

                if (!stateCities.length) {
                    addOption(citySel, '', 'No Cities');
                    citySel.disabled = true;
                    return;
                }
                citySel.disabled = false;
                stateCities.forEach(function (c) { addOption(citySel, c.id, c.name); });
            });
        }
    }

    /* ---------- email ---------- */
    function validateEmailField(input) {
        const emailError = getElement('emailError');
        const email = input.value.trim();

        if (email === '') {
            if (emailError) emailError.style.display = 'none';
            input.style.borderColor = '';
            QuiteisValidEmail = false;
        } else if (EMAIL_RE.test(email)) {
            if (emailError) emailError.style.display = 'none';
            input.style.borderColor = '';
            QuiteisValidEmail = true;
        } else {
            if (emailError) emailError.style.display = 'block';
            input.style.borderColor = 'red';
            QuiteisValidEmail = false;
        }
        QuoteIsValidationForm();
    }

    function QuoteIsValidationForm() {
        const info = document.querySelector('.addition--info');
        if (!info) return;
        info.style.display = QuiteisValidEmail ? 'block' : 'none';
        PPCardAction();
    }

    /* ---------- form read / persist / validate ---------- */
    function readContactForm() {
        const form = document.querySelector('#quote--contact');
        if (!form) return null;
        const val = function (n) {
            const el = form.querySelector('[name="' + n + '"]');
            return el ? String(el.value || '').trim() : '';
        };
        const selText = function (n) {
            const el = form.querySelector('[name="' + n + '"]');
            if (!el || !el.value) return '';
            const opt = el.options && el.options[el.selectedIndex];
            return opt ? opt.text : el.value;
        };
        return {
            first_name: val('first_name'),
            last_name: val('last_name'),
            email: val('quoteemail'),
            phone: val('phone'),
            company_name: val('company'),
            address: val('address'),
            zip: val('postal_code'),
            site: val('site'),
            message: val('message'),
            country: selText('country'),
            state: selText('state'),
            city: selText('city')
        };
    }

    /* =====================================================================
     * SHIPPING METHOD (Shopify shipping rates, customer na address par aadharit)
     * Optional: customer rate select na kare to merchant pachhi quote ma shipping nakhe chhe.
     * ===================================================================== */
    let ppShipState = { handle: '', rates: [], reason: 'need_address', loading: false, key: '' };
    let ppShipReq = 0;

    function ppMoney(amount, currency) {
        try {
            return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(amount);
        } catch (e) {
            return (currency || '') + ' ' + Number(amount).toFixed(2);
        }
    }

    function ppAddressForRates() {
        const form = document.querySelector('#quote--contact');
        if (!form) return null;
        const el = function (n) { return form.querySelector('[name="' + n + '"]'); };
        const text = function (n) {
            const e = el(n);
            if (!e || !e.value) return '';
            const o = e.options && e.options[e.selectedIndex];
            return o ? o.text : e.value;
        };
        const val = function (n) { const e = el(n); return e ? String(e.value || '').trim() : ''; };
        const code = function (v, max) {
            v = String(v || '').trim();
            return v && v.length <= max && /^[A-Za-z0-9-]+$/.test(v) ? v.toUpperCase() : '';
        };
        const c = countries.find(function (x) { return String(x.id) === val('country'); }) || {};
        const st = states.find(function (x) { return String(x.id) === val('state'); }) || {};
        return {
            country: text('country'),
            country_code: code(c.iso2 || c.iso_code, 2),
            state: text('state'),
            state_code: code(st.state_code || st.iso2, 3),
            city: text('city'),
            zip: val('postal_code'),
            address: val('address')
        };
    }

    function renderShippingRates() {
        const wrap = document.getElementById('ppShippingMethod');
        const box = document.getElementById('ppShippingRates');
        if (!wrap || !box) return;
        const st = ppShipState;

        if (st.reason === 'need_address' && !st.loading) {
            wrap.style.display = 'none';
            box.innerHTML = '';
            return;
        }
        wrap.style.display = '';

        if (st.loading) {
            box.innerHTML = '<p class="pp-ship-note">Loading shipping options...</p>';
            return;
        }
        if (!st.rates.length) {
            box.innerHTML = '<p class="pp-ship-note">No shipping options found for this address. The store will confirm shipping with your quote.</p>';
            return;
        }

        let h = '<div class="pp-ship-list" role="radiogroup">';
        st.rates.forEach(function (r, i) {
            const id = 'ppShipRate' + i;
            h += '<label class="pp-ship-option" for="' + id + '">';
            h += '<input type="radio" id="' + id + '" name="shipping_rate" value="' + esc(r.handle) + '"' + (r.handle === st.handle ? ' checked' : '') + '>';
            h += '<span class="pp-ship-title">' + esc(r.title) + '</span>';
            h += '<span class="pp-ship-price">' + esc(r.price > 0 ? ppMoney(r.price, r.currency) : 'Free') + '</span>';
            h += '</label>';
        });
        h += '</div>';
        h += '<p class="pp-ship-note">Estimated shipping. Final shipping is confirmed in your quote.</p>';
        box.innerHTML = h;
        box.querySelectorAll('input[name="shipping_rate"]').forEach(function (input) {
            input.addEventListener('change', function () { ppShipState.handle = this.value; });
        });
    }

    async function loadShippingRates() {
        if (!document.getElementById('ppShippingMethod')) return;
        const addr = ppAddressForRates();
        const items = (QuoteLineItem || [])
            .filter(function (i) { return i.shopify_variant_id; })
            .map(function (i) {
                return { shopify_variant_id: String(i.shopify_variant_id), quantity: Math.max(1, parseInt(i.quantity, 10) || 1) };
            });

        if (!addr || !addr.country || !addr.zip || !items.length) {
            ppShipReq++;
            ppShipState = { handle: '', rates: [], reason: 'need_address', loading: false, key: '' };
            renderShippingRates();
            return;
        }

        const key = JSON.stringify([addr, items]);
        if (key === ppShipState.key && !ppShipState.loading) { renderShippingRates(); return; }

        const req = ++ppShipReq;
        ppShipState = { handle: ppShipState.handle, rates: [], reason: null, loading: true, key: key };
        renderShippingRates();

        try {
            const res = await PPQuoteAPIcallFack('/shipping-rates', 'POST', QuoteJsonstringify({ items: items, address: addr }));
            if (req !== ppShipReq) return; // navo request aavi gayo
            const ok = res && res.success === true && res.data;
            const rates = ok && Array.isArray(res.data.rates) ? res.data.rates : [];
            const keep = rates.some(function (r) { return r.handle === ppShipState.handle; }) ? ppShipState.handle : '';
            ppShipState = { handle: keep, rates: rates, reason: ok ? (res.data.reason || null) : 'error', loading: false, key: key };
        } catch (e) {
            if (req !== ppShipReq) return;
            ppShipState = { handle: '', rates: [], reason: 'error', loading: false, key: '' };
        }
        renderShippingRates();
    }

    const scheduleShippingRates = debounce(loadShippingRates, 700);

    function maybeReloadShipping(e) {
        const name = e && e.target && e.target.name;
        if (['country', 'state', 'city', 'postal_code', 'address'].indexOf(name) !== -1) scheduleShippingRates();
    }

    function persistContactForm() {
        const f = readContactForm();
        if (!f || !getQuoteLocalData) return;
        const c = getQuoteLocalData.customer;
        ['first_name', 'last_name', 'email', 'phone', 'company_name', 'address', 'zip', 'site', 'message'].forEach(function (k) {
            c[k] = f[k];
        });
        // select khali hoy to pehla nu value na bhusvu
        ['country', 'state', 'city'].forEach(function (k) {
            if (f[k]) c[k] = f[k];
        });
        writeStore(getQuoteLocalData);
    }

    function showQuoteFormError(message) {
        const el = getElement('ppQuoteFormError');
        if (!el) return;
        el.textContent = message || '';
        el.style.display = message ? 'block' : 'none';
    }

    function showFormLoader(show) {
        const widget = getWidget();
        if (!widget) return;
        const wrapper = widget.querySelector('.quote-wrapper');
        const existing = widget.querySelector('.Quote--loader');
        if (show) {
            if (wrapper) wrapper.classList.add('requesting');
            if (!existing && wrapper) wrapper.insertAdjacentHTML('afterend', PPQuoteLoader());
        } else {
            if (existing) existing.remove();
            if (wrapper) wrapper.classList.remove('requesting');
        }
    }

    function submitQuote() {
        persistContactForm();
        const c = (getQuoteLocalData && getQuoteLocalData.customer) || {};

        if (!QuoteLineItem.length) {
            showQuoteFormError('Your quote is empty. Please add at least one product.');
            return;
        }
        if (!c.email || !EMAIL_RE.test(c.email)) {
            showQuoteFormError('Please enter a valid email address.');
            const el = getElement('quoteemail');
            if (el) { el.style.borderColor = 'red'; el.focus(); }
            return;
        }
        if (!c.first_name) {
            showQuoteFormError('Please enter your first name.');
            const el = getElement('first-name');
            if (el) el.focus();
            return;
        }
        showQuoteFormError('');
        showFormLoader(true);
        addQuoteFront();
    }

    /* ---------- submit to backend ---------- */
    function firstApiError(res) {
        if (res && res.errors && typeof res.errors === 'object') {
            const first = Object.keys(res.errors)[0];
            if (first) {
                const v = res.errors[first];
                return Array.isArray(v) ? v[0] : String(v);
            }
        }
        return (res && res.message) || 'Could not submit your request. Please try again.';
    }

    const addQuoteFront = async function () {
        try {
            const store = normalizeStore(getQuoteLocalData || readStore());
            const c = store.customer;

            let note = String(c.message || '');
            if (c.site) note += (note ? '\n' : '') + 'Site: ' + c.site;

            const payload = {
                shop: PPshop,
                customer: {
                    first_name: c.first_name || '',
                    last_name: c.last_name || null,
                    email: c.email || '',
                    phone: c.phone || null,
                    company_name: c.company_name || null,
                    address: c.address || null,
                    city: c.city || null,
                    state: c.state || null,
                    country: c.country || null,
                    zip: c.zip || null,
                    country_code: (ppAddressForRates() || {}).country_code || null,
                    state_code: (ppAddressForRates() || {}).state_code || null,
                    shopify_customer_id: getShopifyCustomerId()
                },
                shipping: ppShipState.handle ? { handle: ppShipState.handle } : null,
                items: store.items.map(function (i) {
                    return {
                        shopify_product_id: String(i.shopify_product_id),
                        shopify_variant_id: i.shopify_variant_id ? String(i.shopify_variant_id) : null,
                        product_title: i.product_title,
                        variant_title: i.variant_title || null,
                        sku: i.sku || null,
                        image_url: i.image_url || null,
                        quantity: Math.max(1, parseInt(i.quantity, 10) || 1),
                        original_price: Number(i.original_price) || 0,
                        customer_requested_price: i.customer_requested_price ? Number(i.customer_requested_price) : null
                    };
                }),
                note: note || null,
                source: VALID_SOURCES.indexOf(store.source) !== -1 ? store.source : null,
                field_values: store.field_values
            };

            const Response = await PPQuoteAPIcallFack('/quotes', 'POST', QuoteJsonstringify(payload));

            if (Response && Response.success === true) {
                store.items = [];
                writeStore(store); // header count pan 0 thase
                getQuoteLocalData = store;
                QuoteLineItem = store.items;

                showFormLoader(false);
                const done = document.querySelector('.request--submmited--section');
                if (done) done.classList.remove('request--hidden');
                const wrapper = document.querySelector('.quote-wrapper');
                if (wrapper) wrapper.classList.add('hidden--quote');
            } else {
                showFormLoader(false);
                showQuoteFormError(firstApiError(Response));
            }
        } catch (error) {
            console.error('Quote API Error:', error);
            showFormLoader(false);
            showQuoteFormError('Something went wrong. Please check your connection and try again.');
        }
    };

    /* ---------- card heights ---------- */
    function PPCardAction() {
        document.querySelectorAll('.quote-wrapper .q-card').forEach(function (card) {
            const accordion = card.querySelector('.Quote--accordion');
            if (!accordion) return;

            card._ppUpdate = function () {
                const isOpen = card.getAttribute('open') === 'true';
                const type = card.getAttribute('data-type');
                if (type !== 'contact') {
                    accordion.style.height = isOpen ? accordion.scrollHeight + 'px' : '0px';
                } else if (isOpen && QuiteisValidEmail) {
                    const info = card.querySelector('.addition--info');
                    const emailgroup = document.querySelector('.form-group.email-group');
                    accordion.style.height = ((info ? info.clientHeight : 0) + (emailgroup ? emailgroup.clientHeight : 0) + 88) + 'px';
                } else if (isOpen) {
                    accordion.style.height = 'auto';
                } else {
                    accordion.style.height = '0px';
                }
            };
            card._ppUpdate();

            // observers ek card par ek j var (pehla darek call par navo banto hato)
            if (!card.dataset.ppObserved) {
                card.dataset.ppObserved = '1';
                new MutationObserver(function () {
                    requestAnimationFrame(function () { if (card._ppUpdate) card._ppUpdate(); });
                }).observe(card, { attributes: true, attributeFilter: ['open'] });

                if (window.ResizeObserver) {
                    new ResizeObserver(function () { if (card._ppUpdate) card._ppUpdate(); }).observe(accordion);
                }
            }
        });
    }

    function QuotePriceClac() {
        let subtotal = 0;
        QuoteLineItem.forEach(function (item) {
            subtotal += (parseInt(item.quantity, 10) || 0) * (Number(item.original_price) || 0);
        });
        const sub = document.querySelector('.Quotesubtotal .amount');
        const tot = document.querySelector('.total .amount');
        if (sub) sub.textContent = formatMoney(subtotal);
        if (tot) tot.textContent = formatMoney(subtotal);
        const inner = document.querySelector('.totals-inner');
        if (inner) inner.classList.remove('loader-total');
    }

    /* ---------- HTML builders ---------- */
    function RequestMsgHtml() {
        let h = '<div class="request--submmited--section request--hidden">';
        h += '<div class="thankyou-page">';
        h += '<div class="bg-blob bg-blob--one"></div>';
        h += '<div class="bg-blob bg-blob--two"></div>';
        h += '<div class="bg-grid"></div>';
        h += '<div class="thankyou-container">';
        h += '<div class="thankyou-card">';
        h += '<div class="thankyou-success">';
        h += '<div class="success-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="check-path" d="M5 12.5l4.5 4.5L19 7.5"></path></svg></div>';
        h += '</div>';
        h += '<div class="thankyou-content">';
        h += '<span class="thankyou-label">Request Review</span>';
        h += '<h2>Quote Request Submitted</h2>';
        h += '<p class="thankyou-description">Your quote request has been received. Our team is reviewing it and will send you a detailed quotation at your email shortly.</p>';
        h += '</div>';
        h += '<div class="thankyou-actions">';
        h += '<a href="/collections/all" class="btn btn-primary">Continue Shopping</a>';
        h += '</div>';
        h += '</div>';
        h += '</div>';
        h += '</div>';
        h += '</div>';
        return h;
    }

    function PPQuoteProduct(Items) {
        let h = '';
        h += '<div class="section-heading">';
        h += '<div class="contact-number">1</div>';
        h += '<div>';
        h += '<h2>Product List</h2>';
        h += '<p>Review the products and quantities you have selected.</p>';
        h += '</div>';
        h += '</div>';
        h += '<div class="Quote--accordion is--open" id="quote--product">';
        h += '<div class="product-table">';
        h += '<div class="table-head">';
        h += '<div>Product</div>';
        h += '<div class="qty-head">Qty</div>';
        h += '<div></div>';
        h += '<div class="price-head">Total Price</div>';
        h += '</div>';

        Items.forEach(function (item, key) {
            const price = Number(item.original_price) || 0;
            const qty = parseInt(item.quantity, 10) || 1;
            h += '<div class="product-row" data-key="' + key + '" data-pid="' + esc(item.shopify_product_id) + '" data-vid="' + esc(item.shopify_variant_id) + '">';
            h += '<div class="product-info">';
            h += '<div class="product-image">';
            if (item.image_url) h += '<img src="' + esc(item.image_url) + '" alt="' + esc(item.product_title) + '">';
            h += '</div>';
            h += '<div class="product-content">';
            h += '<div class="product-name">' + esc(item.product_title) + '</div>';
            if (item.variant_title) {
                h += '<div class="product-meta"><strong>Variant:</strong> ' + esc(item.variant_title) + '</div>';
            }
            h += '<div class="product-meta">';
            h += '<strong>Price:</strong> ' + formatMoney(price);
            h += '</div>';
            if (item.sku) {
                h += '<div class="product-meta">';
                h += '<strong>SKU:</strong> ' + esc(item.sku);
                h += '</div>';
            }
            h += '</div>';
            h += '</div>';
            h += '<div class="mobile-product-controls">';
            h += '<div class="quantity-wrapper">';
            h += '<div class="quantity-control">';
            h += '<button type="button" class="ItemQtyBtn" data-btn="minus">−</button>';
            h += '<span class="quantity-value Quoteqty">' + qty + '</span>';
            h += '<button type="button" class="ItemQtyBtn" data-btn="plus">+</button>';
            h += '</div>';
            h += '</div>';
            h += '<div class="delete-wrapper">';
            h += '<button class="delete-btn" type="button" aria-label="Delete product">';
            h += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"></path><path d="M10 11v6"></path><path d="M14 11v6"></path><path d="M6 7l1 14h10l1-14"></path><path d="M9 7V4h6v3"></path></svg>';
            h += '</button>';
            h += '</div>';
            h += '</div>';
            h += '<div class="product-total">';
            h += formatMoney(qty * price);
            h += '</div>';
            h += '</div>';
        });

        h += '</div>';
        h += '</div>';
        return h;
    }

    function PPQuoteContact() {
        const chevronUp = '<svg class="accordion-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"></path></svg>';
        const chevronDown = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"></path></svg>';
        const userIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"></circle><path d="M4 21c0-4 3.5-7 8-7s8 3 8 7"></path></svg>';
        const mailIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"></rect><path d="m3 7 9 6 9-6"></path></svg>';

        let h = '';
        h += '<div class="section-heading">';
        h += '<div class="contact-number">2</div>';
        h += '<div>';
        h += '<h2>Contact Info</h2>';
        h += '<p>Tell us where to send your quote.</p>';
        h += '</div>';
        h += '</div>';

        h += '<div class="Quote--accordion" id="quote--contact">';

        /* email */
        h += '<div class="form-group email-group">';
        h += '<label for="quoteemail">Email address <span>*</span></label>';
        h += '<div class="input-icon-wrap">';
        h += mailIcon;
        h += '<input type="email" value="' + esc(cust('email')) + '" id="quoteemail" name="quoteemail" placeholder="example@gmail.com">';
        h += '</div>';
        h += '<span id="emailError" style="display:none; color:red;">Please enter a valid email address.</span>';
        h += '<p class="login-note">Login to auto-fill your registered information</p>';
        h += '</div>';

        h += '<div class="addition--info">';

        /* contact information */
        h += '<div class="form-accordion active">';
        h += '<button type="button" class="accordion-header" aria-expanded="true">';
        h += '<span>Contact Information</span>' + chevronUp;
        h += '</button>';
        h += '<div class="accordion-content">';

        h += '<div class="form-group">';
        h += '<label for="first-name">First name <span>*</span></label>';
        h += '<div class="input-icon-wrap">' + userIcon;
        h += '<input type="text" value="' + esc(cust('first_name')) + '" id="first-name" name="first_name" placeholder="Enter your first name">';
        h += '</div></div>';

        h += '<div class="form-group">';
        h += '<label for="last-name">Last name</label>';
        h += '<div class="input-icon-wrap">' + userIcon;
        h += '<input type="text" value="' + esc(cust('last_name')) + '" id="last-name" name="last_name" placeholder="Enter your last name">';
        h += '</div></div>';

        h += '<div class="form-group">';
        h += '<label for="phone">Phone number</label>';
        h += '<div class="phone-input">';
        h += '<input type="tel" value="' + esc(cust('phone')) + '" id="phone" name="phone" placeholder="Enter your phone number">';
        h += '</div></div>';

        h += '</div>';
        h += '</div>';

        /* shipping address */
        h += '<div class="form-accordion">';
        h += '<button type="button" class="accordion-header" aria-expanded="true">';
        h += '<span>Shipping address</span>' + chevronUp;
        h += '</button>';
        h += '<div class="accordion-content">';

        h += '<div class="form-group">';
        h += '<label for="country">Country/region</label>';
        h += '<div class="select-wrap">';
        h += '<select id="country" name="country"><option value="">Enter your country/region</option></select>';
        h += chevronDown;
        h += '</div></div>';

        h += '<div class="form-group">';
        h += '<label for="company">Company Name</label>';
        h += '<input type="text" value="' + esc(cust('company_name')) + '" id="company" name="company" placeholder="Enter your company name">';
        h += '</div>';

        h += '<div class="form-group">';
        h += '<label for="address">Address</label>';
        h += '<input type="text" value="' + esc(cust('address')) + '" id="address" name="address" placeholder="Enter your address">';
        h += '</div>';

        h += '<div class="form-group">';
        h += '<label for="state">State</label>';
        h += '<div class="select-wrap">';
        h += '<select id="state" name="state"><option value="">Enter your state</option></select>';
        h += chevronDown;
        h += '</div></div>';

        h += '<div class="form-group">';
        h += '<label for="city">City</label>';
        h += '<select id="city" name="city"><option value="">Enter your city</option></select>';
        h += '</div>';

        h += '<div class="form-group">';
        h += '<label for="postal-code">Postal Code</label>';
        h += '<input type="text" value="' + esc(cust('zip')) + '" id="postal-code" name="postal_code" placeholder="Enter your postal code">';
        h += '</div>';

        h += '</div>';
        h += '</div>';

        /* shipping method (Shopify rates; address bharya pachhi j dekhay chhe) */
        h += '<div class="form-accordion" id="ppShippingMethod" style="display:none">';
        h += '<button type="button" class="accordion-header" aria-expanded="true"><span>Shipping method</span>' + chevronUp + '</button>';
        h += '<div class="accordion-content"><div id="ppShippingRates"></div></div>';
        h += '</div>';

        /* note */
        h += '<div class="form-accordion">';
        h += '<button type="button" class="accordion-header" aria-expanded="true"><span>Note</span>' + chevronUp + '</button>';
        h += '<div class="accordion-content">';

        h += '<div class="form-group">';
        h += '<label for="site">Site</label>';
        h += '<input type="text" value="' + esc(cust('site')) + '" id="site" name="site" placeholder="Enter your site">';
        h += '</div>';

        h += '<div class="form-group">';
        h += '<label for="message">Message</label>';
        h += '<textarea id="message" name="message" placeholder="Message">' + esc(cust('message')) + '</textarea>';
        h += '</div>';

        h += '</div>';
        h += '</div>';

        h += '</div>'; // .addition--info
        h += '</div>'; // #quote--contact
        return h;
    }

    function PPQuoteTotal() {
        let subtotal = 0;
        QuoteLineItem.forEach(function (item) {
            subtotal += (parseInt(item.quantity, 10) || 0) * (Number(item.original_price) || 0);
        });
        let h = '<div class="totals-inner">';
        if (subtotal !== 0) {
            h += '<div class="total-row Quotesubtotal">';
            h += '<span>Subtotal</span>';
            h += '<span class="amount">' + formatMoney(subtotal) + '</span>';
            h += '</div>';
            h += '<div class="total-row total">';
            h += '<span>Total</span>';
            h += '<span class="amount">' + formatMoney(subtotal) + '</span>';
            h += '</div>';
        }
        h += '</div>';
        return h;
    }

    function PPQuoteAction() {
        const arrowRight = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"></path><path d="M13 6l6 6-6 6"></path></svg>';
        let h = '';
        h += '<button class="btn btn-outline pp-continue-shopping" type="button">';
        h += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"></path><path d="M12 19l-7-7 7-7"></path></svg>';
        h += 'Continue Shopping';
        h += '</button>';
        h += '<div class="QuoteStep">';
        h += '<button class="btn btn-primary ppQutebtn" data-key="prev" id="PPQuotePrevRequest" type="button">' + arrowRight + 'Prev: Product List</button>';
        h += '<button class="btn btn-primary ppQutebtn" data-key="next" id="PPQuoteNextRequest" type="button">Next: Contact Information' + arrowRight + '</button>';
        h += '<button class="btn btn-primary ppQutebtn" data-key="submit" id="PPQuoteSubmitRequest" type="button">Submit Request' + arrowRight + '</button>';
        h += '</div>';
        h += '<div class="pp-quote-error" id="ppQuoteFormError" role="alert" style="display:none;color:#d72c0d;margin-top:10px;width:100%;flex-basis:100%;"></div>';
        return h;
    }

    function fetchQuoteLcoalData() {
        PPQuoteWidget(readStore() || emptyStore());
    }

    /* =====================================================================
     * CROSS-TAB SYNC
     * ===================================================================== */
    window.addEventListener('storage', function (event) {
        if (event.key !== STORAGE_KEY) return;
        updateHeaderCount(); // bija tab ma count badlay
        let data = null;
        try { data = event.newValue ? JSON.parse(event.newValue) : null; } catch (e) { data = null; }
        getQuoteLocalData = normalizeStore(data);
        if (getWidget()) PPQuoteWidget(getQuoteLocalData);
    });

    /* =====================================================================
     * BOOT
     * ===================================================================== */
    function startObserver() {
        // header badhe page par joie, etle page-type check nathi (theme header re-render kare to icon pachho aave)
        const run = debounce(PPQuoteInjectButtons, 200);
        new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
    }

    function QuoteFetchData() {
        loadStoreSettings(); // badhe page par (hide price / hide add-to-cart global chhe)
        if (getWidget()) fetchQuoteLcoalData();
    }

    function boot() {
        if (!QuoteProLoad) return;
        QuoteProLoad = false;
        QuoteFetchData();
        injectHeaderIcon();
        updateHeaderCount();
        startObserver();
    }

    // flash na thay etle cached settings DOM ready pehla j apply
    (function earlyApply() {
        const cached = readSettingsCache();
        if (cached !== null && cached !== undefined) {
            storeSettings = normalizeSettings(cached);
            ensureDynamicCss();
            applyVisibilityClasses();
        }
    })();

    // pehla: readyState !== "loading" hoy tyare listener kyarey chalto nahoto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();