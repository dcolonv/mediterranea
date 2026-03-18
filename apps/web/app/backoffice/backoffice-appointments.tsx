'use client';

import { useState } from 'react';
import { AppointmentCalendar, AppointmentList } from '@/components/appointments';

type TabView = 'calendar' | 'list';

export function BackofficeAppointments() {
  const [activeTab, setActiveTab] = useState<TabView>('calendar');

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-0 mb-8 border-b border-white-10">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`
            px-6 py-3 text-sm font-medium tracking-wider uppercase transition-colors
            ${activeTab === 'calendar'
              ? 'text-gold border-b-2 border-gold -mb-px'
              : 'text-white-50 hover:text-white'}
          `}
        >
          Calendar
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`
            px-6 py-3 text-sm font-medium tracking-wider uppercase transition-colors
            ${activeTab === 'list'
              ? 'text-gold border-b-2 border-gold -mb-px'
              : 'text-white-50 hover:text-white'}
          `}
        >
          List
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'calendar' ? <AppointmentCalendar /> : <AppointmentList />}
    </div>
  );
}
