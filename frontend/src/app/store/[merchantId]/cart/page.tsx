'use client';

import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { useParams } from 'next/navigation';
import React, { useEffect, useState } from 'react';

import { HttpPaymentService } from '@/modules/payment/services/PaymentService';

import type { CountryCode } from 'libphonenumber-js';
import type { PaymentSettings } from '@/modules/payment/models/payment';
import type { Result } from '@/modules/core/models/base/result';
import { isSuccess } from '@/modules/core/models/base/result';

interface CustomerInfo {
  name?: string;
  email?: string;
  phone?: string;
}
interface ShippingAddress {
  address?: string;
  city?: string;
  country?: string;
  postalCode?: string;
}
interface PaymentInfo {
  provider?: string;
  details?: unknown;
}
interface CheckoutData {
  customer: CustomerInfo;
  address: ShippingAddress;
  payment: PaymentInfo;
}

// Define CartItem and Cart interfaces for type safety
interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  variantId?: string;
  variantName?: string;
  imageUrl?: string;
}

interface Cart {
  items: CartItem[];
  // Add other cart properties as needed
}

const paymentService = new HttpPaymentService();

const countryList = [
  { code: 'KE', name: 'Kenya' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'US', name: 'United States' },
  // Add more as needed
];

// Step components (to be implemented)
function StepCustomerInfo(props: {
  data: CustomerInfo;
  onChange: (data: CustomerInfo) => void;
  onNext: () => void;
}) {
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [touched, setTouched] = useState<{ [k: string]: boolean }>({});
  const [local, setLocal] = useState<CustomerInfo>({ ...props.data });

  useEffect(() => {
    props.onChange(local);
  }, [local]);

  function validate() {
    const errs: { [k: string]: string } = {};
    if (!local['name']) errs['name'] = 'Name is required';
    if (!local['email']) errs['email'] = 'Email is required';
    if (!local['phone']) errs['phone'] = 'Phone is required';
    else {
      const phone = parsePhoneNumberFromString(local['phone'] || '', 'KE' as CountryCode);
      if (!phone?.isValid()) errs['phone'] = 'Invalid phone number';
    }
    return errs;
  }
  useEffect(() => {
    setErrors(validate());
  }, [local]);

  const handleBlur = (field: string) => setTouched((t) => ({ ...t, [field]: true }));
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setLocal((l) => ({ ...l, [e.target['name']]: e.target['value'] }));

  return (
    <form className="flex flex-col gap-4">
      <input
        name="name"
        placeholder="Full Name"
        value={local['name'] || ''}
        onChange={handleChange}
        onBlur={() => handleBlur('name')}
        className="input"
      />
      {touched['name'] && errors['name'] && (
        <span className="text-red-500 text-sm">{errors['name']}</span>
      )}
      <input
        name="email"
        placeholder="Email"
        value={local['email'] || ''}
        onChange={handleChange}
        onBlur={() => handleBlur('email')}
        className="input"
      />
      {touched['email'] && errors['email'] && (
        <span className="text-red-500 text-sm">{errors['email']}</span>
      )}
      <input
        name="phone"
        placeholder="Phone"
        value={local['phone'] || ''}
        onChange={handleChange}
        onBlur={() => handleBlur('phone')}
        className="input"
      />
      {touched['phone'] && errors['phone'] && (
        <span className="text-red-500 text-sm">{errors['phone']}</span>
      )}
      <button
        type="button"
        className="btn-primary mt-4"
        disabled={Object.keys(errors).length > 0}
        onClick={props.onNext}
      >
        Next
      </button>
    </form>
  );
}

