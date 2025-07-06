import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Loader2, CheckCircle, AlertCircle, Upload } from 'lucide-react';

import type { Order } from '@/modules/order/models/order';
import type { ManualPaymentProof, BankAccountDetails } from '@/modules/payment/models/payment';
import { HttpPaymentService } from '@/modules/payment/services/PaymentService';

import { UploadButton } from './UploadButton';

interface BankTransferPaymentFormProps {
  order: Order;
  bankDetails: BankAccountDetails;
  onSubmissionComplete: () => void;
  onCancel: () => void;
}

export const BankTransferPaymentForm: React.FC<BankTransferPaymentFormProps> = ({
  order,
  bankDetails,
  onSubmissionComplete,
  onCancel,
}) => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const defaultValues: ManualPaymentProof = {
    reference: '',
    transfer_date: new Date().toISOString().split('T')[0] || '',
    bank_name: bankDetails.bank_name || '',
    account_name: bankDetails.account_name || '',
    notes: '',
  };
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ManualPaymentProof>({ defaultValues });

  const paymentService = new HttpPaymentService();

  const handleImageUpload = (imageUrl: string) => {
    setUploadedImageUrl(imageUrl);
  };

  const onSubmit: SubmitHandler<ManualPaymentProof> = async (data) => {
    setLoading(true);
    setError(null);

    try {
      const proofWithImage: ManualPaymentProof = {
        ...data,
        ...(uploadedImageUrl ? { screenshot_url: uploadedImageUrl } : {}),
      };
      const result = await paymentService.submitManualPaymentProof(
        order.order_number,
        proofWithImage,
      );

      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          onSubmissionComplete();
        }, 2000);
      } else {
        setError(`Failed to submit payment proof: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (err: unknown) {
      setError(
        `Error submitting payment proof: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5" />
          <span>Submit Payment Proof</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Payment proof submitted successfully! Your order will be processed once we verify your payment.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Bank Details Display */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Bank Transfer Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Bank Name</Label>
                  <p className="font-medium">{bankDetails.bank_name}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Account Name</Label>
                  <p className="font-medium">{bankDetails.account_name}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Account Number</Label>
                  <p className="font-bold text-lg">{bankDetails.account_number}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-gray-600">Amount to Transfer</Label>
                  <p className="font-bold text-lg text-green-600">
                    ₦{order.total_amount.toLocaleString()}
                  </p>
                </div>
              </div>
              {bankDetails.instructions && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Instructions:</strong> {bankDetails.instructions}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <Separator />

            {/* Payment Proof Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reference">
                    Transfer Reference/Transaction ID <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="reference"
                    {...register('reference', { required: 'Transfer reference is required' })}
                    placeholder="Enter transaction reference"
                  />
                  {errors.reference && (
                    <p className="text-sm text-red-500">{errors.reference.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transfer_date">
                    Transfer Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="transfer_date"
                    type="date"
                    {...register('transfer_date', { required: 'Transfer date is required' })}
                  />
                  {errors.transfer_date && (
                    <p className="text-sm text-red-500">{errors.transfer_date.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank_name">Bank Name</Label>
                  <Input
                    id="bank_name"
                    {...register('bank_name')}
                    placeholder="Your bank name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account_name">Account Name</Label>
                  <Input
                    id="account_name"
                    {...register('account_name')}
                    placeholder="Your account name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  placeholder="Any additional information about the transfer"
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">
                    Upload Payment Screenshot (Optional)
                  </Label>
                  <p className="text-sm text-gray-600 mb-2">
                    Upload a screenshot of your transfer receipt for faster verification
                  </p>
                  <UploadButton onImageUploaded={handleImageUpload} label="Upload Screenshot" />
                </div>

                {uploadedImageUrl && (
                  <div className="text-center">
                    <img
                      src={uploadedImageUrl}
                      alt="Payment screenshot"
                      className="max-w-full max-h-48 border border-gray-200 rounded-lg mx-auto"
                    />
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-between pt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
                  Cancel
                </Button>

                <Button type="submit" disabled={loading} className="flex items-center space-x-2">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>Submit Payment Proof</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BankTransferPaymentForm;
