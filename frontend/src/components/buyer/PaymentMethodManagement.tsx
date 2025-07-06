import React, { useState } from "react";
import { CreditCard, Plus, Trash2, Edit, Shield } from "lucide-react";

// Mock services - replace with actual imports when available
const fetchPaymentMethods = async () => [
  { id: "1", type: "card", last4: "1234", brand: "visa", isDefault: true },
  { id: "2", type: "card", last4: "5678", brand: "mastercard", isDefault: false },
];

const deletePaymentMethod = async (id: string) => ({ success: true });
const setDefaultPaymentMethod = async (id: string) => ({ success: true });

interface PaymentMethod {
  id: string;
  type: string;
  last4: string;
  brand: string;
  isDefault: boolean;
}

const PaymentMethodManagement: React.FC = () => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isSettingDefault, setIsSettingDefault] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCard, setNewCard] = useState({
    number: "",
    expiry: "",
    cvv: "",
    name: "",
  });

  // Mock data loading
  React.useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const methods = await fetchPaymentMethods();
        setPaymentMethods(methods);
      } catch (error) {
        console.error("Error loading payment methods:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPaymentMethods();
  }, []);

  const showToast = (title: string, type: "success" | "error" = "success") => {
    alert(`${title}`);
  };

  const handleDeletePaymentMethod = async (id: string) => {
    setIsDeleting(id);
    try {
      await deletePaymentMethod(id);
      setPaymentMethods(methods => methods.filter(m => m.id !== id));
      showToast("Payment method deleted successfully", "success");
    } catch (error) {
      showToast("Failed to delete payment method", "error");
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    setIsSettingDefault(id);
    try {
      await setDefaultPaymentMethod(id);
      setPaymentMethods(methods =>
        methods.map(m => ({ ...m, isDefault: m.id === id }))
      );
      showToast("Default payment method updated", "success");
    } catch (error) {
      showToast("Failed to update default payment method", "error");
    } finally {
      setIsSettingDefault(null);
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();

    // Basic validation
    if (!newCard.number || !newCard.expiry || !newCard.cvv || !newCard.name) {
      showToast("Please fill in all fields", "error");
      return;
    }

    try {
      // Mock adding card
      const newMethod: PaymentMethod = {
        id: Date.now().toString(),
        type: "card",
        last4: newCard.number.slice(-4),
        brand: "visa", // Mock brand detection
        isDefault: paymentMethods.length === 0,
      };

      setPaymentMethods(methods => [...methods, newMethod]);
      setNewCard({ number: "", expiry: "", cvv: "", name: "" });
      setShowAddForm(false);
      showToast("Payment method added successfully", "success");
    } catch (error) {
      showToast("Failed to add payment method", "error");
    }
  };

  const getBrandIcon = (brand: string) => {
    switch (brand.toLowerCase()) {
      case "visa":
        return "💳";
      case "mastercard":
        return "💳";
      case "amex":
        return "💳";
      default:
        return "💳";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading payment methods...</span>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg border">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Methods
        </h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Card
        </button>
      </div>

      {paymentMethods.length === 0 ? (
        <div className="text-center py-8">
          <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No payment methods added yet</p>
          <p className="text-sm text-gray-400">Add a card to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paymentMethods.map((method) => (
            <div
              key={method.id}
              className={`p-4 border rounded-lg ${method.isDefault ? "border-blue-500 bg-blue-50" : "border-gray-200"
                }`}
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getBrandIcon(method.brand)}</span>
                  <div>
                    <p className="font-medium">
                      {method.brand.toUpperCase()} •••• {method.last4}
                    </p>
                    {method.isDefault && (
                      <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                        <Shield className="h-3 w-3" />
                        Default
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!method.isDefault && (
                    <button
                      onClick={() => handleSetDefault(method.id)}
                      disabled={isSettingDefault === method.id}
                      className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                    >
                      {isSettingDefault === method.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                      ) : (
                        "Set as Default"
                      )}
                    </button>
                  )}

                  <button
                    onClick={() => handleDeletePaymentMethod(method.id)}
                    disabled={isDeleting === method.id}
                    className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                  >
                    {isDeleting === method.id ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add New Card</h3>

            <form onSubmit={handleAddCard} className="space-y-4">
              <div>
                <label htmlFor="card-number" className="block text-sm font-medium text-gray-700">
                  Card Number
                </label>
                <input
                  id="card-number"
                  type="text"
                  placeholder="1234 5678 9012 3456"
                  value={newCard.number}
                  onChange={(e) => setNewCard(prev => ({ ...prev, number: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="expiry" className="block text-sm font-medium text-gray-700">
                    Expiry Date
                  </label>
                  <input
                    id="expiry"
                    type="text"
                    placeholder="MM/YY"
                    value={newCard.expiry}
                    onChange={(e) => setNewCard(prev => ({ ...prev, expiry: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="cvv" className="block text-sm font-medium text-gray-700">
                    CVV
                  </label>
                  <input
                    id="cvv"
                    type="text"
                    placeholder="123"
                    value={newCard.cvv}
                    onChange={(e) => setNewCard(prev => ({ ...prev, cvv: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="card-name" className="block text-sm font-medium text-gray-700">
                  Cardholder Name
                </label>
                <input
                  id="card-name"
                  type="text"
                  placeholder="John Doe"
                  value={newCard.name}
                  onChange={(e) => setNewCard(prev => ({ ...prev, name: e.target.value }))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add Card
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentMethodManagement;
