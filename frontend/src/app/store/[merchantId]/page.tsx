import ClientStore from '@/components/store/ClientStore';

// This is a Next.js App Router server component
export default function StorePage({ 
  params 
}: { 
  params: { merchantId: string } 
}) {
  // Pass merchant ID to the client component wrapper
  return (
    <ClientStore merchantId={params.merchantId} />
  );
}
