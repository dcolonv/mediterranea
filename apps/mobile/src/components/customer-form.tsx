import { useState } from 'react';
import { ScrollView, StyleSheet, Alert } from 'react-native';
import { customerSchema, type CustomerFormData } from '@mediterranea/shared/validations';
import { Field, Button } from '@/src/components/ui';
import { colors, spacing } from '@/src/theme';

interface Props {
  initial?: Partial<CustomerFormData>;
  submitLabel: string;
  onSubmit: (data: CustomerFormData) => Promise<void>;
}

export function CustomerForm({ initial, submitLabel, onSubmit }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const parsed = customerSchema.safeParse({
      name,
      email,
      phone,
      notes,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
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
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to save customer.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Field label="Name" value={name} onChangeText={setName} error={errors.name} placeholder="Full name" />
      <Field
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        placeholder="name@email.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Field
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        error={errors.phone}
        placeholder="Phone number"
        keyboardType="phone-pad"
      />
      <Field
        label="Tags (comma separated)"
        value={tags}
        onChangeText={setTags}
        placeholder="VIP, regular"
        autoCapitalize="none"
      />
      <Field
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Anything worth remembering"
        multiline
        numberOfLines={4}
        style={styles.notes}
      />
      <Button title={submitLabel} onPress={submit} loading={saving} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  notes: { minHeight: 96, textAlignVertical: 'top' },
});
