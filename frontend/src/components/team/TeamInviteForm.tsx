import React from "react";
import {
  FormControl,
  FormLabel,
  FormHelperText,
  Input,
  Select,
  Button,
  VStack,
  Box,
  useToast,
  Radio,
  RadioGroup,
  Stack,
} from "@chakra-ui/react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "react-query";
import {
  TeamMemberRole,
  createTeamInvite,
  CreateInviteRequest,
} from "../../services/teamService";

interface TeamInviteFormProps {
  onSuccess?: () => void;
}

interface InviteFormData {
  contactType: "email" | "phone";
  contactValue: string;
  role: TeamMemberRole;
  message?: string;
}

const TeamInviteForm: React.FC<TeamInviteFormProps> = ({ onSuccess }) => {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteFormData>({
    defaultValues: {
      contactType: "email",
      role: TeamMemberRole.MEMBER,
    },
  });

  const contactType = watch("contactType");
  const toast = useToast();
  const queryClient = useQueryClient();

  const inviteMutation = useMutation(createTeamInvite, {
    onSuccess: () => {
      toast({
        title: "Invitation sent",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      queryClient.invalidateQueries("teamInvites");
      reset();
      if (onSuccess) onSuccess();
    },
    onError: (err: any) => {
      toast({
        title: "Error sending invitation",
        description: err.message || "An error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const onSubmit = (data: InviteFormData) => {
    const inviteData: CreateInviteRequest = {
      role: data.role,
      message: data.message,
    };

    if (data.contactType === "email") {
      inviteData.email = data.contactValue;
    } else {
      inviteData.phone = data.contactValue;
    }

    inviteMutation.mutate(inviteData);
  };

  return (
    <Box p={4} borderWidth="1px" borderRadius="md" bg="white">
      <form onSubmit={handleSubmit(onSubmit)}>
        <VStack spacing={4} align="stretch">
          <FormControl as="fieldset">
            <FormLabel as="legend">Contact Method</FormLabel>
            <RadioGroup defaultValue="email">
              <Stack direction="row">
                <Radio 
                  value="email" 
                  {...register("contactType")}
                >
                  Email
                </Radio>
                <Radio 
                  value="phone" 
                  {...register("contactType")}
                >
                  Phone
                </Radio>
              </Stack>
            </RadioGroup>
          </FormControl>

          <FormControl isRequired isInvalid={!!errors.contactValue}>
            <FormLabel>
              {contactType === "email" ? "Email Address" : "Phone Number"}
            </FormLabel>
            <Input
              type={contactType === "email" ? "email" : "tel"}
              placeholder={
                contactType === "email" ? "colleague@example.com" : "+1234567890"
              }
              {...register("contactValue", {
                required: true,
                pattern:
                  contactType === "email"
                    ? /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
                    : /^\+?[0-9]{10,15}$/,
              })}
            />
            <FormHelperText>
              {contactType === "email"
                ? "Enter the team member's email address"
                : "Enter the team member's phone number"}
            </FormHelperText>
          </FormControl>

          <FormControl isRequired isInvalid={!!errors.role}>
            <FormLabel>Role</FormLabel>
            <Select {...register("role", { required: true })}>
              <option value={TeamMemberRole.MEMBER}>Member</option>
              <option value={TeamMemberRole.ADMIN}>Admin</option>
              <option value={TeamMemberRole.SUPPORT}>Support</option>
              <option value={TeamMemberRole.VIEWER}>Viewer</option>
            </Select>
            <FormHelperText>
              Select the role for this team member
            </FormHelperText>
          </FormControl>

          <FormControl isInvalid={!!errors.message}>
            <FormLabel>Personal Message</FormLabel>
            <Input
              placeholder="Optional message to include in the invitation"
              {...register("message")}
            />
            <FormHelperText>
              Add a personal note to the invitation
            </FormHelperText>
          </FormControl>

          <Button
            mt={4}
            colorScheme="blue"
            type="submit"
            isLoading={isSubmitting || inviteMutation.isLoading}
            loadingText="Sending"
          >
            Send Invitation
          </Button>
        </VStack>
      </form>
    </Box>
  );
};

export default TeamInviteForm;
