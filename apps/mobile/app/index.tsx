import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Link } from 'expo-router';
import { fetchServices } from '@/src/api/client';
import { formatPrice, formatDuration } from '@mediterranea/shared/utils';
import type { Service } from '@mediterranea/shared/types';

export default function ServicesScreen() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServices()
      .then(setServices)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#c9a96e" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mediterranea Skin Lab</Text>
      <Text style={styles.subtitle}>Our Services</Text>

      <FlatList
        data={services}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.name}</Text>
              <Text style={styles.cardPrice}>{formatPrice(item.price)}</Text>
            </View>
            <Text style={styles.cardDescription}>{item.description}</Text>
            <Text style={styles.cardDuration}>{formatDuration(item.durationMinutes)}</Text>
          </View>
        )}
      />

      <Link href="/book" asChild>
        <TouchableOpacity style={styles.bookButton}>
          <Text style={styles.bookButtonText}>Book Appointment</Text>
        </TouchableOpacity>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#181818',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#181818',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '300',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 14,
    color: '#c9a96e',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  list: {
    paddingBottom: 100,
  },
  card: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(30,30,30,0.8)',
    padding: 20,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '500',
    flex: 1,
  },
  cardPrice: {
    fontSize: 16,
    color: '#c9a96e',
    fontWeight: '500',
    marginLeft: 12,
  },
  cardDescription: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.5)',
    lineHeight: 20,
    marginBottom: 8,
  },
  cardDuration: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bookButton: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: '#c9a96e',
    paddingVertical: 16,
    alignItems: 'center',
  },
  bookButtonText: {
    color: '#181818',
    fontSize: 16,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
