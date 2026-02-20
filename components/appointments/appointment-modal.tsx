'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Button, Badge } from '@/components/ui';
import { APPOINTMENT_STATUSES } from '@/lib/constants';
import { updateAppointmentStatus, deleteAppointment } from '@/actions/appointments';
import type { Appointment, AppointmentStatus } from '@/lib/types';

const statusActions: Record<AppointmentStatus, { next: AppointmentStatus; label: string }[]> = {
  pending: [
    { next: 'confirmed', label: 'Confirm' },
    { next: 'cancelled', label: 'Cancel' },
  ],
  confirmed: [
    { next: 'completed', label: 'Complete' },
    { next: 'cancelled', label: 'Cancel' },
  ],
  completed: [],
  cancelled: [],
};

interface AppointmentModalProps {
  appointment: Appointment;
  onClose: () => void;
  onUpdate: () => void;
}

export function AppointmentModal({ appointment, onClose, onUpdate }: AppointmentModalProps) {
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  async function handleStatusChange(newStatus: AppointmentStatus) {
    setActionLoading(true);
    const result = await updateAppointmentStatus(appointment.id, newStatus);
    if (result.success) {
      onUpdate();
      onClose();
    }
    setActionLoading(false);
  }

  async function handleDelete() {
    setActionLoading(true);
    const result = await deleteAppointment(appointment.id);
    if (result.success) {
      onUpdate();
      onClose();
    }
    setActionLoading(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg border border-white-10 bg-dark-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white-10">
          <div>
            <h2 className="font-serif text-2xl text-white">
              {appointment.clientName}
            </h2>
            <p className="mt-1 text-gold">{appointment.serviceName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white-50 hover:text-white transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3">
            <Badge variant={appointment.status}>
              {APPOINTMENT_STATUSES[appointment.status].label}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white-30 text-xs uppercase tracking-wider">Date</span>
              <p className="text-white mt-1">
                {format(new Date(appointment.appointmentDate + 'T00:00:00'), 'MMMM d, yyyy')}
              </p>
            </div>
            <div>
              <span className="text-white-30 text-xs uppercase tracking-wider">Time</span>
              <p className="text-white mt-1">{appointment.appointmentTime}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white-30 text-xs uppercase tracking-wider">Email</span>
              <p className="mt-1">
                <a
                  href={`mailto:${appointment.clientEmail}`}
                  className="text-gold hover:text-gold-light transition-colors"
                >
                  {appointment.clientEmail}
                </a>
              </p>
            </div>
            <div>
              <span className="text-white-30 text-xs uppercase tracking-wider">Phone</span>
              <p className="mt-1">
                <a
                  href={`tel:${appointment.clientPhone}`}
                  className="text-gold hover:text-gold-light transition-colors"
                >
                  {appointment.clientPhone}
                </a>
              </p>
            </div>
          </div>

          {appointment.notes && (
            <div className="text-sm">
              <span className="text-white-30 text-xs uppercase tracking-wider">Notes</span>
              <p className="text-white mt-1">{appointment.notes}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 border-t border-white-10">
          {showDeleteConfirm ? (
            <div className="space-y-3">
              <p className="text-sm text-red-400">Are you sure you want to delete this appointment?</p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="bg-red-500 text-white hover:bg-red-600 border-0"
                >
                  {actionLoading ? 'Deleting...' : 'Confirm Delete'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {statusActions[appointment.status].map((action) => (
                <Button
                  key={action.next}
                  variant={action.next === 'cancelled' ? 'outline' : 'elegant'}
                  size="sm"
                  disabled={actionLoading}
                  onClick={() => handleStatusChange(action.next)}
                >
                  {action.label}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                disabled={actionLoading}
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-auto"
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
