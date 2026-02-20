'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  addDays,
  isSunday,
} from 'date-fns';
import { Button, Badge } from '@/components/ui';
import { getAppointments } from '@/actions/appointments';
import { APPOINTMENT_STATUSES } from '@/lib/constants';
import { AppointmentModal } from './appointment-modal';
import type { Appointment } from '@/lib/types';

const WEEKDAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function AppointmentCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const loadMonthAppointments = useCallback(async () => {
    setLoading(true);
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);

    const result = await getAppointments({
      startDate: format(monthStart, 'yyyy-MM-dd'),
      endDate: format(monthEnd, 'yyyy-MM-dd'),
    });

    if (result.success && result.data) {
      setAppointments(result.data);
    }
    setLoading(false);
  }, [currentMonth]);

  useEffect(() => {
    loadMonthAppointments();
  }, [loadMonthAppointments]);

  function getAppointmentsForDate(date: Date): Appointment[] {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments
      .filter((apt) => apt.appointmentDate === dateStr)
      .sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime));
  }

  function handlePrevMonth() {
    setCurrentMonth(subMonths(currentMonth, 1));
    setSelectedDate(null);
  }

  function handleNextMonth() {
    setCurrentMonth(addMonths(currentMonth, 1));
    setSelectedDate(null);
  }

  // Build calendar grid (Mon-Sat, skip Sundays)
  function buildCalendarDays(): (Date | null)[][] {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    // Start from Monday of the week containing month start
    let weekStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const weeks: (Date | null)[][] = [];
    let currentDay = weekStart;

    while (currentDay <= calendarEnd) {
      const week: (Date | null)[] = [];
      for (let i = 0; i < 7; i++) {
        if (!isSunday(currentDay)) {
          week.push(new Date(currentDay));
        }
        currentDay = addDays(currentDay, 1);
      }
      weeks.push(week);
    }

    return weeks;
  }

  const calendarWeeks = buildCalendarDays();
  const selectedDayAppointments = selectedDate
    ? getAppointmentsForDate(selectedDate)
    : [];

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Prev
        </Button>
        <h2 className="font-serif text-xl text-white">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <Button variant="ghost" size="sm" onClick={handleNextMonth}>
          Next
          <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="border border-white-10 bg-dark-800">
        {/* Header row */}
        <div className="grid grid-cols-6 border-b border-white-10">
          {WEEKDAY_HEADERS.map((day) => (
            <div
              key={day}
              className="p-3 text-center text-xs font-medium tracking-wider uppercase text-white-30"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Day cells */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="text-white-50">Loading...</div>
          </div>
        ) : (
          calendarWeeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-6 border-b border-white-10 last:border-b-0">
              {week.map((day, dayIndex) => {
                if (!day) return <div key={dayIndex} />;

                const inCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const dayAppointments = getAppointmentsForDate(day);
                const todayMark = isToday(day);

                return (
                  <button
                    key={dayIndex}
                    onClick={() => setSelectedDate(day)}
                    className={`
                      relative min-h-[80px] p-2 text-left transition-colors border-r border-white-10 last:border-r-0
                      ${inCurrentMonth ? 'hover:bg-white-10' : 'opacity-30'}
                      ${isSelected ? 'bg-gold/10 border-gold/30' : ''}
                    `}
                  >
                    <span
                      className={`
                        text-sm font-medium
                        ${todayMark ? 'text-gold' : inCurrentMonth ? 'text-white' : 'text-white-30'}
                      `}
                    >
                      {format(day, 'd')}
                    </span>
                    {todayMark && (
                      <span className="ml-1 text-[10px] text-gold uppercase tracking-wider">today</span>
                    )}

                    {/* Appointment indicators */}
                    {dayAppointments.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {dayAppointments.length <= 3 ? (
                          dayAppointments.map((apt) => (
                            <span
                              key={apt.id}
                              className={`
                                block w-2 h-2 rounded-full
                                ${apt.status === 'pending' ? 'bg-yellow-400' : ''}
                                ${apt.status === 'confirmed' ? 'bg-blue-400' : ''}
                                ${apt.status === 'completed' ? 'bg-green-400' : ''}
                                ${apt.status === 'cancelled' ? 'bg-red-400' : ''}
                              `}
                              title={`${apt.appointmentTime} - ${apt.clientName}`}
                            />
                          ))
                        ) : (
                          <span className="text-[10px] font-medium text-gold bg-gold/20 px-1.5 py-0.5">
                            {dayAppointments.length}
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Day detail panel */}
      {selectedDate && (
        <div className="mt-6 border border-white-10 bg-dark-800 p-6">
          <h3 className="font-serif text-lg text-white mb-4">
            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
          </h3>

          {selectedDayAppointments.length === 0 ? (
            <p className="text-white-50 text-sm">No appointments for this day.</p>
          ) : (
            <div className="space-y-3">
              {selectedDayAppointments.map((apt) => (
                <button
                  key={apt.id}
                  onClick={() => setSelectedAppointment(apt)}
                  className="w-full text-left p-4 border border-white-10 hover:border-white-30 transition-colors flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <span className="text-sm font-medium text-gold whitespace-nowrap">
                      {apt.appointmentTime}
                    </span>
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {apt.clientName}
                      </p>
                      <p className="text-white-50 text-xs truncate">
                        {apt.serviceName}
                      </p>
                    </div>
                  </div>
                  <Badge variant={apt.status}>
                    {APPOINTMENT_STATUSES[apt.status].label}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Appointment modal */}
      {selectedAppointment && (
        <AppointmentModal
          appointment={selectedAppointment}
          onClose={() => setSelectedAppointment(null)}
          onUpdate={loadMonthAppointments}
        />
      )}
    </div>
  );
}
