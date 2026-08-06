import { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  fetchClientPhotos,
  uploadClientPhoto,
  deleteClientPhoto,
  type ClientPhotoDTO,
} from '@/src/api/client';
import { colors, spacing, radius } from '@/src/theme';

type PhotoType = 'before' | 'after';

export function ClientPhotos({
  customerId,
  getToken,
}: {
  customerId: string;
  getToken: () => Promise<string | null>;
}) {
  const [photos, setPhotos] = useState<ClientPhotoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState<PhotoType>('before');

  const load = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      setPhotos(await fetchClientPhotos(token, customerId));
    } catch {
      /* non-fatal */
    } finally {
      setLoading(false);
    }
  }, [getToken, customerId]);

  useEffect(() => {
    load();
  }, [load]);

  async function upload(asset: ImagePicker.ImagePickerAsset) {
    if (!asset.base64) {
      Alert.alert('Error', 'Could not read the image.');
      return;
    }
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('Session expired.');
      await uploadClientPhoto(token, {
        customerId,
        type,
        base64: asset.base64,
        contentType: asset.mimeType ?? 'image/jpeg',
      });
      await load();
    } catch (e) {
      Alert.alert('Upload failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Camera access needed', 'Enable camera permission to take photos.');
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.6,
      mediaTypes: ['images'],
    });
    if (!res.canceled && res.assets[0]) upload(res.assets[0]);
  }

  async function pickPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.6,
      mediaTypes: ['images'],
    });
    if (!res.canceled && res.assets[0]) upload(res.assets[0]);
  }

  function confirmDelete(id: string) {
    Alert.alert('Delete photo', 'Remove this photo?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const token = await getToken();
            if (!token) return;
            await deleteClientPhoto(token, id);
            setPhotos((prev) => prev.filter((p) => p.id !== id));
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : 'Failed to delete.');
          }
        },
      },
    ]);
  }

  const before = photos.filter((p) => p.type === 'before');
  const after = photos.filter((p) => p.type === 'after');

  return (
    <View>
      {/* Type toggle */}
      <View style={styles.toggle}>
        {(['before', 'after'] as PhotoType[]).map((t) => {
          const active = type === t;
          return (
            <TouchableOpacity
              key={t}
              style={[styles.toggleBtn, active && styles.toggleBtnActive]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
                {t === 'before' ? 'Before' : 'After'}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={takePhoto} disabled={busy}>
          <Text style={styles.actionText}>Take photo</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={pickPhoto} disabled={busy}>
          <Text style={styles.actionText}>Choose photo</Text>
        </TouchableOpacity>
      </View>

      {busy && <ActivityIndicator color={colors.gold} style={{ marginBottom: spacing.md }} />}

      {loading ? (
        <ActivityIndicator color={colors.gold} />
      ) : photos.length === 0 ? (
        <Text style={styles.empty}>No photos yet.</Text>
      ) : (
        <>
          <Column title="Before" photos={before} onDelete={confirmDelete} />
          <Column title="After" photos={after} onDelete={confirmDelete} />
        </>
      )}
    </View>
  );
}

function Column({
  title,
  photos,
  onDelete,
}: {
  title: string;
  photos: ClientPhotoDTO[];
  onDelete: (id: string) => void;
}) {
  if (photos.length === 0) return null;
  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={styles.colTitle}>{title}</Text>
      <View style={styles.grid}>
        {photos.map((p) => (
          <TouchableOpacity key={p.id} onLongPress={() => onDelete(p.id)} style={styles.thumbWrap}>
            <Image source={{ uri: p.url }} style={styles.thumb} />
            {p.caption ? <Text style={styles.caption}>{p.caption}</Text> : null}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  toggle: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  toggleBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  toggleText: { color: colors.inkSoft, fontWeight: '600', fontSize: 13 },
  toggleTextActive: { color: colors.onGold },
  actions: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  actionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  actionText: { color: colors.goldDark, fontWeight: '600', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
  empty: { fontSize: 14, color: colors.inkMuted },
  colTitle: { fontSize: 12, color: colors.inkMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  thumbWrap: { width: '31%' },
  thumb: { width: '100%', aspectRatio: 1, borderRadius: radius.sm, backgroundColor: colors.card },
  caption: { fontSize: 11, color: colors.inkMuted, marginTop: 2 },
});
