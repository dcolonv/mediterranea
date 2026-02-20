'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button, Badge, Select } from '@/components/ui';
import { getAppointments, updateAppointmentStatus, deleteAppointment } from '@/actions/appointments';
import { APPOINTMENT_STATUSES } from '@/lib/constants';
import type { Appointment, AppointmentStatus } from '@/lib/types';

export function AppointmentList() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function loadAppointments() {
    setLoading(true);
    const result = await getAppointments(
      statusFilter ? { status: statusFilter as AppointmentStatus } : undefined
    );
    if (result.success && result.data) {
      setAppointments(result.data);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAppointments();
  }, [statusFilter]);

  async function handleStatusChange(appointmentId: string, newStatus: AppointmentStatus) {
    setActionLoading(appointmentId);
    const result = await updateAppointmentStatus(appointmentId, newStatus);
    if (result.success) {
      await loadAppointments();
    }
    setActionLoading(null);
  }

  async function handleDelete(appointmentId: string) {
    if (!confirm('Are you sure you want to delete this appointment?')) {
      return;
    }

    setActionLoading(appointmentId);
    const result = await deleteAppointment(appointmentId);
    if (result.success) {
      await loadAppointments();
    }
    setActionLoading(null);
  }

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    ...Object.entries(APPOINTMENT_STATUSES).map(([value, { label }]) => ({
      value,
      label,
    })),
  ];

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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-white-50">Loading appointments...</div>
      </div>
    );
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-8 flex flex-wrap gap-4">
        <div className="w-48">
          <Select
            id="statusFilter"
            options={statusOptions}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            placeholder="Filter by status"
          />
        </div>
        <Button variant="outline" onClick={loadAppointments}>
          Refresh
        </Button>
      </div>

      {/* Appointments */}
      {appointments.length === 0 ? (
        <div className="border border-white-10 bg-dark-800 p-16 text-center">
          <p className="text-white-50">No appointments found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="border border-white-10 bg-dark-800 p-6 hover:border-white-30 transition-colors"
            >
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-serif text-xl text-white">
                      {appointment.clientName}
                    </h3>
                    <Badge variant={appointment.status}>
                      {APPOINTMENT_STATUSES[appointment.status].label}
                    </Badge>
                  </div>
                  <p className="text-gold">{appointment.serviceName}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white">
                    {format(new Date(appointment.appointmentDate), 'MMMM d, yyyy')}
                  </p>
                  <p className="text-white-50">{appointment.appointmentTime}</p>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 text-sm mb-6">
                <div>
                  <span className="text-white-50">Email: </span>
                  <a
                    href={`mailto:${appointment.clientEmail}`}
                    className="text-gold hover:text-gold-light transition-colors"
                  >
                    {appointment.clientEmail}
                  </a>
                </div>
                <div>
                  <span className="text-white-50">Phone: </span>
                  <a
                    href={`tel:${appointment.clientPhone}`}
                    className="text-gold hover:text-gold-light transition-colors"
                  >
                    {appointment.clientPhone}
                  </a>
                </div>
                {appointment.notes && (
                  <div className="sm:col-span-3">
                    <span className="text-white-50">Notes: </span>
                    <span className="text-white">{appointment.notes}</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-white-10">
                {statusActions[appointment.status].map((action) => (
                  <Button
                    key={action.next}
                    variant={action.next === 'cancelled' ? 'outline' : 'elegant'}
                    size="sm"
                    disabled={actionLoading === appointment.id}
                    onClick={() => handleStatusChange(appointment.id, action.next)}
                  >
                    {action.label}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={actionLoading === appointment.id}
                  onClick={() => handleDelete(appointment.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
