import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getShopFromUrl } from '../services/api';
import { useAppEmbed } from '../context/AppEmbedContext';

export default function AppBridgeNavMenu() {
  const navigate = useNavigate();
  const shop = getShopFromUrl();
  const { locked } = useAppEmbed();

  const withShop = (path) => `${path}?shop=${encodeURIComponent(shop)}`;

  const links = [
    { path: '/dashboard', label: 'Dashboard', home: true },
    { path: '/quotelist', label: 'Quotes' },
    { path: '/settings', label: 'Settings' },
    { path: '/billing', label: 'Billing' },
  ];

  // App embed on na hoy tyare sudhi fakt Dashboard dekhay (baki menu items chhupai jay)
  const visibleLinks = locked ? links.filter((link) => link.home) : links;

  const handleClick = (path) => (event) => {
    event.preventDefault();
    navigate(withShop(path));
  };

  return (
    <ui-nav-menu>
      {visibleLinks.map((link) => (
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