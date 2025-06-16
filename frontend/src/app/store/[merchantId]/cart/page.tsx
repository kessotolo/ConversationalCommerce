'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { HttpPaymentService } from '@/modules/payment/services/PaymentService';
import { parsePhoneNumberFromString, CountryCode } from 'libphonenumber-js';

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
  details?: any;
}
interface CheckoutData {
  customer: CustomerInfo;
  address: ShippingAddress;
  payment: PaymentInfo;
}

interface CartItem {
  id: string;
  product_id: string;
  name: string;
  price_at_add: number;
  quantity: number;
  image_url: string | null;
  variant_id?: string | null;
}

const paymentService = new HttpPaymentService();

const countryList = [
  { code: 'KE', name: 'Kenya' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'US', name: 'United States' },
  // Add more as needed
];

// Step components (to be implemented)
function StepCustomerInfo(props: { data: CustomerInfo; onChange: (data: CustomerInfo) => void; onNext: () => void; }) {
  const { data, onChange, onNext } = props;
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [touched, setTouched] = useState<{ [k: string]: boolean }>({});
  const [local, setLocal] = useState<CustomerInfo>({ ...data });

  useEffect(() => { onChange(local); }, [local]);

  function validate() {
    const errs: { [k: string]: string } = {};
    if (!local['name']) errs['name'] = 'Name is required';
    if (!local['email']) errs['email'] = 'Email is required';
    if (!local['phone']) errs['phone'] = 'Phone is required';
    else {
      const phone = parsePhoneNumberFromString(local['phone'] || '', 'KE' as CountryCode);
      if (!phone || !phone.isValid()) errs['phone'] = 'Invalid phone number';
    }
    return errs;
  }
  useEffect(() => { setErrors(validate()); }, [local]);

  const handleBlur = (field: string) => setTouched((t) => ({ ...t, [field]: true }));
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setLocal((l) => ({ ...l, [e.target.name]: e.target.value }));

  return (
    <form className="flex flex-col gap-4">
      <input name="name" placeholder="Full Name" value={local['name'] || ''} onChange={handleChange} onBlur={() => handleBlur('name')} className="input" />
      {touched['name'] && errors['name'] && <span className="text-red-500 text-sm">{errors['name']}</span>}
      <input name="email" placeholder="Email" value={local['email'] || ''} onChange={handleChange} onBlur={() => handleBlur('email')} className="input" />
      {touched['email'] && errors['email'] && <span className="text-red-500 text-sm">{errors['email']}</span>}
      <input name="phone" placeholder="Phone" value={local['phone'] || ''} onChange={handleChange} onBlur={() => handleBlur('phone')} className="input" />
      {touched['phone'] && errors['phone'] && <span className="text-red-500 text-sm">{errors['phone']}</span>}
      <button type="button" className="btn-primary mt-4" disabled={Object.keys(errors).length > 0} onClick={onNext}>Next</button>
    </form>
  );
}

