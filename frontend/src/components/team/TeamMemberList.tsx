import React from "react";
import {
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  Box,
  Text,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import { ChevronDownIcon, DeleteIcon, EditIcon } from "@chakra-ui/icons";
import { useQuery, useMutation, useQueryClient } from "react-query";
import { TeamMember, TeamMemberRole, removeTeamMember, getTeamMembers } from "../../services/teamService";
import ConfirmationDialog from "../common/ConfirmationDialog";

interface TeamMemberListProps {
  onEdit: (member: TeamMember) => void;
}

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

const TeamMemberList: React.FC<TeamMemberListProps> = ({ onEdit }) => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [memberToRemove, setMemberToRemove] = React.useState<TeamMember | null>(null);

  const { data: members = [], isLoading, error } = useQuery("teamMembers", getTeamMembers);

  const removeMutation = useMutation(removeTeamMember, {
    onSuccess: () => {
      toast({
        title: "Team member removed",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      queryClient.invalidateQueries("teamMembers");
      onClose();
    },
    onError: (err: any) => {
      toast({
        title: "Error removing team member",
        description: err.message || "An error occurred",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    },
  });

  const handleRemove = (member: TeamMember) => {
    setMemberToRemove(member);
    onOpen();
  };

  const confirmRemove = () => {
    if (memberToRemove) {
      removeMutation.mutate(memberToRemove.id);
    }
  };

  if (isLoading) {
    return <Text>Loading team members...</Text>;
  }

  if (error) {
    return (
      <Text color="red.500">
        Error loading team members: {(error as Error).message}
      </Text>
    );
  }

  return (
    <Box overflowX="auto">
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Email / Phone</Th>
            <Th>Role</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {members.length > 0 ? (
            members.map((member) => (
              <Tr key={member.id}>
                <Td>{member.name}</Td>
                <Td>{member.email || member.phone || "—"}</Td>
                <Td>
                  <Badge colorScheme={getRoleBadgeColor(member.role)}>
                    {member.role}
                  </Badge>
                </Td>
                <Td>
                  <Badge colorScheme={member.is_active ? "green" : "red"}>
                    {member.is_active ? "Active" : "Inactive"}
                  </Badge>
                </Td>
                <Td>
                  <Menu>
                    <MenuButton
                      as={IconButton}
                      aria-label="Options"
                      icon={<ChevronDownIcon />}
                      variant="outline"
                      size="sm"
                    />
                    <MenuList>
                      <MenuItem icon={<EditIcon />} onClick={() => onEdit(member)}>
                        Edit Role
                      </MenuItem>
                      <MenuItem
                        icon={<DeleteIcon />}
                        onClick={() => handleRemove(member)}
                        isDisabled={member.role === TeamMemberRole.OWNER}
                      >
                        Remove
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </Td>
              </Tr>
            ))
          ) : (
            <Tr>
              <Td colSpan={5} textAlign="center">
                No team members found
              </Td>
            </Tr>
          )}
        </Tbody>
      </Table>

      <ConfirmationDialog
        isOpen={isOpen}
        onClose={onClose}
        onConfirm={confirmRemove}
        title="Remove Team Member"
        message={`Are you sure you want to remove ${memberToRemove?.name} from the team? This action cannot be undone.`}
        confirmButtonText="Remove"
        isLoading={removeMutation.isLoading}
      />
    </Box>
  );
};

export default TeamMemberList;
