export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type AuthUser = {
  id: string;
  email: string;
  status: string;
  mfa_enabled: boolean;
};

export type UserOrganizationMembership = {
  organization_id: string;
  role: string;
};

export type MeResponse = {
  user: AuthUser;
  organizations: UserOrganizationMembership[];
};

export type SessionRecord = {
  id: string;
  ip_address?: string | null;
  user_agent?: string | null;
  expires_at: string;
  created_at: string;
  revoked_at?: string | null;
};

export type SessionsResponse = {
  sessions: SessionRecord[];
};

export type RoleRecord = {
  id: string;
  name: string;
  description?: string | null;
};

export type PermissionRecord = {
  id: string;
  code: string;
  description?: string | null;
};
