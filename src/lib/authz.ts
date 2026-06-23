import { Company } from '../types';

export const BOOTSTRAP_SUPER_ADMIN_EMAILS = ['israel.quinde@gmail.com'];

export type AppRole = 'super_admin' | 'company_admin' | 'company_staff';

export interface UserRoleRecord {
  email: string;
  firstName?: string;
  lastName?: string;
  role: AppRole;
  companyId?: string | null;
  status: 'active' | 'inactive';
  createdAt?: string;
  updatedAt?: string;
}

export function normalizeEmail(email?: string | null) {
  return (email || '').trim().toLowerCase();
}

export function isBootstrapSuperAdmin(email?: string | null, emailVerified?: boolean | null) {
  return Boolean(emailVerified && BOOTSTRAP_SUPER_ADMIN_EMAILS.includes(normalizeEmail(email)));
}

export function isActiveSuperAdminRole(role?: UserRoleRecord | null) {
  return role?.status === 'active' && role.role === 'super_admin';
}

export function isSuperAdminUser(
  email?: string | null,
  emailVerified?: boolean | null,
  role?: UserRoleRecord | null
) {
  return Boolean(emailVerified && (isBootstrapSuperAdmin(email, emailVerified) || isActiveSuperAdminRole(role)));
}

export function canAccessCompany(
  company: Company,
  email?: string | null,
  emailVerified?: boolean | null,
  role?: UserRoleRecord | null
) {
  const normalizedEmail = normalizeEmail(email);
  if (!emailVerified || !normalizedEmail || company.status !== 'active') return false;

  const hasCompanyRole =
    role?.status === 'active' &&
    role.companyId === company.id &&
    (role.role === 'company_admin' || role.role === 'company_staff');

  return hasCompanyRole;
}
