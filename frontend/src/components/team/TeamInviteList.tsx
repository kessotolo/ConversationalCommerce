import React from "react";
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  Box,
  Text,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { 
  TeamInvite, 
  TeamInviteStatus, 
  TeamMemberRole, 
  getTeamInvites, 
  revokeTeamInvite 
} from "../../services/teamService";
import ConfirmationDialog from "../common/ConfirmationDialog";

const getRoleBadgeColor = (role: TeamMemberRole): string => {
  switch (role) {
    case TeamMemberRole.OWNER:
      return "purple";
    case TeamMemberRole.ADMIN:
      return "red";
    case TeamMemberRole.MEMBER:
      return "blue";
    case TeamMemberRole.SUPPORT:
      return "green";
    case TeamMemberRole.VIEWER:
      return "gray";
    default:
      return "gray";
  }
};

const getStatusBadgeColor = (status: TeamInviteStatus): string => {
  switch (status) {
    case TeamInviteStatus.PENDING:
      return "yellow";
    case TeamInviteStatus.ACCEPTED:
      return "green";
    case TeamInviteStatus.DECLINED:
      return "red";
    case TeamInviteStatus.REVOKED:
      return "gray";
    case TeamInviteStatus.EXPIRED:
      return "orange";
    default:
      return "gray";
  }
};

const TeamInviteList: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [inviteToRevoke, setInviteToRevoke] = React.useState<TeamInvite | null>(null);

  const { data: invites = [], isLoading, error } = useQuery("teamInvites", getTeamInvites);

  const revokeMutation = useMutation(revokeTeamInvite, {
    onSuccess: () => {
      toast({
        title: "Invitation revoked",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      queryClient.invalidateQueries("teamInvites");
      onClose();
    },
    onError: (err: any) => {
      toast({
        title: "Error revoking invitation",
        description: err.message || "An error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const handleRevoke = (invite: TeamInvite) => {
    setInviteToRevoke(invite);
    onOpen();
  };

  const confirmRevoke = () => {
    if (inviteToRevoke) {
      revokeMutation.mutate(inviteToRevoke.id);
    }
  };

  if (isLoading) {
    return <Text>Loading team invitations...</Text>;
  }

  if (error) {
    return (
      <Text color="red.500">
        Error loading team invitations: {(error as Error).message}
      </Text>
    );
  }

  // Filter to show only pending invites
  const pendingInvites = invites.filter(invite => invite.status === TeamInviteStatus.PENDING);

  return (
    <Box overflowX="auto">
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Invitee</Th>
            <Th>Role</Th>
            <Th>Status</Th>
            <Th>Expiry</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {pendingInvites.length > 0 ? (
            pendingInvites.map((invite) => (
              <Tr key={invite.id}>
                <Td>{invite.invitee_email || invite.invitee_phone || "Unknown"}</Td>
                <Td>
                  <Badge colorScheme={getRoleBadgeColor(invite.role)}>
                    {invite.role}
                  </Badge>
                </Td>
                <Td>
                  <Badge colorScheme={getStatusBadgeColor(invite.status)}>
                    {invite.status}
                  </Badge>
                </Td>
                <Td>
                  {new Date(invite.expires_at).toLocaleDateString()}
                </Td>
                <Td>
                  <Button
                    size="sm"
                    colorScheme="red"
                    variant="outline"
                    onClick={() => handleRevoke(invite)}
                    isDisabled={invite.status !== TeamInviteStatus.PENDING}
                  >
                    Revoke
                  </Button>
                </Td>
              </Tr>
            ))
          ) : (
            <Tr>
              <Td colSpan={5} textAlign="center">
                No pending invitations
              </Td>
            </Tr>
          )}
        </Tbody>
      </Table>

      <ConfirmationDialog
        isOpen={isOpen}
        onClose={onClose}
        onConfirm={confirmRevoke}
        title="Revoke Invitation"
        message={`Are you sure you want to revoke the invitation sent to ${
          inviteToRevoke?.invitee_email || inviteToRevoke?.invitee_phone || "this person"
        }? This action cannot be undone.`}
        confirmButtonText="Revoke"
        isLoading={revokeMutation.isLoading}
      />
    </Box>
  );
};

export default TeamInviteList;
