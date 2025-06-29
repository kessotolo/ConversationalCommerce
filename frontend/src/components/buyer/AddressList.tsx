import React, { useState } from "react";
import {
  Box,
  Button,
  VStack,
  Heading,
  Text,
  Flex,
  Badge,
  IconButton,
  HStack,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { AddIcon, EditIcon, DeleteIcon, StarIcon } from "@chakra-ui/icons";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { Address, deleteAddress, getUserAddresses, setDefaultAddress } from "../../services/addressService";
import AddressForm from "./AddressForm";

const AddressList: React.FC = () => {
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const { isOpen: isAddOpen, onOpen: onAddOpen, onClose: onAddClose } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: addresses, isLoading, error } = useQuery(
    "userAddresses",
    getUserAddresses
  );

  const deleteMutation = useMutation((id: string) => deleteAddress(id), {
    onSuccess: () => {
      toast({
        title: "Address deleted",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      queryClient.invalidateQueries("userAddresses");
      setIsDeleteConfirmOpen(false);
    },
    onError: (err: any) => {
      toast({
        title: "Error deleting address",
        description: err.message || "An error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const defaultMutation = useMutation((id: string) => setDefaultAddress(id), {
    onSuccess: () => {
      toast({
        title: "Default address updated",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      queryClient.invalidateQueries("userAddresses");
    },
    onError: (err: any) => {
      toast({
        title: "Error updating default address",
        description: err.message || "An error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const handleDeleteClick = (address: Address) => {
    setSelectedAddress(address);
    setIsDeleteConfirmOpen(true);
  };

  const handleEditClick = (address: Address) => {
    setSelectedAddress(address);
    onEditOpen();
  };

  const handleSetDefault = (address: Address) => {
    if (!address.is_default) {
      defaultMutation.mutate(address.id);
    }
  };

  const confirmDelete = () => {
    if (selectedAddress) {
      deleteMutation.mutate(selectedAddress.id);
    }
  };

  if (isLoading) {
    return (
      <Box textAlign="center" p={8}>
        <Spinner size="xl" />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert status="error">
        <AlertIcon />
        Error loading addresses: {(error as Error).message}
      </Alert>
    );
  }

  return (
    <Box p={4}>
      <Flex justifyContent="space-between" alignItems="center" mb={6}>
        <Heading size="lg">My Addresses</Heading>
        <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={onAddOpen}>
          Add New Address
        </Button>
      </Flex>

      {(!addresses || addresses.length === 0) ? (
        <Box p={6} textAlign="center" borderWidth="1px" borderRadius="lg">
          <Text mb={4}>You haven't added any addresses yet.</Text>
          <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={onAddOpen}>
            Add Your First Address
          </Button>
        </Box>
      ) : (
        <VStack spacing={4} align="stretch">
          {addresses.map((address) => (
            <Box
              key={address.id}
              p={4}
              borderWidth="1px"
              borderRadius="lg"
              borderColor={address.is_default ? "blue.500" : "gray.200"}
              bg={address.is_default ? "blue.50" : "white"}
              position="relative"
            >
              {address.is_default && (
                <Badge
                  position="absolute"
                  top={2}
                  right={2}
                  colorScheme="blue"
                  px={2}
                  py={1}
                  borderRadius="md"
                >
                  Default
                </Badge>
              )}

              <VStack align="start" spacing={1}>
                <HStack>
                  <Heading size="sm">{address.nickname}</Heading>
                </HStack>
                <Text>{address.recipient_name}</Text>
                <Text>{address.street_address_1}</Text>
                {address.street_address_2 && (
                  <Text>{address.street_address_2}</Text>
                )}
                <Text>
                  {address.city}, {address.state} {address.postal_code}
                </Text>
                <Text>{address.country}</Text>
                {address.phone && <Text>Phone: {address.phone}</Text>}
              </VStack>

              <HStack mt={4} spacing={2}>
                <IconButton
                  icon={<EditIcon />}
                  aria-label="Edit address"
                  size="sm"
                  variant="outline"
                  onClick={() => handleEditClick(address)}
                />
                <IconButton
                  icon={<DeleteIcon />}
                  aria-label="Delete address"
                  size="sm"
                  colorScheme="red"
                  variant="outline"
                  onClick={() => handleDeleteClick(address)}
                />
                {!address.is_default && (
                  <Button
                    leftIcon={<StarIcon />}
                    size="sm"
                    variant="outline"
                    colorScheme="blue"
                    onClick={() => handleSetDefault(address)}
                    isLoading={defaultMutation.isLoading}
                  >
                    Set as Default
                  </Button>
                )}
              </HStack>
            </Box>
          ))}
        </VStack>
      )}

      {/* Add Address Modal */}
      <Modal isOpen={isAddOpen} onClose={onAddClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Address</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <AddressForm
              isDefault={!addresses || addresses.length === 0}
              onSuccess={onAddClose}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Edit Address Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Address</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedAddress && (
              <AddressForm
                address={selectedAddress}
                onSuccess={onEditClose}
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteConfirmOpen} onClose={() => setIsDeleteConfirmOpen(false)}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Delete Address</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <Text>
              Are you sure you want to delete the address{" "}
              <strong>{selectedAddress?.nickname}</strong>?
            </Text>
          </ModalBody>
          <ModalFooter>
            <Button
              colorScheme="red"
              mr={3}
              onClick={confirmDelete}
              isLoading={deleteMutation.isLoading}
            >
              Delete
            </Button>
            <Button onClick={() => setIsDeleteConfirmOpen(false)}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default AddressList;
