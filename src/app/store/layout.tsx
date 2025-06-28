import React from 'react';
import type { ReactNode } from 'react';

export default function StoreLayout({ children }: { children: ReactNode }): JSX.Element {
    return <div className="store-layout">{children}</div>;
}