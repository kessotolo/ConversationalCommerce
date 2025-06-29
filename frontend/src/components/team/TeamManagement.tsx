import React, { useState } from "react";
import {
  Box,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Heading,
  Text,
  Flex,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Select,
  useToast,
  Divider,
} from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";
import { useMutation, useQueryClient } from "react-query";
import { TeamMember, TeamMemberRole, updateTeamMember } from "../../services/teamService";

// Import our modular components
import TeamMemberList from "./TeamMemberList";
import TeamInviteList from "./TeamInviteList";
import TeamInviteForm from "./TeamInviteForm";

interface EditRoleFormProps {
  member: TeamMember;
  onClose: () => void;
}

const EditRoleForm: React.FC<EditRoleFormProps> = ({ member, onClose }) => {
  const [role, setRole] = useState<TeamMemberRole>(member.role);
  const toast = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation(
    (data: { id: string; data: { role: TeamMemberRole } }) =>
      updateTeamMember(data.id, data.data),
    {
      onSuccess: () => {
        toast({
          title: "Role updated",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
        queryClient.invalidateQueries("teamMembers");
        onClose();
      },
      onError: (err: any) => {
        toast({
          title: "Error updating role",
          description: err.message || "An error occurred",
          status: "error",
          duration: 5000,
          isClosable: true,
        });
      },
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      id: member.id,
      data: { role },
    });
  };

  const canEditToOwner = member.role !== TeamMemberRole.OWNER;
  const canEditToAdmin = member.role !== TeamMemberRole.ADMIN;

  return (
    <form onSubmit={handleSubmit}>
      <FormControl isRequired>
        <FormLabel>Role</FormLabel>
        <Select
          value={role}
          onChange={(e) => setRole(e.target.value as TeamMemberRole)}
        >
          {canEditToOwner && <option value={TeamMemberRole.OWNER}>Owner</option>}
          {canEditToAdmin && <option value={TeamMemberRole.ADMIN}>Admin</option>}
          <option value={TeamMemberRole.MEMBER}>Member</option>
          <option value={TeamMemberRole.SUPPORT}>Support</option>
          <option value={TeamMemberRole.VIEWER}>Viewer</option>
        </Select>
      </FormControl>

      <Flex justifyContent="flex-end" mt={4}>
        <Button variant="outline" mr={3} onClick={onClose}>
          Cancel
        </Button>
        <Button
          colorScheme="blue"
          type="submit"
          isLoading={updateMutation.isLoading}
        >
          Save
        </Button>
      </Flex>
    </form>
  );
};

const TeamManagement: React.FC = () => {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const { isOpen: isInviteOpen, onOpen: onInviteOpen, onClose: onInviteClose } = useDisclosure();

  const handleEditMember = (member: TeamMember) => {
    setSelectedMember(member);
    onEditOpen();
  };

  return (
    <Box p={4}>
      <Heading as="h1" size="lg" mb={6}>
        Team Management
      </Heading>

      <Tabs variant="enclosed" colorScheme="blue">
        <TabList>
          <Tab>Team Members</Tab>
          <Tab>Pending Invitations</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <Flex justifyContent="space-between" alignItems="center" mb={4}>
              <Heading size="md">Team Members</Heading>
              <Button leftIcon={<AddIcon />} colorScheme="blue" onClick={onInviteOpen}>
                Invite New Member
              </Button>
            </Flex>
            <Text mb={4}>
              Manage your team members and their roles. Different roles have different
              permissions and access levels within the system.
            </Text>
            <Box mt={4}>
              <TeamMemberList onEdit={handleEditMember} />
            </Box>
          </TabPanel>

          <TabPanel>
            <Heading size="md" mb={4}>
              Pending Invitations
            </Heading>
            <Text mb={4}>
              View and manage pending team invitations. You can revoke invitations
              that have not yet been accepted.
            </Text>
            <Box mt={4}>
              <TeamInviteList />
            </Box>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Edit Member Role Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Team Member Role</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {selectedMember && (
              <EditRoleForm member={selectedMember} onClose={onEditClose} />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* Invite New Member Modal */}
      <Modal isOpen={isInviteOpen} onClose={onInviteClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Invite Team Member</ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <TeamInviteForm onSuccess={onInviteClose} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default TeamManagement;