function StepShippingAddress(props: { data: ShippingAddress; onChange: (data: ShippingAddress) => void; onNext: () => void; onBack: () => void; }) {
  const { data, onChange, onNext, onBack } = props;
  const [errors, setErrors] = useState<{ [k: string]: string }>({});
  const [touched, setTouched] = useState<{ [k: string]: boolean }>({});
  const [local, setLocal] = useState<ShippingAddress>({ ...data });

  useEffect(() => { onChange(local); }, [local]);

  function validate() {
    const errs: { [k: string]: string } = {};
    if (!local['address']) errs['address'] = 'Address is required';
    if (!local['city']) errs['city'] = 'City is required';
    if (!local['country']) errs['country'] = 'Country is required';
    if (!local['postalCode']) errs['postalCode'] = 'Postal code is required';
    return errs;
  }
  useEffect(() => { setErrors(validate()); }, [local]);

  const handleBlur = (field: string) => setTouched((t) => ({ ...t, [field]: true }));
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setLocal((l) => ({ ...l, [e.target.name]: e.target.value }));

  return (
    <form className="flex flex-col gap-4">
      <input name="address" placeholder="Address" value={local['address'] || ''} onChange={handleChange} onBlur={() => handleBlur('address')} className="input" />
      {touched['address'] && errors['address'] && <span className="text-red-500 text-sm">{errors['address']}</span>}
      <input name="city" placeholder="City" value={local['city'] || ''} onChange={handleChange} onBlur={() => handleBlur('city')} className="input" />
      {touched['city'] && errors['city'] && <span className="text-red-500 text-sm">{errors['city']}</span>}
      <select name="country" value={local['country'] || ''} onChange={handleChange} onBlur={() => handleBlur('country')} className="input">
        <option value="">Select Country</option>
        {countryList.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
      </select>
      {touched['country'] && errors['country'] && <span className="text-red-500 text-sm">{errors['country']}</span>}
      <input name="postalCode" placeholder="Postal Code" value={local['postalCode'] || ''} onChange={handleChange} onBlur={() => handleBlur('postalCode')} className="input" />
      {touched['postalCode'] && errors['postalCode'] && <span className="text-red-500 text-sm">{errors['postalCode']}</span>}
      <div className="flex gap-2 mt-4">
        <button type="button" className="btn-secondary" onClick={onBack}>Back</button>
        <button type="button" className="btn-primary" disabled={Object.keys(errors).length > 0} onClick={onNext}>Next</button>
      </div>
    </form>
  );
}

function StepPaymentMethod(props: any) {
  return <div>Step 3: Payment Method (TODO)</div>;
}
function StepReviewConfirm(props: any) {
  return <div>Step 4: Review & Confirm (TODO)</div>;
}

export default function CartPage() {
  const params = useParams();
  const merchantId = (params as { merchantId: string }).merchantId;
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  // Add wizard state
  const [step, setStep] = useState(1);
  const [checkoutData, setCheckoutData] = useState<CheckoutData>({
    customer: {},
    address: {},
    payment: {},
  });
  const [enabledProviders, setEnabledProviders] = useState<string[]>([]);

  // TODO: Replace with real session/user/phone logic
  const session_id = typeof window !== 'undefined' ? localStorage.getItem('session_id') || '' : '';

  useEffect(() => {
    fetchCart();
    paymentService.getPaymentSettings(merchantId).then((res) => {
      if (res.success && res.data && res.data.providers) {
        setEnabledProviders(res.data.providers.filter((p) => p.enabled).map((p) => p.provider.toLowerCase()));
      }
    });
    // eslint-disable-next-line
  }, [merchantId]);

  async function fetchCart() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/cart?tenant_id=${merchantId}&session_id=${session_id}`,
      );
      if (!res.ok) throw new Error('Failed to fetch cart');
      setCart(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateQuantity(product_id: string, variant_id: string | null, quantity: number) {
    setUpdating(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/cart/update?tenant_id=${merchantId}&session_id=${session_id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id, quantity, variant_id }),
        },
      );
      if (!res.ok) throw new Error('Failed to update cart');
      setCart(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUpdating(false);
    }
  }

  async function removeItem(product_id: string, variant_id: string | null) {
    setUpdating(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/cart/remove?tenant_id=${merchantId}&session_id=${session_id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ product_id, variant_id }),
        },
      );
      if (!res.ok) throw new Error('Failed to remove item');
      setCart(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUpdating(false);
    }
  }

  async function clearCart() {
    setUpdating(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/v1/cart/clear?tenant_id=${merchantId}&session_id=${session_id}`,
        {
          method: 'POST',
        },
      );
      if (!res.ok) throw new Error('Failed to clear cart');
      setCart(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUpdating(false);
    }
  }

  // Navigation handlers
  const goToStep = (n: number) => setStep(n);
  const handleChange = <K extends keyof CheckoutData>(section: K, values: Partial<CheckoutData[K]>) => {
    setCheckoutData((prev) => ({ ...prev, [section]: { ...prev[section], ...values } }));
  };

  // Fix NEXT_PUBLIC_API_BASE access
  const API_BASE = process.env['NEXT_PUBLIC_API_BASE'] || '';

  if (loading) return <div className="p-8 text-center">Loading cart...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <h2 className="text-xl font-bold mb-2">Your cart is empty</h2>
        <p className="text-gray-500 mb-4">Browse products and add them to your cart.</p>
      </div>
    );
  }

  const subtotal = cart.items.reduce(
    (sum: number, item: CartItem) => sum + item.price_at_add * item.quantity,
    0,
  );

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
          data={checkoutData.customer}
          onChange={(values: any) => handleChange('customer', values)}
          onNext={() => goToStep(2)}
        />
      )}
      {step === 2 && (
        <StepShippingAddress
          data={checkoutData.address}
          onChange={(values: any) => handleChange('address', values)}
          onNext={() => goToStep(3)}
          onBack={() => goToStep(1)}
        />
      )}
      {step === 3 && (
        <StepPaymentMethod
          data={checkoutData.payment}
          onChange={(values: any) => handleChange('payment', values)}
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
