"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTenant } from "@/contexts/TenantContext";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import Image from 'next/image';

export default function StoreSetupPage() {
    const { tenant, isLoading: isTenantLoading } = useTenant();
    const router = useRouter();
    const [storeName, setStoreName] = useState("");
    const [storeEmail, setStoreEmail] = useState("");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [showWhatsapp, setShowWhatsapp] = useState(false);
    const [whatsapp, setWhatsapp] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // If tenant profile is already complete, redirect to dashboard
    useEffect(() => {
        if (!isTenantLoading && tenant) {
            if (tenant.name) {
                // If you want to check for profile completeness, add logic here
                // For now, only check for name (since email/whatsapp are not in Tenant type)
                // If you want to redirect if already set, uncomment below:
                // router.replace("/dashboard");
            }
            setStoreName(tenant.name || "");
            setPhoneNumber(tenant.phone_number || "");
            setWhatsapp(tenant.whatsapp_number || "");
        }
    }, [tenant, isTenantLoading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/tenants/by-subdomain/${tenant?.subdomain}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: storeName,
                    phone_number: phoneNumber,
                    whatsapp_number: showWhatsapp ? whatsapp : undefined,
                }),
            });
            if (!res.ok) throw new Error("Failed to save store info");
            router.replace("/dashboard");
        } catch (err) {
            setError((err as Error).message || "Failed to save store info");
        } finally {
            setLoading(false);
        }
    };

    if (isTenantLoading || !tenant) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#6C9A8B]" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f7faf9] px-4">
            <Card className="w-full max-w-md mx-auto">
                <CardHeader className="flex flex-col items-center">
                    <Image src="/logo.svg" alt="Logo" width={48} height={48} className="mb-2" />
                    <CardTitle className="text-2xl font-bold mb-1 text-center">Set Up Your Store</CardTitle>
                    <CardDescription className="text-gray-500 text-center mb-2">
                        Please provide your store details to complete your account setup.
                    </CardDescription>
                    <div className="w-full h-2 bg-gray-100 rounded-full mb-2">
                        <div className="h-2 bg-[#6C9A8B] rounded-full" style={{ width: '100%' }} />
                    </div>
                </CardHeader>
                <CardContent>
                    <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
                        <div>
                            <label className="block text-sm font-medium mb-1" htmlFor="storeName">
                                Store Name
                            </label>
                            <Input
                                id="storeName"
                                name="storeName"
                                type="text"
                                value={storeName}
                                onChange={(e) => setStoreName(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" htmlFor="storeEmail">
                                Store Email
                            </label>
                            <Input
                                id="storeEmail"
                                name="storeEmail"
                                type="email"
                                value={storeEmail}
                                onChange={(e) => setStoreEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" htmlFor="phoneNumber">
                                Phone Number (WhatsApp-enabled preferred)
                            </label>
                            <Input
                                id="phoneNumber"
                                name="phoneNumber"
                                type="tel"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                required
                                placeholder="+2348012345678"
                            />
                            <button
                                type="button"
                                className="text-xs text-[#6C9A8B] mt-1 underline"
                                onClick={() => setShowWhatsapp((v) => !v)}
                            >
                                {showWhatsapp ? "Use same number for WhatsApp" : "Use a different number for WhatsApp alerts?"}
                            </button>
                        </div>
                        {showWhatsapp && (
                            <div>
                                <label className="block text-sm font-medium mb-1" htmlFor="whatsapp">
                                    Alternate WhatsApp Number (optional)
                                </label>
                                <Input
                                    id="whatsapp"
                                    name="whatsapp"
                                    type="tel"
                                    value={whatsapp}
                                    onChange={(e) => setWhatsapp(e.target.value)}
                                    placeholder="+2348012345678"
                                />
                            </div>
                        )}
                        {error && <div className="text-red-600 text-sm text-center">{error}</div>}
                        <Button
                            type="submit"
                            className="w-full py-2 bg-[#6C9A8B] text-white rounded font-semibold mt-2 disabled:opacity-60"
                            disabled={loading}
                        >
                            {loading ? "Saving..." : "Save and Continue"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}