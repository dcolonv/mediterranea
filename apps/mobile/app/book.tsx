import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { fetchServices, fetchAvailableSlots, createAppointment } from '@/src/api/client';
import { formatPrice, formatDuration } from '@mediterranea/shared/utils';
import type { Service } from '@mediterranea/shared/types';

export default function BookScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [slots, setSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchServices().then(setServices).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedDate || !selectedService) {
      setSlots([]);
      return;
    }

    setLoadingSlots(true);
    setSelectedTime('');
    fetchAvailableSlots(selectedDate, selectedService.durationMinutes)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDate, selectedService]);

  // Generate next 14 dates (excluding Sundays)
  const dates: { value: string; label: string }[] = [];
  for (let i = 1; i <= 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    if (d.getDay() !== 0) {
      dates.push({
        value: d.toISOString().split('T')[0],
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      });
    }
  }

  async function handleSubmit() {
    if (!selectedService || !selectedDate || !selectedTime || !clientName || !clientEmail || !clientPhone) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    setSubmitting(true);
    try {
      await createAppointment({
        serviceId: selectedService.slug,
        serviceName: selectedService.name,
        clientName,
        clientEmail,
        clientPhone,
        appointmentDate: selectedDate,
        appointmentTime: selectedTime,
        durationMinutes: selectedService.durationMinutes,
        notes,
      });

      Alert.alert('Success', 'Your appointment has been requested. We\'ll confirm shortly.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to book appointment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Book Appointment</Text>

      {/* Service selection */}
      <Text style={styles.label}>Select Service</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
        {services.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.chip, selectedService?.id === s.id && styles.chipSelected]}
            onPress={() => {
              setSelectedService(s);
              setSelectedDate('');
              setSelectedTime('');
            }}
          >
            <Text style={[styles.chipText, selectedService?.id === s.id && styles.chipTextSelected]}>
              {s.name}
            </Text>
            <Text style={styles.chipMeta}>
              {formatPrice(s.price)} - {formatDuration(s.durationMinutes)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Date selection */}
      {selectedService && (
        <>
          <Text style={styles.label}>Select Date</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {dates.map((d) => (
              <TouchableOpacity
                key={d.value}
                style={[styles.dateChip, selectedDate === d.value && styles.chipSelected]}
                onPress={() => setSelectedDate(d.value)}
              >
                <Text style={[styles.chipText, selectedDate === d.value && styles.chipTextSelected]}>
                  {d.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </>
      )}

      {/* Time selection */}
      {selectedDate && (
        <>
          <Text style={styles.label}>Select Time</Text>
          {loadingSlots ? (
            <ActivityIndicator color="#c9a96e" style={{ marginVertical: 16 }} />
          ) : slots.length === 0 ? (
            <Text style={styles.noSlots}>No available times for this date.</Text>
          ) : (
            <View style={styles.timeGrid}>
              {slots.map((time) => (
                <TouchableOpacity
                  key={time}
                  style={[styles.timeChip, selectedTime === time && styles.chipSelected]}
                  onPress={() => setSelectedTime(time)}
                >
                  <Text style={[styles.chipText, selectedTime === time && styles.chipTextSelected]}>
                    {time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </>
      )}

      {/* Client info */}
      {selectedTime && (
        <>
          <Text style={styles.sectionTitle}>Your Information</Text>

          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            value={clientName}
            onChangeText={setClientName}
            placeholder="Enter your full name"
            placeholderTextColor="rgba(255,255,255,0.3)"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={clientEmail}
            onChangeText={setClientEmail}
            placeholder="your@email.com"
            placeholderTextColor="rgba(255,255,255,0.3)"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={clientPhone}
            onChangeText={setClientPhone}
            placeholder="+34 600 000 000"
            placeholderTextColor="rgba(255,255,255,0.3)"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any special requests..."
            placeholderTextColor="rgba(255,255,255,0.3)"
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#181818" />
            ) : (
              <Text style={styles.submitButtonText}>Request Appointment</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
  },
  content: {
    padding: 20,
    paddingBottom: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: '300',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 24,
    letterSpacing: 1,
  },
  label: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '500',
    marginTop: 32,
    marginBottom: 4,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  horizontalScroll: {
    marginBottom: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    minWidth: 120,
  },
  dateChip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
  },
  chipSelected: {
    borderColor: '#c9a96e',
    backgroundColor: 'rgba(201,169,110,0.1)',
  },
  chipText: {
    color: '#ffffff',
    fontSize: 14,
  },
  chipTextSelected: {
    color: '#c9a96e',
  },
  chipMeta: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 11,
    marginTop: 4,
  },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  timeChip: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  noSlots: {
    color: '#ef4444',
    fontSize: 14,
    marginVertical: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(30,30,30,0.8)',
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 4,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#c9a96e',
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#181818',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
