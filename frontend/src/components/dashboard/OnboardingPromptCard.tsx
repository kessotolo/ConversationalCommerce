import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function OnboardingPromptCard() {
  const { tenant } = useTenant();
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  // Show if profile is incomplete (missing name, email, or WhatsApp)
  const incomplete = !tenant?.name || !tenant?.phone_number;
  if (!incomplete || dismissed) return null;

  return (
    <Card className="mb-4 bg-[#f7faf9] border-[#e6f0eb]">
      <CardContent className="flex items-center gap-4 py-4">
        <AlertCircle className="text-[#6C9A8B] h-6 w-6" />
        <div className="flex-1">
          <div className="font-semibold text-gray-900 mb-1">Complete your store setup</div>
          <div className="text-gray-600 text-sm">
            To unlock all features, please finish setting up your store profile.
          </div>
        </div>
        <Button size="sm" onClick={() => router.push('/store-setup')}>
          Set Up Now
        </Button>
        <button
          className="ml-2 text-gray-400 hover:text-gray-600"
          aria-label="Dismiss onboarding prompt"
          onClick={() => setDismissed(true)}
        >
          ×
        </button>
      </CardContent>
    </Card>
  );
}
