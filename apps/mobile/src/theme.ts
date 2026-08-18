/**
 * Mediterránea Face Studio — light "Sandy Serenity" theme.
 * Mirrors the web app's palette (apps/web/app/globals.css):
 *   sand surfaces + warm-brown ink + golden accents.
 */

import type { AppointmentStatus } from '@mediterranea/shared/types';

export const colors = {
  // Sand surfaces (lightest → deepest)
  bg: '#dbd5ce',
  surface: '#e4ded8',
  surfaceAlt: '#d1cbc5',
  card: '#eae5df',

  // Borders (warm-brown ink at low alpha)
  border: 'rgba(70,64,58,0.14)',
  borderStrong: 'rgba(70,64,58,0.28)',

  // Ink (warm-brown text)
  ink: '#46403a',
  inkSoft: 'rgba(70,64,58,0.72)',
  inkMuted: 'rgba(70,64,58,0.52)',
  inkFaint: 'rgba(70,64,58,0.34)',

  // Golden accent
  gold: '#b28f52',
  goldLight: '#c9a96e',
  goldDark: '#8f6f38',
  goldTint: 'rgba(178,143,82,0.12)',

  // Text on a filled gold surface
  onGold: '#2d2a26',

  // Feedback
  danger: '#a23b32',
  dangerTint: 'rgba(162,59,50,0.10)',
  success: '#2f7d5b',
  white: '#faf9f7',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
};

export interface StatusStyle {
  label: string;
  color: string;
  tint: string;
}

export const STATUS_STYLES: Record<AppointmentStatus, StatusStyle> = {
  pending: { label: 'Pending', color: '#9a6b17', tint: 'rgba(154,107,23,0.14)' },
  confirmed: { label: 'Confirmed', color: '#2f7d5b', tint: 'rgba(47,125,91,0.14)' },
  'checked-in': { label: 'Checked In', color: '#7a4fa3', tint: 'rgba(122,79,163,0.14)' },
  completed: { label: 'Completed', color: '#4a5d8a', tint: 'rgba(74,93,138,0.14)' },
  cancelled: { label: 'Cancelled', color: '#a23b32', tint: 'rgba(162,59,50,0.12)' },
  rejected: { label: 'Rejected', color: '#a23b32', tint: 'rgba(162,59,50,0.12)' },
  'no-show': { label: 'No Show', color: '#6b6b6b', tint: 'rgba(107,107,107,0.12)' },
};

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  'pending',
  'confirmed',
  'checked-in',
  'completed',
  'cancelled',
  'no-show',
];
