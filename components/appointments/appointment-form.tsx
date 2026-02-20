'use client';

import { useState, useEffect } from 'react';
import { format, addDays, isSunday } from 'date-fns';
import { Button, Input, Select, Textarea } from '@/components/ui';
import { SERVICES_SEED } from '@/lib/constants';
import { formatPrice, formatDuration } from '@/lib/utils';
import { createAppointment, getAvailableSlots } from '@/actions/appointments';
import type { AppointmentFormData } from '@/lib/validations/appointment';

export function AppointmentForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const serviceOptions = SERVICES_SEED.map((service) => ({
    value: service.slug,
    label: `${service.name} - ${formatPrice(service.price)} (${formatDuration(service.durationMinutes)})`,
  }));

  const selectedService = SERVICES_SEED.find((s) => s.slug === selectedServiceId);

  // Generate available dates (next 30 days, excluding Sundays)
  const today = new Date();
  const availableDates: { value: string; label: string }[] = [];
  for (let i = 1; i <= 30; i++) {
    const date = addDays(today, i);
    if (!isSunday(date)) {
      availableDates.push({
        value: format(date, 'yyyy-MM-dd'),
        label: format(date, 'EEEE, MMMM d, yyyy'),
      });
    }
  }

  // Fetch available slots when date or service changes
  useEffect(() => {
    if (!selectedDate || !selectedService) {
      setAvailableSlots([]);
      setSelectedTime('');
      return;
    }

    let cancelled = false;
    setLoadingSlots(true);
    setSelectedTime('');

    getAvailableSlots(selectedDate, selectedService.durationMinutes).then((result) => {
      if (cancelled) return;
      if (result.success) {
        setAvailableSlots(result.slots);
      } else {
        setAvailableSlots([]);
      }
      setLoadingSlots(false);
    });

    return () => {
      cancelled = true;
    };
  }, [selectedDate, selectedServiceId, selectedService]);

  const timeOptions = availableSlots.map((time) => ({
    value: time,
    label: time,
  }));

  function handleServiceChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedServiceId(e.target.value);
    setSelectedDate('');
    setSelectedTime('');
    setAvailableSlots([]);
  }

  function handleDateChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedDate(e.target.value);
    setSelectedTime('');
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    const formData = new FormData(event.currentTarget);

    const data: AppointmentFormData = {
      serviceId: formData.get('serviceId') as string,
      serviceName: selectedService?.name || '',
      clientName: formData.get('clientName') as string,
      clientEmail: formData.get('clientEmail') as string,
      clientPhone: formData.get('clientPhone') as string,
      appointmentDate: formData.get('appointmentDate') as string,
      appointmentTime: formData.get('appointmentTime') as string,
      durationMinutes: selectedService?.durationMinutes || 60,
      notes: formData.get('notes') as string,
    };

    const result = await createAppointment(data);

    setIsSubmitting(false);

    if (result.success) {
      setIsSuccess(true);
    } else if (typeof result.error === 'object') {
      setErrors(result.error as Record<string, string[]>);
    } else {
      setErrors({ form: [result.error as string] });
    }
  }

  if (isSuccess) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-20 h-20 border border-gold flex items-center justify-center mb-8">
          <svg
            className="h-10 w-10 text-gold"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
        <h2 className="font-serif text-3xl text-white mb-4">
          Appointment Requested
        </h2>
        <p className="text-white-50 max-w-md mx-auto">
          Thank you for booking with Mediterranea Skin Lab. We&apos;ll contact
          you shortly to confirm your appointment.
        </p>
        <Button
          variant="elegant"
          className="mt-10"
          onClick={() => {
            setIsSuccess(false);
            setSelectedServiceId('');
            setSelectedDate('');
            setSelectedTime('');
            setAvailableSlots([]);
          }}
        >
          Book Another Appointment
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {errors.form && (
        <div className="p-4 border border-red-500/50 bg-red-500/10 text-red-400 text-sm">
          {errors.form[0]}
        </div>
      )}

      <Select
        id="serviceId"
        name="serviceId"
        label="Select Service"
        placeholder="Choose a service..."
        options={serviceOptions}
        value={selectedServiceId}
        onChange={handleServiceChange}
        error={errors.serviceId?.[0]}
        required
      />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Select
          id="appointmentDate"
          name="appointmentDate"
          label="Preferred Date"
          placeholder={selectedServiceId ? 'Select a date...' : 'Select a service first'}
          options={availableDates}
          value={selectedDate}
          onChange={handleDateChange}
          error={errors.appointmentDate?.[0]}
          disabled={!selectedServiceId}
          required
        />

        <div>
          <Select
            id="appointmentTime"
            name="appointmentTime"
            label="Available Time"
            placeholder={
              loadingSlots
                ? 'Loading available times...'
                : !selectedDate
                  ? 'Select a date first'
                  : timeOptions.length === 0
                    ? 'No available times'
                    : 'Select a time...'
            }
            options={timeOptions}
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            error={errors.appointmentTime?.[0]}
            disabled={!selectedDate || loadingSlots || timeOptions.length === 0}
            required
          />
          {loadingSlots && (
            <p className="mt-2 text-xs text-white-30 animate-pulse">
              Checking availability...
            </p>
          )}
          {!loadingSlots && selectedDate && timeOptions.length === 0 && (
            <p className="mt-2 text-xs text-red-400">
              No available times for this date. Please select another date.
            </p>
          )}
        </div>
      </div>

      <div className="border-t border-white-10 pt-8">
        <h3 className="font-serif text-xl text-white mb-6">
          Your Information
        </h3>

        <div className="space-y-6">
          <Input
            id="clientName"
            name="clientName"
            label="Full Name"
            placeholder="Enter your full name"
            error={errors.clientName?.[0]}
            required
          />

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Input
              id="clientEmail"
              name="clientEmail"
              type="email"
              label="Email Address"
              placeholder="your@email.com"
              error={errors.clientEmail?.[0]}
              required
            />

            <Input
              id="clientPhone"
              name="clientPhone"
              type="tel"
              label="Phone Number"
              placeholder="+1 (555) 123-4567"
              error={errors.clientPhone?.[0]}
              required
            />
          </div>

          <Textarea
            id="notes"
            name="notes"
            label="Additional Notes (Optional)"
            placeholder="Any special requests or concerns..."
          />
        </div>
      </div>

      <div className="pt-4">
        <Button
          type="submit"
          variant="elegant"
          size="lg"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Submitting...' : 'Request Appointment'}
        </Button>
        <p className="mt-6 text-sm text-center text-white-30">
          We&apos;ll contact you to confirm your appointment within 24 hours.
        </p>
      </div>
    </form>
  );
}
