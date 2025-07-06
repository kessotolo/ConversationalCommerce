import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import type { Address } from "../../services/addressService";
import { deleteAddress, getUserAddresses, setDefaultAddress } from "../../services/addressService";
import AddressForm from "./AddressForm";

const AddressList: React.FC = () => {
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Mock addresses data for now
  const addresses: Address[] = [
    {
      id: "addr-1",
      tenant_id: "tenant-1",
      user_id: "user-1",
      nickname: "Home",
      recipient_name: "John Doe",
      street_address_1: "123 Main St",
      street_address_2: "Apt 4B",
      city: "New York",
      state: "NY",
      postal_code: "10001",
      country: "US",
      phone: "+1234567890",
      is_default: true,
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z"
    },
    {
      id: "addr-2",
      tenant_id: "tenant-1",
      user_id: "user-1",
      nickname: "Work",
      recipient_name: "John Doe",
      street_address_1: "456 Business Ave",
      street_address_2: "",
      city: "New York",
      state: "NY",
      postal_code: "10002",
      country: "US",
      phone: "",
      is_default: false,
      created_at: "2024-01-02T00:00:00Z",
      updated_at: "2024-01-02T00:00:00Z"
    }
  ];

  const handleDeleteClick = (address: Address) => {
    setSelectedAddress(address);
    setIsDeleteConfirmOpen(true);
  };

  const handleEditClick = (address: Address) => {
    setSelectedAddress(address);
    setIsEditOpen(true);
  };

  const handleSetDefault = async (address: Address) => {
    if (!address.is_default) {
      setIsLoading(true);
      try {
        await setDefaultAddress(address.id);
        // In a real app, you'd refresh the data here
      } catch (error) {
        console.error('Error setting default address:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const confirmDelete = async () => {
    if (selectedAddress) {
      setIsLoading(true);
      try {
        await deleteAddress(selectedAddress.id);
        setIsDeleteConfirmOpen(false);
        setSelectedAddress(null);
        // In a real app, you'd refresh the data here
      } catch (error) {
        console.error('Error deleting address:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Addresses</h1>
        <Button
          onClick={() => setIsAddOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add New Address
        </Button>
      </div>

      {(!addresses || addresses.length === 0) ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="mb-4">You haven't added any addresses yet.</p>
            <Button
              onClick={() => setIsAddOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Your First Address
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {addresses.map((address) => (
            <Card
              key={address.id}
              className={`relative ${address.is_default
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 bg-white"
                }`}
            >
              {address.is_default && (
                <Badge className="absolute top-2 right-2 bg-blue-100 text-blue-800">
                  Default
                </Badge>
              )}

              <CardContent className="p-4">
                <div className="space-y-1 mb-4">
                  <h3 className="font-semibold">{address.nickname}</h3>
                  <p>{address.recipient_name}</p>
                  <p>{address.street_address_1}</p>
                  {address.street_address_2 && (
                    <p>{address.street_address_2}</p>
                  )}
                  <p>
                    {address.city}, {address.state} {address.postal_code}
                  </p>
                  <p>{address.country}</p>
                  {address.phone && <p>Phone: {address.phone}</p>}
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditClick(address)}
                    className="flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteClick(address)}
                    className="text-red-600 border-red-600 hover:bg-red-50 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </Button>

                  {!address.is_default && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleSetDefault(address)}
                      disabled={isLoading}
                      className="text-blue-600 border-blue-600 hover:bg-blue-50 flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                      Set as Default
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Address Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Add New Address</h2>
                <button
                  onClick={() => setIsAddOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              <AddressForm
                isDefault={!addresses || addresses.length === 0}
                onSuccess={() => setIsAddOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Address Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Edit Address</h2>
                <button
                  onClick={() => setIsEditOpen(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="p-6">
              {selectedAddress && (
                <AddressForm
                  address={selectedAddress}
                  onSuccess={() => setIsEditOpen(false)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Delete Address</h2>
            </div>
            <div className="p-6">
              <p>
                Are you sure you want to delete the address{" "}
                <strong>{selectedAddress?.nickname}</strong>?
              </p>
            </div>
            <div className="p-6 border-t flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsDeleteConfirmOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={confirmDelete}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isLoading ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddressList;
