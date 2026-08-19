import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getShopFromUrl } from '../services/api';

/**
 * AppBridgeNavMenu
 *
 * Renders the <ui-nav-menu> web component (provided by the App Bridge
 * script tag loaded in app.blade.php). This is invisible in the iframe -
 * App Bridge reads the <a> tags inside it and hoists them into Shopify
 * admin's OWN left sidebar (nested under this app's entry), replacing
 * the need for a custom in-iframe Polaris <Navigation>.
 *
 * The first <a> MUST have rel="home" - it marks the app's root/entry
 * point. Every href keeps the `shop` query param so a hard refresh (or
 * App Bridge falling back to a full navigation) still lands correctly.
 *
 * Clicks are also intercepted here to navigate via React Router directly,
 * so the SPA transitions instantly without a full iframe reload.
 */
export default function AppBridgeNavMenu() {
  const navigate = useNavigate();
  const shop = getShopFromUrl();

  const withShop = (path) => `${path}?shop=${encodeURIComponent(shop)}`;

  const links = [
    { path: '/dashboard', label: 'Dashboard', home: true },
    { path: '/quotelist', label: 'Quotes' },
    { path: '/product-settings', label: 'Product Settings' },
    { path: '/settings', label: 'Settings' },
    { path: '/billing', label: 'Billing' },
  ];

  const handleClick = (path) => (event) => {
    event.preventDefault();
    navigate(withShop(path));
  };

  return (
    <ui-nav-menu>
      {links.map((link) => (
        <a
          key={link.path}
          href={withShop(link.path)}
          rel={link.home ? 'home' : undefined}
          onClick={handleClick(link.path)}
        >
          {link.label}
        </a>
      ))}
    </ui-nav-menu>
  );
}
