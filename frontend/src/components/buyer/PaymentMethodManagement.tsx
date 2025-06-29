import React, { useState } from "react";
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  Stack,
  Badge,
  IconButton,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  Select,
  Switch,
  FormHelperText,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import { DeleteIcon, EditIcon, AddIcon, StarIcon } from "@chakra-ui/icons";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "react-query";
import {
  PaymentMethod,
  getPaymentMethods,
  createPaymentMethod,
  updatePaymentMethod,
  deletePaymentMethod,
  setDefaultPaymentMethod,
  CreatePaymentMethodRequest,
  UpdatePaymentMethodRequest,
} from "../../services/paymentMethodService";

const PaymentMethodCard: React.FC<{
  paymentMethod: PaymentMethod;
  onEdit: (paymentMethod: PaymentMethod) => void;
  onDelete: (paymentMethod: PaymentMethod) => void;
  onSetDefault: (paymentMethod: PaymentMethod) => void;
}> = ({ paymentMethod, onEdit, onDelete, onSetDefault }) => {
  return (
    <Box
      p={4}
      borderWidth="1px"
      borderRadius="lg"
      boxShadow="sm"
      mb={4}
      position="relative"
      bg={paymentMethod.is_default ? "blue.50" : "white"}
    >
      <Flex justify="space-between" align="center">
        <Box>
          <Flex align="center" mb={2}>
            <Heading size="sm" mr={2}>
              {paymentMethod.display_name}
            </Heading>
            {paymentMethod.is_default && (
              <Badge colorScheme="blue">Default</Badge>
            )}
          </Flex>
          <Text fontSize="sm" color="gray.600">
            {paymentMethod.payment_type}
            {paymentMethod.card_brand && ` • ${paymentMethod.card_brand}`}
            {paymentMethod.last_four && ` •••• ${paymentMethod.last_four}`}
          </Text>
          {paymentMethod.expiry_month && paymentMethod.expiry_year && (
            <Text fontSize="sm" color="gray.600">
              Expires: {paymentMethod.expiry_month}/{paymentMethod.expiry_year}
            </Text>
          )}
        </Box>
        <Stack direction="row">
          {!paymentMethod.is_default && (
            <IconButton
              aria-label="Set as default"
              icon={<StarIcon />}
              size="sm"
              variant="outline"
              onClick={() => onSetDefault(paymentMethod)}
            />
          )}
          <IconButton
            aria-label="Edit payment method"
            icon={<EditIcon />}
            size="sm"
            onClick={() => onEdit(paymentMethod)}
          />
          <IconButton
            aria-label="Delete payment method"
            icon={<DeleteIcon />}
            size="sm"
            colorScheme="red"
            variant="outline"
            onClick={() => onDelete(paymentMethod)}
          />
        </Stack>
      </Flex>
    </Box>
  );
};

const PaymentMethodForm: React.FC<{
  isEdit: boolean;
  paymentMethod?: PaymentMethod;
  onSubmit: (data: CreatePaymentMethodRequest | UpdatePaymentMethodRequest) => void;
  isSubmitting: boolean;
}> = ({ isEdit, paymentMethod, onSubmit, isSubmitting }) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm({
    defaultValues: isEdit
      ? {
          display_name: paymentMethod?.display_name || "",
          is_default: paymentMethod?.is_default || false,
        }
      : {
          payment_type: "credit_card",
          display_name: "",
          provider_token: "",
          is_default: false,
        },
  });

  const watchPaymentType = watch("payment_type");

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack spacing={4}>
        {!isEdit && (
          <FormControl isRequired isInvalid={!!errors.payment_type}>
            <FormLabel>Payment Type</FormLabel>
            <Select {...register("payment_type", { required: true })}>
              <option value="credit_card">Credit Card</option>
              <option value="debit_card">Debit Card</option>
              <option value="bank_account">Bank Account</option>
              <option value="digital_wallet">Digital Wallet</option>
            </Select>
            <FormHelperText>Select the type of payment method</FormHelperText>
          </FormControl>
        )}

        <FormControl isRequired isInvalid={!!errors.display_name}>
          <FormLabel>Display Name</FormLabel>
          <Input
            {...register("display_name", { required: true })}
            placeholder="e.g. My Personal Card"
          />
          <FormHelperText>
            A friendly name to help you identify this payment method
          </FormHelperText>
        </FormControl>

        {!isEdit && watchPaymentType === "credit_card" && (
          <>
            <FormControl isRequired isInvalid={!!errors.provider_token}>
              <FormLabel>Card Details</FormLabel>
              <Input
                {...register("provider_token", { required: true })}
                placeholder="Secure token from payment provider"
              />
              <FormHelperText>
                This would normally be replaced with a secure card input form from your payment provider
              </FormHelperText>
            </FormControl>
          </>
        )}

        <FormControl display="flex" alignItems="center">
          <FormLabel htmlFor="is-default" mb="0">
            Set as default payment method?
          </FormLabel>
          <Switch id="is-default" {...register("is_default")} />
        </FormControl>
      </Stack>

      <Button
        mt={6}
        colorScheme="blue"
        type="submit"
        isLoading={isSubmitting}
        loadingText="Saving"
      >
        {isEdit ? "Update Payment Method" : "Add Payment Method"}
      </Button>
    </form>
  );
};

