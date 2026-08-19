import React from 'react';
import { Frame, Navigation, TopBar } from '@shopify/polaris';
import { HomeIcon, CreditCardIcon, SettingsIcon } from '@shopify/polaris-icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { getShopFromUrl } from '../services/api';

/**
 * AppLayout
 *
 * Wraps every authenticated page in Polaris's <Frame> with a left-hand
 * navigation menu (Dashboard, Billing, Settings). Keeps the `shop` query
 * parameter intact across client-side navigations.
 */
export default function AppLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const shop = getShopFromUrl();

  const withShop = (path) => `${path}?shop=${encodeURIComponent(shop)}`;

  const navigationMarkup = (
    <Navigation location={location.pathname}>
      <Navigation.Section
        items={[
          {
            url: withShop('/dashboard'),
            label: 'Dashboard',
            icon: HomeIcon,
            selected: location.pathname === '/dashboard',
            onClick: (event) => {
              event.preventDefault();
              navigate(withShop('/dashboard'));
            },
          },
          {
            url: withShop('/quotelist'),
            label: 'Quote List',
            icon: CreditCardIcon,
            selected: location.pathname === '/quotelist',
            onClick: (event) => {
              event.preventDefault();
              navigate(withShop('/quotelist'));
            },
          },
          {
            url: withShop('/billing'),
            label: 'Billing',
            icon: CreditCardIcon,
            selected: location.pathname === '/billing',
            onClick: (event) => {
              event.preventDefault();
              navigate(withShop('/billing'));
            },
          },
          {
            url: withShop('/product-settings'),
            label: 'Product Settings',
            icon: SettingsIcon,
            selected: location.pathname === '/product-settings',
            onClick: (event) => {
              event.preventDefault();
              navigate(withShop('/product-settings'));
            },
          },
          {
            url: withShop('/settings'),
            label: 'Settings',
            icon: SettingsIcon,
            selected: location.pathname === '/settings',
            onClick: (event) => {
              event.preventDefault();
              navigate(withShop('/settings'));
            },
          },
        ]}
      />
    </Navigation>
  );

  const topBarMarkup = (
    <TopBar
      userMenu={
        <TopBar.UserMenu
          name={shop || 'Merchant'}
          initials={(shop || 'R').charAt(0).toUpperCase()}
          open={false}
          onToggle={() => {}}
        />
      }
    />
  );

  return (
    <Frame topBar={topBarMarkup} navigation={navigationMarkup}>
      {children}
    </Frame>
  );
}
