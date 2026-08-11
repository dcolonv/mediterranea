import type { Timestamp } from 'firebase/firestore';

export type ServiceCategory = 'facial' | 'treatment';

export interface Service {
  id: string;
  name: string;
  /** Optional Spanish name; falls back to `name` when unset. */
  nameEs?: string;
  slug: string;
  description: string;
  /** Optional Spanish description; falls back to `description` when unset. */
  descriptionEs?: string;
  category: ServiceCategory;
  durationMinutes: number;
  price: number;
  isActive: boolean;
  displayOrder: number;
  /** Room type this treatment requires; when unset, any active room qualifies. */
  roomType?: string;
  createdAt: Timestamp;
}

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface DayHours {
  open: string; // 'HH:MM'
  close: string; // 'HH:MM'
}

/** Per-weekday working hours; a null/absent day means not working. */
export type WorkingHours = Partial<Record<Weekday, DayHours | null>>;

export interface TimeOff {
  date: string; // 'YYYY-MM-DD'
  start?: string; // 'HH:MM' — omit for a full day off
  end?: string; // 'HH:MM'
  reason?: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  active: boolean;
  /** Service ids this staff member is qualified to perform. */
  serviceIds: string[];
  workingHours: WorkingHours;
  timeOff?: TimeOff[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Room {
  id: string;
  name: string;
  /** Free-form room type matched against Service.roomType. */
  type: string;
  isActive: boolean;
  createdAt: Timestamp;
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'checked-in'
  | 'completed'
  | 'cancelled'
  | 'no-show';

export interface Appointment {
  id: string;
  serviceId: string;
  serviceName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  /** Link to the Customer record (backfilled via migration). */
  customerId?: string;
  /** Assigned practitioner and room (used by the availability engine). */
  staffId?: string;
  roomId?: string;
  /** How the appointment was created. */
  source?: 'online' | 'walk-in' | 'agent';
  appointmentDate: string;
  appointmentTime: string;
  durationMinutes: number;
  notes: string;
  status: AppointmentStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SkinProfile {
  /** e.g. 'normal' | 'dry' | 'oily' | 'combination' | 'sensitive'. */
  skinType?: string;
  /** Concerns e.g. 'acne', 'aging', 'pigmentation'. */
  concerns?: string[];
  /** Free-form preferences, allergies, or sensitivities. */
  preferences?: string;
}

/** Medical/consultation intake captured from the customer. */
export interface IntakeForm {
  allergies?: string;
  medications?: string;
  conditions?: string;
  notes?: string;
  updatedAt?: Timestamp;
}

/** Record of the customer's consent, with version + timestamp for GDPR. */
export interface ConsentRecord {
  /** Consent to treatment and the processing of their data. */
  treatmentConsent: boolean;
  /** Opt-in to marketing communications. */
  marketingOptIn: boolean;
  /** Typed name acting as a signature. */
  signedName?: string;
  /** Policy version the customer agreed to. */
  version: string;
  consentedAt?: Timestamp;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  /** Free-form admin notes about the customer. */
  notes: string;
  /** Optional labels e.g. "VIP", "new". */
  tags: string[];
  /** Firebase Auth uid, set when the customer creates an account. */
  uid?: string;
  /** Customer-provided skin profile (captured via their account). */
  skinProfile?: SkinProfile;
  /** Medical/consultation intake. */
  intake?: IntakeForm;
  /** Consent record (treatment + marketing), versioned for GDPR. */
  consent?: ConsentRecord;
  /** Denormalized rollups maintained from appointments. */
  totalVisits: number;
  /** appointmentDate (YYYY-MM-DD) of the most recent appointment, or null. */
  lastVisitDate: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface BookingRules {
  /** Earliest a slot can be booked, in hours from now. */
  minLeadHours: number;
  /** Furthest ahead a slot can be booked, in days from today. */
  maxAdvanceDays: number;
  /** Granularity of the bookable time grid, in minutes. */
  slotIntervalMinutes: number;
}

export interface CancellationPolicy {
  /** Customers may self-cancel up to this many hours before the appointment. */
  cutoffHours: number;
  /** Policy text shown to customers at booking. */
  policyText: string;
}

export interface StudioSettings {
  businessHours: WorkingHours;
  booking: BookingRules;
  cancellation: CancellationPolicy;
  updatedAt?: Timestamp;
}

export interface RecipeStep {
  text: string;
  /** Optional time for this step, in minutes. */
  minutes?: number;
}

/** The standard protocol ("recipe") for a treatment. One per service (doc id = serviceId). */
export interface Recipe {
  serviceId: string;
  steps: RecipeStep[];
  /** Products used, one per line/entry. */
  products: string[];
  /** Device/machine settings notes. */
  deviceSettings: string;
  contraindications: string;
  aftercare: string;
  updatedAt: Timestamp;
}

export type ReviewStatus = 'pending' | 'published' | 'hidden';

export interface Review {
  id: string;
  customerId: string;
  appointmentId: string;
  /** Public display name (first name shown on the site). */
  authorName: string;
  serviceName: string;
  /** 1–5 stars. */
  rating: number;
  comment: string;
  status: ReviewStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type CampaignChannel = 'email' | 'sms';
export type CampaignStatus = 'draft' | 'sent';
export type CampaignSegment = 'all' | 'marketing' | 'tag' | 'inactive';

export interface Campaign {
  id: string;
  name: string;
  channel: CampaignChannel;
  segment: CampaignSegment;
  /** Tag name (segment=tag) or days-of-inactivity (segment=inactive). */
  segmentValue?: string;
  subject: string;
  body: string;
  status: CampaignStatus;
  recipientCount?: number;
  sentCount?: number;
  createdAt: Timestamp;
  sentAt?: Timestamp | null;
}

export type BlogStatus = 'draft' | 'published';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  /** Plain text / simple paragraphs. */
  body: string;
  coverImageUrl?: string;
  authorName: string;
  seoTitle?: string;
  seoDescription?: string;
  status: BlogStatus;
  publishedAt?: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type GiftCardStatus = 'active' | 'depleted' | 'void';

export interface GiftCardRedemption {
  amount: number;
  note?: string;
  at: Timestamp;
}

export interface GiftCard {
  id: string;
  /** Human-friendly redemption code, e.g. MED-AB12-CD34. */
  code: string;
  initialAmount: number;
  balance: number;
  status: GiftCardStatus;
  purchaserName: string;
  purchaserEmail: string;
  recipientName?: string;
  recipientEmail?: string;
  message?: string;
  /** How the card was created. */
  source: 'online' | 'manual';
  redemptions?: GiftCardRedemption[];
  stripeSessionId?: string;
  stripePaymentIntentId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type WaitlistStatus = 'waiting' | 'offered' | 'booked' | 'cancelled';

export interface WaitlistEntry {
  id: string;
  serviceId: string;
  serviceName: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  customerId?: string;
  /** Preferred date (YYYY-MM-DD); empty means any date. */
  preferredDate?: string;
  /** Preferred practitioner; empty means any. */
  staffId?: string;
  notes?: string;
  status: WaitlistStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type PhotoType = 'before' | 'after';

/** A client before/after photo; the image bytes live in Firebase Storage. */
export interface ClientPhoto {
  id: string;
  customerId: string;
  appointmentId?: string;
  type: PhotoType;
  /** Path within the Storage bucket. */
  storagePath: string;
  caption?: string;
  createdAt: Timestamp;
}

export interface Admin {
  email: string;
  createdAt: Timestamp;
}

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAdmin: boolean;
}
