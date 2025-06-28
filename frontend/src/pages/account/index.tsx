'use client';

import Link from 'next/link';

export default function AccountMenuPage() {
  return (
    <div>
      <h1>My Account</h1>
      <ul className="space-y-2 list-disc pl-5">
        <li>
          <Link href="/account/orders">Orders</Link>
        </li>
        <li>
          <Link href="/account/address-book">Address Book</Link>
        </li>
        <li>
          <Link href="/account/payment-methods">Payment Methods</Link>
        </li>
        <li>
          <Link href="/account/notification-preferences">Notification Preferences</Link>
        </li>
        <li>
          <Link href="/account/security">Security</Link>
        </li>
      </ul>
    </div>
  );
}
