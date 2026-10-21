import { cache } from 'react';
import { getBookingServices } from '@/actions/public-booking';

/**
 * The active catalogue for server components, fetched once per request however
 * many of them ask (the home page's cards and its structured data both do).
 */
export const getCatalogue = cache(getBookingServices);
