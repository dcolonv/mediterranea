import { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, StyleSheet, Alert } from 'react-native';
import { serviceSchema, type ServiceFormData } from '@mediterranea/shared/validations';
import type { ServiceCategory } from '@mediterranea/shared/types';
import { Field, Button } from '@/src/components/ui';
import { colors, spacing, radius } from '@/src/theme';

interface Props {
  initial?: Partial<ServiceFormData>;
  submitLabel: string;
  onSubmit: (data: ServiceFormData) => Promise<void>;
}

const CATEGORIES: ServiceCategory[] = ['facial', 'treatment'];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function ServiceForm({ initial, submitLabel, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [slugEdited, setSlugEdited] = useState(Boolean(initial?.slug));
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState<ServiceCategory>(initial?.category ?? 'facial');
  const [duration, setDuration] = useState(initial?.durationMinutes ? String(initial.durationMinutes) : '');
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : '');
  const [displayOrder, setDisplayOrder] = useState(
    initial?.displayOrder != null ? String(initial.displayOrder) : '0'
  );
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const onNameChange = (text: string) => {
    setName(text);
    if (!slugEdited) setSlug(slugify(text));
  };

  const submit = async () => {
    const parsed = serviceSchema.safeParse({
      name,
      slug,
      description,
      category,
      durationMinutes: Number(duration),
      price: Number(price),
      displayOrder: Number(displayOrder),
      isActive,
    });

    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (typeof key === 'string' && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      await onSubmit(parsed.data);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save service.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Field label="Name" value={name} onChangeText={onNameChange} error={errors.name} placeholder="Service name" />
      <Field
        label="Slug"
        value={slug}
        onChangeText={(t) => { setSlug(t); setSlugEdited(true); }}
        error={errors.slug}
        placeholder="service-slug"
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={styles.label}>Category</Text>
      <View style={styles.segment}>
        {CATEGORIES.map((cat) => {
          const active = category === cat;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategory(cat)}
              style={[styles.segmentItem, active && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {cat[0].toUpperCase() + cat.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        error={errors.description}
        placeholder="What this service includes"
        multiline
        numberOfLines={4}
        style={styles.multiline}
      />

      <View style={styles.rowFields}>
        <View style={styles.half}>
          <Field
            label="Duration (min)"
            value={duration}
            onChangeText={setDuration}
            error={errors.durationMinutes}
            placeholder="60"
            keyboardType="number-pad"
          />
        </View>
        <View style={styles.half}>
          <Field
            label="Price"
            value={price}
            onChangeText={setPrice}
            error={errors.price}
            placeholder="85"
            keyboardType="decimal-pad"
          />
        </View>
      </View>

      <Field
        label="Display order"
        value={displayOrder}
        onChangeText={setDisplayOrder}
        error={errors.displayOrder}
        placeholder="0"
        keyboardType="number-pad"
      />

      <View style={styles.switchRow}>
        <View>
          <Text style={styles.label}>Active</Text>
          <Text style={styles.switchHint}>Visible to customers when booking</Text>
        </View>
        <Switch
          value={isActive}
          onValueChange={setIsActive}
          trackColor={{ true: colors.gold, false: colors.borderStrong }}
          thumbColor={colors.white}
        />
      </View>

      <Button title={submitLabel} onPress={submit} loading={saving} style={{ marginTop: spacing.md }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  label: {
    fontSize: 12,
    color: colors.inkSoft,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  segmentItem: { flex: 1, paddingVertical: spacing.md, alignItems: 'center', backgroundColor: colors.white },
  segmentItemActive: { backgroundColor: colors.gold },
  segmentText: { fontSize: 14, color: colors.inkSoft, fontWeight: '600' },
  segmentTextActive: { color: colors.onGold },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  rowFields: { flexDirection: 'row', gap: spacing.md },
  half: { flex: 1 },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  switchHint: { fontSize: 12, color: colors.inkMuted, marginTop: 2 },
});
