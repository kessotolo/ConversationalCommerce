import React from "react";
import {
  Box,
  VStack,
  Heading,
  FormControl,
  FormLabel,
  Switch,
  Divider,
  Text,
  Button,
  useToast,
  HStack,
  Checkbox,
  CheckboxGroup,
} from "@chakra-ui/react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  NotificationPreferences,
  NotificationConfig,
} from "../../services/notificationService";

const NotificationPreferencesForm: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery(
    "notificationPreferences",
    getNotificationPreferences
  );

  const updateMutation = useMutation(updateNotificationPreferences, {
    onSuccess: () => {
      toast({
        title: "Notification preferences saved",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      queryClient.invalidateQueries("notificationPreferences");
    },
    onError: (err: any) => {
      toast({
        title: "Error saving preferences",
        description: err.message || "An error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const handleToggleCategory = (
    category: keyof Omit<NotificationPreferences, "user_id" | "tenant_id">,
    enabled: boolean
  ) => {
    if (!preferences) return;

    // Create a copy of the category config and update enabled status
    const updatedCategoryConfig: NotificationConfig = {
      ...preferences[category],
      enabled: enabled,
    };

    // Create an update payload focusing only on the modified category
    const updatePayload = {
      [category]: updatedCategoryConfig,
    };

    updateMutation.mutate(updatePayload);
  };

  const handleToggleChannel = (
    category: keyof Omit<NotificationPreferences, "user_id" | "tenant_id">,
    channel: keyof NotificationConfig["channels"],
    enabled: boolean
  ) => {
    if (!preferences) return;

    // Create a copy of the category config
    const updatedCategoryConfig: NotificationConfig = { 
      ...preferences[category],
      channels: { 
        ...preferences[category].channels,
        [channel]: enabled 
      }
    };

    // Create an update payload focusing only on the modified category
    const updatePayload = {
      [category]: updatedCategoryConfig,
    };

    updateMutation.mutate(updatePayload);
  };

  const saveAllPreferences = () => {
    if (!preferences) return;

    const { user_id, tenant_id, ...preferencesData } = preferences;
    updateMutation.mutate(preferencesData);
  };

  if (isLoading) {
    return <Text>Loading notification preferences...</Text>;
  }

  if (!preferences) {
    return <Text>Failed to load notification preferences</Text>;
  }

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" bg="white" width="100%">
      <VStack spacing={6} align="stretch">
        <Heading size="md">Notification Preferences</Heading>
        <Text color="gray.600">
          Choose which notifications you'd like to receive and how you want to
          receive them.
        </Text>

        {/* Account Updates */}
        <Box borderWidth="1px" borderRadius="md" p={4}>
          <HStack justifyContent="space-between" mb={2}>
            <Heading size="sm">Account Updates</Heading>
            <Switch
              isChecked={preferences.account_updates.enabled}
              onChange={(e) =>
                handleToggleCategory("account_updates", e.target.checked)
              }
              colorScheme="blue"
            />
          </HStack>
          <Text fontSize="sm" mb={3} color="gray.600">
            Profile changes, password resets, and security alerts
          </Text>
          <Divider mb={3} />
          <CheckboxGroup>
            <VStack align="start" spacing={2}>
              <Checkbox
                isChecked={preferences.account_updates.channels.email}
                onChange={(e) =>
                  handleToggleChannel(
                    "account_updates",
                    "email",
                    e.target.checked
                  )
                }
                isDisabled={!preferences.account_updates.enabled}
              >
                Email
              </Checkbox>
              <Checkbox
                isChecked={preferences.account_updates.channels.sms}
                onChange={(e) =>
                  handleToggleChannel("account_updates", "sms", e.target.checked)
                }
                isDisabled={!preferences.account_updates.enabled}
              >
                SMS
              </Checkbox>
              <Checkbox
                isChecked={preferences.account_updates.channels.push}
                onChange={(e) =>
                  handleToggleChannel(
                    "account_updates",
                    "push",
                    e.target.checked
                  )
                }
                isDisabled={!preferences.account_updates.enabled}
              >
                Push Notifications
              </Checkbox>
              <Checkbox
                isChecked={preferences.account_updates.channels.in_app}
                onChange={(e) =>
                  handleToggleChannel(
                    "account_updates",
                    "in_app",
                    e.target.checked
                  )
                }
                isDisabled={!preferences.account_updates.enabled}
              >
                In-App
              </Checkbox>
            </VStack>
          </CheckboxGroup>
        </Box>

        {/* Order Updates */}
        <Box borderWidth="1px" borderRadius="md" p={4}>
          <HStack justifyContent="space-between" mb={2}>
            <Heading size="sm">Order Updates</Heading>
            <Switch
              isChecked={preferences.order_updates.enabled}
              onChange={(e) =>
                handleToggleCategory("order_updates", e.target.checked)
              }
              colorScheme="blue"
            />
          </HStack>
          <Text fontSize="sm" mb={3} color="gray.600">
            Order confirmations, shipping updates, and delivery notifications
          </Text>
          <Divider mb={3} />
          <CheckboxGroup>
            <VStack align="start" spacing={2}>
              <Checkbox
                isChecked={preferences.order_updates.channels.email}
                onChange={(e) =>
                  handleToggleChannel("order_updates", "email", e.target.checked)
                }
                isDisabled={!preferences.order_updates.enabled}
              >
                Email
              </Checkbox>
              <Checkbox
                isChecked={preferences.order_updates.channels.sms}
                onChange={(e) =>
                  handleToggleChannel("order_updates", "sms", e.target.checked)
                }
                isDisabled={!preferences.order_updates.enabled}
              >
                SMS
              </Checkbox>
              <Checkbox
                isChecked={preferences.order_updates.channels.push}
                onChange={(e) =>
                  handleToggleChannel("order_updates", "push", e.target.checked)
                }
                isDisabled={!preferences.order_updates.enabled}
              >
                Push Notifications
              </Checkbox>
              <Checkbox
                isChecked={preferences.order_updates.channels.in_app}
                onChange={(e) =>
                  handleToggleChannel(
                    "order_updates",
                    "in_app",
                    e.target.checked
                  )
                }
                isDisabled={!preferences.order_updates.enabled}
              >
                In-App
              </Checkbox>
            </VStack>
          </CheckboxGroup>
        </Box>

        {/* Marketing */}
        <Box borderWidth="1px" borderRadius="md" p={4}>
          <HStack justifyContent="space-between" mb={2}>
            <Heading size="sm">Marketing</Heading>
            <Switch
              isChecked={preferences.marketing.enabled}
              onChange={(e) =>
                handleToggleCategory("marketing", e.target.checked)
              }
              colorScheme="blue"
            />
          </HStack>
          <Text fontSize="sm" mb={3} color="gray.600">
            Promotions, new product announcements, and personalized recommendations
          </Text>
          <Divider mb={3} />
          <CheckboxGroup>
            <VStack align="start" spacing={2}>
              <Checkbox
                isChecked={preferences.marketing.channels.email}
                onChange={(e) =>
                  handleToggleChannel("marketing", "email", e.target.checked)
                }
                isDisabled={!preferences.marketing.enabled}
              >
                Email
              </Checkbox>
              <Checkbox
                isChecked={preferences.marketing.channels.sms}
                onChange={(e) =>
                  handleToggleChannel("marketing", "sms", e.target.checked)
                }
                isDisabled={!preferences.marketing.enabled}
              >
                SMS
              </Checkbox>
              <Checkbox
                isChecked={preferences.marketing.channels.push}
                onChange={(e) =>
                  handleToggleChannel("marketing", "push", e.target.checked)
                }
                isDisabled={!preferences.marketing.enabled}
              >
                Push Notifications
              </Checkbox>
              <Checkbox
                isChecked={preferences.marketing.channels.in_app}
                onChange={(e) =>
                  handleToggleChannel("marketing", "in_app", e.target.checked)
                }
                isDisabled={!preferences.marketing.enabled}
              >
                In-App
              </Checkbox>
            </VStack>
          </CheckboxGroup>
        </Box>

        {/* Security */}
        <Box borderWidth="1px" borderRadius="md" p={4}>
          <HStack justifyContent="space-between" mb={2}>
            <Heading size="sm">Security</Heading>
            <Switch
              isChecked={preferences.security.enabled}
              onChange={(e) =>
                handleToggleCategory("security", e.target.checked)
              }
              colorScheme="blue"
              // Security notifications shouldn't be disabled
              isDisabled={true}
              defaultChecked={true}
            />
          </HStack>
          <Text fontSize="sm" mb={3} color="gray.600">
            Login attempts, password changes, and security alerts (required)
          </Text>
          <Divider mb={3} />
          <CheckboxGroup>
            <VStack align="start" spacing={2}>
              <Checkbox
                isChecked={preferences.security.channels.email}
                onChange={(e) =>
                  handleToggleChannel("security", "email", e.target.checked)
                }
                // Email security notifications are required
                isDisabled={true}
                defaultChecked={true}
              >
                Email
              </Checkbox>
              <Checkbox
                isChecked={preferences.security.channels.sms}
                onChange={(e) =>
                  handleToggleChannel("security", "sms", e.target.checked)
                }
              >
                SMS
              </Checkbox>
              <Checkbox
                isChecked={preferences.security.channels.push}
                onChange={(e) =>
                  handleToggleChannel("security", "push", e.target.checked)
                }
              >
                Push Notifications
              </Checkbox>
              <Checkbox
                isChecked={preferences.security.channels.in_app}
                onChange={(e) =>
                  handleToggleChannel("security", "in_app", e.target.checked)
                }
              >
                In-App
              </Checkbox>
            </VStack>
          </CheckboxGroup>
        </Box>

        <Button
          mt={2}
          colorScheme="blue"
          type="button"
          onClick={saveAllPreferences}
          isLoading={updateMutation.isLoading}
          loadingText="Saving"
        >
          Save All Preferences
        </Button>
      </VStack>
    </Box>
  );
};

export default NotificationPreferencesForm;
