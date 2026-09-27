'use client';

import { useState } from 'react';
import { format, parseISO, addDays } from 'date-fns';
import { es as esLocale } from 'date-fns/locale';
import { Button } from '@/components/ui';
import { CONTACT_INFO } from '@mediterranea/shared/constants';
import {
  getManagedRescheduleTimes,
  rescheduleManagedAppointment,
  cancelManagedAppointment,
  type ManageView,
} from '@/actions/manage-appointment';

/** Copy in both languages, chosen by the locale the client booked in. */
const COPY = {
  en: {
    title: 'Your appointment',
    intro: 'Need to change something? You can move or cancel it here.',
    reschedule: 'Reschedule',
    cancel: 'Cancel appointment',
    back: 'Never mind',
    pickDate: 'Pick a new day',
    pickTime: 'Pick a new time',
    noTimes: 'No free times that day. Try another.',
    confirmCancel: 'Cancel this appointment?',
    confirmCancelBody: 'This frees the slot for someone else and can’t be undone.',
    keepIt: 'Keep my appointment',
    yesCancel: 'Yes, cancel it',
    cancelled: 'Your appointment has been cancelled',
    cancelledBody: 'We’ve sent you a confirmation. We hope to see you another time.',
    moved: 'Your appointment has been moved',
    movedBody: 'We’ve emailed you the new details.',
    needHelp: 'Need help? Call us on',
    loading: 'Loading…',
  },
  es: {
    title: 'Tu cita',
    intro: '¿Necesitas cambiar algo? Puedes moverla o cancelarla aquí.',
    reschedule: 'Cambiar la cita',
    cancel: 'Cancelar la cita',
    back: 'Dejarlo como está',
    pickDate: 'Elige un nuevo día',
    pickTime: 'Elige una nueva hora',
    noTimes: 'No hay horas libres ese día. Prueba con otro.',
    confirmCancel: '¿Cancelar esta cita?',
    confirmCancelBody: 'Liberarás la hora para otra persona y no se puede deshacer.',
    keepIt: 'Mantener mi cita',
    yesCancel: 'Sí, cancelar',
    cancelled: 'Tu cita ha sido cancelada',
    cancelledBody: 'Te hemos enviado una confirmación. Esperamos verte en otra ocasión.',
    moved: 'Tu cita se ha cambiado',
    movedBody: 'Te hemos enviado los nuevos datos por email.',
    needHelp: '¿Necesitas ayuda? Llámanos al',
    loading: 'Cargando…',
  },
} as const;

type Mode = 'view' | 'reschedule' | 'confirmCancel' | 'cancelled' | 'moved';

