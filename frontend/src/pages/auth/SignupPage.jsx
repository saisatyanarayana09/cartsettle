import React from 'react';
import { CustomerLoginPage } from './LoginPage';

export function CustomerSignupPage() {
  // Delegate to the unified 1-Tap Google authentication page
  return <CustomerLoginPage />;
}

export default CustomerSignupPage;
