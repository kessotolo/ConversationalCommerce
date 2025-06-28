import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Alert,
  Divider,
  CircularProgress,
  Stack,
} from '@mui/material';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';

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
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Submit Bank Transfer Payment Proof
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {success ? (
          <Alert severity="success" sx={{ mb: 3 }}>
            Your payment proof has been submitted successfully! We'll confirm your payment shortly.
          </Alert>
        ) : (
          <>
            <Box sx={{ width: '100%' }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Payment Amount: {order.total_amount.currency} {order.total_amount.amount.toFixed(2)}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Bank Transfer Details
              </Typography>

              <Stack spacing={1} mt={1}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Bank Name
                  </Typography>
                  <Typography variant="body1">{bankDetails.bank_name || ''}</Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Account Name
                  </Typography>
                  <Typography variant="body1">{bankDetails.account_name || ''}</Typography>
                </Box>

                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Account Number
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {bankDetails.account_number || ''}
                  </Typography>
                </Box>

                {bankDetails.instructions && (
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Instructions
                    </Typography>
                    <Typography variant="body2">{bankDetails.instructions || ''}</Typography>
                  </Box>
                )}
              </Stack>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" gutterBottom>
              Payment Confirmation
            </Typography>

            <form onSubmit={handleSubmit(onSubmit)}>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 2 }}>
                <Box sx={{ width: '100%', gridColumn: 'span 12' }}>
                  <TextField
                    label="Payment Reference/Transaction ID"
                    fullWidth
                    margin="normal"
                    {...register('reference', { required: 'Payment reference is required' })}
                    error={!!errors.reference}
                    helperText={errors.reference?.message}
                  />
                </Box>

                <Box sx={{ width: '100%', gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                  <TextField
                    label="Transfer Date"
                    type="date"
                    fullWidth
                    margin="normal"
                    InputLabelProps={{ shrink: true }}
                    {...register('transfer_date', { required: 'Transfer date is required' })}
                    error={!!errors.transfer_date}
                    helperText={errors.transfer_date?.message}
                  />
                </Box>

                <Box sx={{ width: '100%', gridColumn: { xs: 'span 12', sm: 'span 6' } }}>
                  <TextField
                    label="Bank Used"
                    fullWidth
                    margin="normal"
                    {...register('bank_name')}
                    placeholder="Your bank name"
                  />
                </Box>

                <Box sx={{ width: '100%', gridColumn: 'span 12' }}>
                  <TextField
                    label="Additional Notes"
                    fullWidth
                    margin="normal"
                    multiline
                    rows={3}
                    {...register('notes')}
                  />
                </Box>

                <Box sx={{ width: '100%' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Upload Payment Screenshot (Optional)
                  </Typography>

                  <UploadButton onImageUploaded={handleImageUpload} label="Upload Screenshot" />

                  {uploadedImageUrl && (
                    <Box mt={2} textAlign="center">
                      <img
                        src={uploadedImageUrl}
                        alt="Payment screenshot"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '200px',
                          border: '1px solid #eee',
                          borderRadius: '4px',
                        }}
                      />
                    </Box>
                  )}
                </Box>
              </Box>

              <Box mt={3} display="flex" justifyContent="space-between">
                <Button variant="text" color="inherit" onClick={onCancel} disabled={loading}>
                  Cancel
                </Button>

                <Button type="submit" variant="contained" color="primary" disabled={loading}>
                  {loading ? <CircularProgress size={24} /> : 'Submit Payment Proof'}
                </Button>
              </Box>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BankTransferPaymentForm;
