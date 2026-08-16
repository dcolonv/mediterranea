/**
 * Backoffice capabilities for granular access control among admins. An admin's
 * `capabilities` array (on `admins/{email}`) restricts which sections they see.
 * When the array is unset/empty, the admin has FULL access (backward compatible).
 */
export const CAPABILITIES = [
  'calendar',
  'waitlist',
  'clients',
  'services',
  'staff',
  'rooms',
  'reviews',
  'giftcards',
  'blog',
  'campaigns',
  'reports',
  'settings',
  'team',
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export const CAPABILITY_LABELS: Record<Capability, string> = {
  calendar: 'Calendar & booking',
  waitlist: 'Waitlist',
  clients: 'Clients',
  services: 'Services',
  staff: 'Staff',
  rooms: 'Rooms',
  reviews: 'Reviews',
  giftcards: 'Gift cards',
  blog: 'Blog',
  campaigns: 'Campaigns',
  reports: 'Reports',
  settings: 'Settings',
  team: 'Team & access',
};

/** Full access when caps is null/undefined/empty; otherwise membership. */
export function hasCapability(caps: string[] | null | undefined, cap: Capability): boolean {
  if (!caps || caps.length === 0) return true;
  return caps.includes(cap);
}
