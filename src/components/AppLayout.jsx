import React from 'react';
import { Frame } from '@shopify/polaris';

/**
 * AppLayout
 *
 * Wraps every authenticated page in Polaris's <Frame>. The left-hand
 * navigation is now handled by Shopify admin's own sidebar via
 * AppBridgeNavMenu (see App.jsx) - Frame is kept here only so Polaris
 * features that depend on it (Toast, Modal, ContextualSaveBar) still work.
 */
export default function AppLayout({ children }) {
  return <Frame>{children}</Frame>;
}
