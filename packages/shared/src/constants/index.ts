import type { ServiceCategory } from '../types';

export const SERVICES_SEED = [
  {
    name: 'Deep Cleansing Facial',
    nameEs: 'Limpieza Facial Profunda',
    slug: 'deep-cleansing',
    description: 'A thorough facial treatment that deeply cleanses pores, removes impurities, and leaves your skin refreshed and radiant.',
    descriptionEs: 'Un tratamiento facial completo que limpia los poros en profundidad, elimina impurezas y deja tu piel fresca y radiante.',
    category: 'facial' as ServiceCategory,
    durationMinutes: 60,
    price: 85,
    displayOrder: 1,
  },
  {
    name: 'Hydration Therapy',
    nameEs: 'Terapia de Hidratación',
    slug: 'hydration-therapy',
    description: 'Intensive moisture treatment using premium serums and masks to restore your skin\'s natural hydration balance.',
    descriptionEs: 'Tratamiento de hidratación intensiva con sérums y mascarillas premium para restaurar el equilibrio natural de tu piel.',
    category: 'facial' as ServiceCategory,
    durationMinutes: 75,
    price: 110,
    displayOrder: 2,
  },
  {
    name: 'Anti-Aging Treatment',
    nameEs: 'Tratamiento Antiedad',
    slug: 'anti-aging',
    description: 'Advanced treatment targeting fine lines and wrinkles, promoting collagen production for youthful, firm skin.',
    descriptionEs: 'Tratamiento avanzado que actúa sobre líneas finas y arrugas, estimulando la producción de colágeno para una piel joven y firme.',
    category: 'facial' as ServiceCategory,
    durationMinutes: 90,
    price: 150,
    displayOrder: 3,
  },
  {
    name: 'Chemical Peel',
    nameEs: 'Peeling Químico',
    slug: 'chemical-peel',
    description: 'Professional-grade exfoliation treatment that reveals smoother, brighter skin by removing dead skin cells.',
    descriptionEs: 'Tratamiento de exfoliación profesional que revela una piel más suave y luminosa al eliminar las células muertas.',
    category: 'treatment' as ServiceCategory,
    durationMinutes: 45,
    price: 120,
    displayOrder: 4,
  },
  {
    name: 'Botox Treatment',
    nameEs: 'Tratamiento con Bótox',
    slug: 'botox',
    description: 'Precision botulinum toxin injections to reduce dynamic wrinkles and achieve a naturally refreshed appearance.',
    descriptionEs: 'Aplicación precisa de toxina botulínica para reducir las arrugas de expresión y lograr un aspecto naturalmente renovado.',
    category: 'treatment' as ServiceCategory,
    durationMinutes: 30,
    price: 250,
    displayOrder: 5,
  },
  {
    name: 'Hyaluronic Acid Filler',
    nameEs: 'Relleno de Ácido Hialurónico',
    slug: 'hyaluronic-filler',
    description: 'Dermal filler treatment to restore volume, enhance facial contours, and smooth deep wrinkles.',
    descriptionEs: 'Tratamiento con relleno dérmico para restaurar volumen, realzar los contornos faciales y suavizar arrugas profundas.',
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
  'checked-in': { label: 'Checked In', color: 'bg-purple-100 text-purple-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800' },
  'no-show': { label: 'No Show', color: 'bg-gray-100 text-gray-800' },
} as const;

export const DEFAULT_STUDIO_SETTINGS = {
  businessHours: {
    monday: { open: '09:00', close: '18:00' },
    tuesday: { open: '09:00', close: '18:00' },
    wednesday: { open: '09:00', close: '18:00' },
    thursday: { open: '09:00', close: '18:00' },
    friday: { open: '09:00', close: '18:00' },
    saturday: { open: '10:00', close: '16:00' },
    sunday: null,
  },
  booking: {
    minLeadHours: 2,
    maxAdvanceDays: 60,
    slotIntervalMinutes: 30,
  },
  cancellation: {
    cutoffHours: 24,
    policyText:
      'Please give at least 24 hours’ notice to cancel or reschedule. Later changes may incur a fee.',
  },
} as const;

/** Bump when the consent/privacy terms materially change. */
export const CONSENT_VERSION = '2026-08-v1';

/** Prefilled message when a customer taps the WhatsApp contact link. */
export const WHATSAPP_MESSAGE = 'Hello, I need an appointment';

export const CONTACT_INFO = {
  address: 'Avenida Juan Sebastian Elcano, 143',
  city: 'El Palo, Malaga, Spain',
  phone: '+34 602 643 543',
  email: 'info@mediterraneafacestudio.com',
};