export function ManageAppointment({ appointment }: { appointment: ManageView }) {
  const t = COPY[appointment.locale];
  const dateLocale = appointment.locale === 'es' ? esLocale : undefined;

  const [mode, setMode] = useState<Mode>('view');
  const [date, setDate] = useState('');
  const [times, setTimes] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState({ date: appointment.date, time: appointment.time });

  const pretty = (d: string) =>
    format(parseISO(d), appointment.locale === 'es' ? "d 'de' MMMM yyyy" : 'd MMMM yyyy', {
      locale: dateLocale,
    });

  // A month of choices is plenty; anything further out is a phone call.
  const dayOptions = Array.from({ length: 30 }, (_, i) =>
    format(addDays(new Date(), i + 1), 'yyyy-MM-dd')
  );

  async function chooseDate(next: string) {
    setDate(next);
    setTimes(null);
    setError(null);
    setBusy(true);
    const res = await getManagedRescheduleTimes(next);
    setBusy(false);
    if (res.success) setTimes(res.times);
    else setError(res.error);
  }

  async function confirmTime(time: string) {
    setBusy(true);
    setError(null);
    const res = await rescheduleManagedAppointment(date, time);
    setBusy(false);
    if (res.success) {
      setCurrent({ date, time });
      setMode('moved');
    } else {
      setError(res.error);
      // The slot may have gone while they were deciding — refresh the list.
      void chooseDate(date);
    }
  }

  async function confirmCancel() {
    setBusy(true);
    setError(null);
    const res = await cancelManagedAppointment();
    setBusy(false);
    if (res.success) setMode('cancelled');
    else setError(res.error);
  }

  const card = 'border border-white-10 bg-dark-800 p-8 sm:p-10';

  if (mode === 'cancelled' || mode === 'moved') {
    const done = mode === 'cancelled'
      ? { title: t.cancelled, body: t.cancelledBody }
      : { title: t.moved, body: t.movedBody };
    return (
      <div className={`${card} text-center`}>
        <h1 className="font-serif text-2xl text-white">{done.title}</h1>
        {mode === 'moved' && (
          <p className="mt-4 font-serif text-lg text-gold">
            {pretty(current.date)} · {current.time}
          </p>
        )}
        <p className="mx-auto mt-4 max-w-md text-sm font-light leading-relaxed text-white-50">
          {done.body}
        </p>
      </div>
    );
  }

  return (
    <div className={card}>
      <h1 className="font-serif text-2xl text-white">{t.title}</h1>

      <div className="mt-6 border-l border-gold/40 pl-5">
        <p className="font-serif text-xl text-white">{appointment.serviceName}</p>
        <p className="mt-1 text-gold">
          {pretty(current.date)} · {current.time}
        </p>
        <p className="mt-1 text-xs uppercase tracking-wider text-white-30">
          {appointment.durationMinutes} min
        </p>
      </div>

      {error && <p className="mt-6 text-sm text-red-400">{error}</p>}

      {/* Inside the cutoff window there is nothing to click — say why, and how to reach a human. */}
      {appointment.blockedReason ? (
        <div className="mt-8 border border-white-10 bg-dark-900/60 p-5">
          <p className="text-sm font-light leading-relaxed text-white-70">
            {appointment.blockedReason}
          </p>
          <p className="mt-3 text-sm">
            <span className="text-white-50">{t.needHelp} </span>
            <a
              href={`tel:${CONTACT_INFO.phone.replace(/\s/g, '')}`}
              className="text-gold hover:underline"
            >
              {CONTACT_INFO.phone}
            </a>
          </p>
        </div>
      ) : mode === 'view' ? (
        <>
          <p className="mt-6 text-sm font-light text-white-50">{t.intro}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button variant="elegant" onClick={() => setMode('reschedule')}>
              {t.reschedule}
            </Button>
            <Button variant="outline" onClick={() => setMode('confirmCancel')}>
              {t.cancel}
            </Button>
          </div>
        </>
      ) : mode === 'confirmCancel' ? (
        <div className="mt-8 border border-white-10 bg-dark-900/60 p-6">
          <p className="font-serif text-lg text-white">{t.confirmCancel}</p>
          <p className="mt-2 text-sm font-light text-white-50">{t.confirmCancelBody}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => setMode('view')} disabled={busy}>
              {t.keepIt}
            </Button>
            <Button variant="elegant" onClick={confirmCancel} disabled={busy}>
              {t.yesCancel}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-8">
          <p className="mb-3 text-xs uppercase tracking-wider text-white-50">{t.pickDate}</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {dayOptions.map((d) => (
              <button
                key={d}
                onClick={() => chooseDate(d)}
                className={`shrink-0 cursor-pointer border px-3 py-2 text-center text-xs transition-colors ${
                  date === d
                    ? 'border-gold bg-gold/10 text-white'
                    : 'border-white-10 text-white-50 hover:border-gold/40 hover:text-white'
                }`}
              >
                <span className="block uppercase tracking-wider">
                  {format(parseISO(d), 'EEE', { locale: dateLocale })}
                </span>
                <span className="block font-serif text-base text-white">
                  {format(parseISO(d), 'd')}
                </span>
                <span className="block text-[10px] text-white-30">
                  {format(parseISO(d), 'MMM', { locale: dateLocale })}
                </span>
              </button>
            ))}
          </div>

          {busy && <p className="mt-6 text-sm text-white-50">{t.loading}</p>}

          {!busy && times !== null && (
            <>
              <p className="mb-3 mt-6 text-xs uppercase tracking-wider text-white-50">
                {t.pickTime}
              </p>
              {times.length === 0 ? (
                <p className="text-sm text-white-50">{t.noTimes}</p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {times.map((time) => (
                    <button
                      key={time}
                      onClick={() => confirmTime(time)}
                      disabled={busy}
                      className="cursor-pointer border border-white-10 px-3 py-2 text-sm text-white transition-colors hover:border-gold hover:bg-gold/10 disabled:opacity-50"
                    >
                      {time}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          <button
            onClick={() => setMode('view')}
            className="mt-8 cursor-pointer text-sm text-white-50 underline hover:text-white"
          >
            {t.back}
          </button>
        </div>
      )}

      {appointment.policyText && !appointment.blockedReason && (
        <p className="mt-8 border-t border-white-10 pt-6 text-xs font-light leading-relaxed text-white-30">
          {appointment.policyText}
        </p>
      )}
    </div>
  );
}
