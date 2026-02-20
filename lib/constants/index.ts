import type { ServiceCategory } from '@/lib/types';

export const SERVICES_SEED = [
  {
    name: 'Deep Cleansing Facial',
    slug: 'deep-cleansing',
    description: 'A thorough facial treatment that deeply cleanses pores, removes impurities, and leaves your skin refreshed and radiant.',
    category: 'facial' as ServiceCategory,
    durationMinutes: 60,
    price: 85,
    displayOrder: 1,
  },
  {
    name: 'Hydration Therapy',
    slug: 'hydration-therapy',
    description: 'Intensive moisture treatment using premium serums and masks to restore your skin\'s natural hydration balance.',
    category: 'facial' as ServiceCategory,
    durationMinutes: 75,
    price: 110,
    displayOrder: 2,
  },
  {
    name: 'Anti-Aging Treatment',
    slug: 'anti-aging',
    description: 'Advanced treatment targeting fine lines and wrinkles, promoting collagen production for youthful, firm skin.',
    category: 'facial' as ServiceCategory,
    durationMinutes: 90,
    price: 150,
    displayOrder: 3,
  },
  {
    name: 'Chemical Peel',
    slug: 'chemical-peel',
    description: 'Professional-grade exfoliation treatment that reveals smoother, brighter skin by removing dead skin cells.',
    category: 'treatment' as ServiceCategory,
    durationMinutes: 45,
    price: 120,
    displayOrder: 4,
  },
  {
    name: 'Botox Treatment',
    slug: 'botox',
    description: 'Precision botulinum toxin injections to reduce dynamic wrinkles and achieve a naturally refreshed appearance.',
    category: 'treatment' as ServiceCategory,
    durationMinutes: 30,
    price: 250,
    displayOrder: 5,
  },
  {
    name: 'Hyaluronic Acid Filler',
    slug: 'hyaluronic-filler',
    description: 'Dermal filler treatment to restore volume, enhance facial contours, and smooth deep wrinkles.',
    category: 'treatment' as ServiceCategory,
    durationMinutes: 45,
    price: 350,
    displayOrder: 6,
  },
];

export const BUSINESS_HOURS = {
  monday: { open: '09:00', close: '18:00' },
  tuesday: { open: '09:00', close: '18:00' },
  wednesday: { open: '09:00', close: '18:00' },
  thursday: { open: '09:00', close: '18:00' },
  friday: { open: '09:00', close: '18:00' },
  saturday: { open: '10:00', close: '16:00' },
  sunday: null, // Closed
};

export const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
];

export const APPOINTMENT_STATUSES = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
} as const;

export const CONTACT_INFO = {
  address: 'Avenida Juan Sebastian Elcano, 143',
  city: 'El Palo, Malaga, Spain',
  phone: '+34 722 645 851',
  email: 'hello@mediterraneaskinlab.com',
};
