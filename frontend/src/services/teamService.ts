import axios from 'axios';
import { API_BASE_URL } from '../config';

export enum TeamMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  SUPPORT = 'support',
  VIEWER = 'viewer'
}

export enum TeamInviteStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  REVOKED = 'revoked',
  EXPIRED = 'expired'
}

export interface TeamMember {
  id: string;
  tenant_id: string;
  user_id: string;
  role: TeamMemberRole;
  name: string;
  email?: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamInvite {
  id: string;
  tenant_id: string;
  inviter_id: string;
  invitee_email?: string;
  invitee_phone?: string;
  role: TeamMemberRole;
  status: TeamInviteStatus;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateInviteRequest {
  email?: string;
  phone?: string;
  role: TeamMemberRole;
  message?: string;
}

export interface UpdateTeamMemberRequest {
  role?: TeamMemberRole;
  is_active?: boolean;
}

// Get all team members
export const getTeamMembers = async (): Promise<TeamMember[]> => {
  const response = await axios.get(`${API_BASE_URL}/v1/team/members`);
  return response.data;
};

// Get a specific team member
export const getTeamMember = async (id: string): Promise<TeamMember> => {
  const response = await axios.get(`${API_BASE_URL}/v1/team/members/${id}`);
  return response.data;
};

// Update a team member's role or status
export const updateTeamMember = async (
  id: string,
  data: UpdateTeamMemberRequest
): Promise<TeamMember> => {
  const response = await axios.patch(`${API_BASE_URL}/v1/team/members/${id}`, data);
  return response.data;
};

// Remove a team member
export const removeTeamMember = async (id: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/v1/team/members/${id}`);
};

// Get all team invitations
export const getTeamInvites = async (): Promise<TeamInvite[]> => {
  const response = await axios.get(`${API_BASE_URL}/v1/team/invites`);
  return response.data;
};

// Create a new team invitation
export const createTeamInvite = async (data: CreateInviteRequest): Promise<TeamInvite> => {
  const response = await axios.post(`${API_BASE_URL}/v1/team/invites`, data);
  return response.data;
};

// Revoke a team invitation
export const revokeTeamInvite = async (id: string): Promise<void> => {
  await axios.post(`${API_BASE_URL}/v1/team/invites/${id}/revoke`);
};

// Accept a team invitation (for the invitee)
export const acceptTeamInvite = async (id: string): Promise<TeamMember> => {
  const response = await axios.post(`${API_BASE_URL}/v1/team/invites/${id}/accept`);
  return response.data;
};

// Decline a team invitation (for the invitee)
export const declineTeamInvite = async (id: string): Promise<void> => {
  await axios.post(`${API_BASE_URL}/v1/team/invites/${id}/decline`);
};

// Get my pending invites (for the invitee)
export const getMyInvites = async (): Promise<TeamInvite[]> => {
  const response = await axios.get(`${API_BASE_URL}/v1/team/invites/me`);
  return response.data;
};