const PaymentMethodManagement: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);

  const { data: paymentMethods = [], isLoading, isError } = useQuery(
    "paymentMethods",
    getPaymentMethods
  );

  const createMutation = useMutation(createPaymentMethod, {
    onSuccess: () => {
      toast({
        title: "Payment method added",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      queryClient.invalidateQueries("paymentMethods");
      onAddClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error adding payment method",
        description: error.message || "Please try again",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const updateMutation = useMutation(
    ({ id, data }: { id: string; data: UpdatePaymentMethodRequest }) =>
      updatePaymentMethod(id, data),
    {
      onSuccess: () => {
        toast({
          title: "Payment method updated",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        queryClient.invalidateQueries("paymentMethods");
        onEditClose();
        setSelectedPaymentMethod(null);
      },
      onError: (error: any) => {
        toast({
          title: "Error updating payment method",
          description: error.message || "Please try again",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      },
    }
  );

  const deleteMutation = useMutation(deletePaymentMethod, {
    onSuccess: () => {
      toast({
        title: "Payment method deleted",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      queryClient.invalidateQueries("paymentMethods");
      onDeleteClose();
      setDeleteTargetId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting payment method",
        description: error.message || "Please try again",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const setDefaultMutation = useMutation(setDefaultPaymentMethod, {
    onSuccess: () => {
      toast({
        title: "Default payment method updated",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      queryClient.invalidateQueries("paymentMethods");
    },
    onError: (error: any) => {
      toast({
        title: "Error updating default payment method",
        description: error.message || "Please try again",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const handleAddSubmit = (data: CreatePaymentMethodRequest) => {
    createMutation.mutate(data);
  };

  const handleEditSubmit = (data: UpdatePaymentMethodRequest) => {
    if (selectedPaymentMethod) {
      updateMutation.mutate({ id: selectedPaymentMethod.id, data });
    }
  };

  const handleEdit = (paymentMethod: PaymentMethod) => {
    setSelectedPaymentMethod(paymentMethod);
    onEditOpen();
  };

  const handleDelete = (paymentMethod: PaymentMethod) => {
    setDeleteTargetId(paymentMethod.id);
    onDeleteOpen();
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
      deleteMutation.mutate(deleteTargetId);
    }
  };

  const handleSetDefault = (paymentMethod: PaymentMethod) => {
    setDefaultMutation.mutate(paymentMethod.id);
  };

  if (isLoading) {
    return (
      <Box p={4}>
        <Text>Loading payment methods...</Text>
      </Box>
    );
  }

  if (isError) {
    return (
      <Box p={4}>
        <Text color="red.500">Error loading payment methods</Text>
      </Box>
    );
  }

  return (
    <Box p={4}>
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="md">Payment Methods</Heading>
        <Button
          leftIcon={<AddIcon />}
          colorScheme="blue"
          onClick={onAddOpen}
        >
          Add New
        </Button>
      </Flex>

      {paymentMethods.length === 0 ? (
        <Box p={6} textAlign="center" borderWidth="1px" borderRadius="lg">
          <Text mb={4}>You don't have any saved payment methods yet.</Text>
          <Button
            leftIcon={<AddIcon />}
            colorScheme="blue"
            onClick={onAddOpen}
          >
            Add Your First Payment Method
          </Button>
        </Box>
      ) : (
        paymentMethods.map((method) => (
          <PaymentMethodCard
            key={method.id}
            paymentMethod={method}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSetDefault={handleSetDefault}
          />
        ))
      )}

      {/* Add Payment Method Modal */}
      <Modal isOpen={isAddOpen} onClose={onAddClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add Payment Method</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <PaymentMethodForm
              isEdit={false}
              onSubmit={handleAddSubmit}
              isSubmitting={createMutation.isLoading}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onAddClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Edit Payment Method Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Payment Method</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <PaymentMethodForm
              isEdit={true}
              paymentMethod={selectedPaymentMethod || undefined}
              onSubmit={handleEditSubmit}
              isSubmitting={updateMutation.isLoading}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Payment Method
            </AlertDialogHeader>
            <AlertDialogBody>
              Are you sure? This action cannot be undone.
            </AlertDialogBody>
            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button
                colorScheme="red"
                onClick={confirmDelete}
                ml={3}
                isLoading={deleteMutation.isLoading}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
};

export default PaymentMethodManagement;