function StepShippingAddress(props: {
  data: ShippingAddress;
  onChange: (data: ShippingAddress) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [touched, setTouched] = useState<{ [k: string]: boolean }>({});
  const [local, setLocal] = useState<ShippingAddress>({ ...props.data });

  useEffect(() => {
    props.onChange(local);
  }, [local]);

  function validate() {
    const errs: { [k: string]: string } = {};
    if (!local['address']) errs['address'] = 'Address is required';
    if (!local['city']) errs['city'] = 'City is required';
    if (!local['country']) errs['country'] = 'Country is required';
    if (!local['postalCode']) errs['postalCode'] = 'Postal code is required';
    return errs;
  }
  useEffect(() => {
    setErrors(validate());
  }, [local]);

  const handleBlur = (field: string) => setTouched((t) => ({ ...t, [field]: true }));
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setLocal((l) => ({ ...l, [e.target['name']]: e.target['value'] }));

  return (
    <form className="flex flex-col gap-4">
      <input
        name="address"
        placeholder="Address"
        value={local['address'] || ''}
        onChange={handleChange}
        onBlur={() => handleBlur('address')}
        className="input"
      />
      {touched['address'] && errors['address'] && (
        <span className="text-red-500 text-sm">{errors['address']}</span>
      )}
      <input
        name="city"
        placeholder="City"
        value={local['city'] || ''}
        onChange={handleChange}
        onBlur={() => handleBlur('city')}
        className="input"
      />
      {touched['city'] && errors['city'] && (
        <span className="text-red-500 text-sm">{errors['city']}</span>
      )}
      <select
        name="country"
        value={local['country'] || ''}
        onChange={handleChange}
        onBlur={() => handleBlur('country')}
        className="input"
      >
        <option value="">Select Country</option>
        {countryList.map((c) => (
          <option key={c['code']} value={c['code']}>
            {c['name']}
          </option>
        ))}
      </select>
      {touched['country'] && errors['country'] && (
        <span className="text-red-500 text-sm">{errors['country']}</span>
      )}
      <input
        name="postalCode"
        placeholder="Postal Code"
        value={local['postalCode'] || ''}
        onChange={handleChange}
        onBlur={() => handleBlur('postalCode')}
        className="input"
      />
      {touched['postalCode'] && errors['postalCode'] && (
        <span className="text-red-500 text-sm">{errors['postalCode']}</span>
      )}
      <div className="flex gap-2 mt-4">
        <button type="button" className="btn-secondary" onClick={props.onBack}>
          Back
        </button>
        <button
          type="button"
          className="btn-primary"
          disabled={Object.keys(errors).length > 0}
          onClick={props.onNext}
        >
          Next
        </button>
      </div>
    </form>
  );
}

function StepPaymentMethod({
  onNext,
  onBack,
}: {
  data: PaymentInfo;
  onChange: (data: PaymentInfo) => void;
  onNext: () => void;
  onBack: () => void;
  enabledProviders: string[];
}) {
  return <div>Step 3: Payment Method (TODO)</div>;
}

function StepReviewConfirm({
  onEdit,
  onSubmit,
  onBack,
}: {
  data: CheckoutData;
  onEdit: (step: number) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  return <div>Step 4: Review & Confirm (TODO)</div>;
}

export default function CartPage() {
  const params = useParams();
  const { merchantId } = params as { merchantId: string };
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // Add wizard state
  const [step, setStep] = useState(1);
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    customer: {},
    address: {},
    payment: {},
  });
  const [enabledProviders, setEnabledProviders] = useState<string[]>([]);

  // TODO: Replace with real session/user/phone logic
  const sessionId = typeof window !== 'undefined' ? (localStorage.getItem('session_id') ?? '') : '';
  const apiBase = typeof process !== 'undefined' ? (process.env['NEXT_PUBLIC_API_BASE'] ?? '') : '';

  useEffect(() => {
    fetchCart();
    paymentService.getPaymentSettings(merchantId).then((res: Result<PaymentSettings, Error>) => {
      if (isSuccess(res) && Array.isArray(res.data.providers)) {
        setEnabledProviders(
          res.data.providers
            .filter((p) => p.enabled && typeof p.provider === 'string')
            .map((p) => p.provider.toLowerCase()),
        );
      }
    });
    // eslint-disable-next-line
  }, [merchantId]);

  async function fetchCart() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${apiBase}/api/v1/cart?tenant_id=${merchantId}&session_id=${sessionId}`,
      );
      if (!res.ok) throw new Error('Failed to fetch cart');
      const data: unknown = await res.json();
      if (
        typeof data === 'object' &&
        data !== null &&
        'items' in data &&
        Array.isArray((data as Record<string, unknown>)['items'])
      ) {
        setCart(data as Cart);
      } else {
        setCart({ items: [] });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  // Navigation handlers
  const goToStep = (n: number) => setStep(n);
  const handleChange = <K extends keyof CheckoutData>(
    section: K,
    values: Partial<CheckoutData[K]>,
  ) => {
    setCheckoutData((prev) => ({ ...prev, [section]: { ...prev[section], ...values } }));
  };

  if (loading) return <div className="p-8 text-center">Loading cart...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!cart?.['items'] || cart['items'].length === 0) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-4">Browse products and add them to your cart.</p>
      </div>
    );
  }

  // Render wizard
  return (
    <div className="max-w-md mx-auto p-4 bg-white rounded-lg shadow mt-4">
      <h1 className="text-2xl font-bold mb-4">Checkout</h1>
      <div className="mb-6 flex justify-between">
        <span className={step === 1 ? 'font-bold' : ''}>1. Customer Info</span>
        <span className={step === 2 ? 'font-bold' : ''}>2. Shipping</span>
        <span className={step === 3 ? 'font-bold' : ''}>3. Payment</span>
        <span className={step === 4 ? 'font-bold' : ''}>4. Review</span>
      </div>
      {step === 1 && (
        <StepCustomerInfo
          data={checkoutData['customer']}
          onChange={(values: CustomerInfo) => handleChange('customer', values)}
          onNext={() => goToStep(2)}
        />
      )}
      {step === 2 && (
        <StepShippingAddress
          data={checkoutData['address']}
          onChange={(values: ShippingAddress) => handleChange('address', values)}
          onNext={() => goToStep(3)}
          onBack={() => goToStep(1)}
        />
      )}
      {step === 3 && (
        <StepPaymentMethod
          data={checkoutData['payment']}
          onChange={(values: PaymentInfo) => handleChange('payment', values)}
          onNext={() => goToStep(4)}
          onBack={() => goToStep(2)}
          enabledProviders={enabledProviders}
        />
      )}
      {step === 4 && (
        <StepReviewConfirm
          data={checkoutData}
          onEdit={goToStep}
          onSubmit={() => { }}
          onBack={() => goToStep(3)}
        />
      )}
    </div>
  );
}
