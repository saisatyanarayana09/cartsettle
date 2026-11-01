import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function DeliveryGuard({ children }) {
  const location = useLocation();

  const isDeliveryDomain = typeof window !== 'undefined' && (
    window.location.hostname.includes('delivery') ||
    window.location.hostname.startsWith('delivery.')
  );
  const loginPath = '/login';

  const token = localStorage.getItem('smart-kirana-delivery-token') || localStorage.getItem('smart-kirana-token');
  const userStr = localStorage.getItem('smart-kirana-delivery-user') || localStorage.getItem('smart-kirana-user');

  if (!token) {
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  try {
    const user = userStr ? JSON.parse(userStr) : null;
    const isPartner = Boolean(
      user?.is_delivery_partner || 
      user?.is_owner || 
      user?.is_staff || 
      user?.is_superuser
    );

    if (user && !isPartner) {
      return <Navigate to={loginPath} state={{ from: location }} replace />;
    }
  } catch {
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  return children;
}
