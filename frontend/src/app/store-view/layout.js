import React from 'react';

export const metadata = {
  title: 'Storefront View | Conversational Commerce',
  description: 'View your storefront as your customers would see it',
};

export default function StoreViewLayout({ children }) {
  return (
    <div className="store-view-layout">
      {children}
    </div>
  );
}
