import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/src/providers/auth-provider';
import {
  sendAgentMessage,
  confirmAgentAction,
  type AgentChatMessage,
  type AgentPendingAction,
} from '@/src/api/client';
import { colors, spacing, radius } from '@/src/theme';

interface ChatMessage extends AgentChatMessage {
  error?: boolean;
  pending?: AgentPendingAction;
  resolved?: 'confirmed' | 'cancelled';
}

const STORAGE_KEY = 'assistant.thread.v1';
const SUGGESTIONS = [
  'What’s open tomorrow for a Deep Cleansing Facial?',
  'Book a facial for Friday morning.',
  'Move my 3pm appointment today to 4pm.',
];

export default function AssistantScreen() {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  // Load persisted thread.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setMessages(JSON.parse(raw));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Persist thread.
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages)).catch(() => {});
  }, [messages, loaded]);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, sending]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || sending) return;
      const history: AgentChatMessage[] = messages
        .filter((m) => !m.error)
        .map((m) => ({ role: m.role, content: m.content }));

      setMessages((prev) => [...prev, { role: 'user', content: message }]);
      setInput('');
      setSending(true);
      try {
        const token = await getToken();
        if (!token) throw new Error('Session expired.');
        const res = await sendAgentMessage(token, message, history);
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: res.reply || '(no reply)', pending: res.pendingAction },
        ]);
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: e instanceof Error ? e.message : 'Something went wrong.', error: true },
        ]);
      } finally {
        setSending(false);
      }
    },
    [messages, sending, getToken]
  );

  const confirm = useCallback(
    async (index: number, action: AgentPendingAction) => {
      if (sending) return;
      setSending(true);
      try {
        const token = await getToken();
        if (!token) throw new Error('Session expired.');
        await confirmAgentAction(token, action);
        setMessages((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], resolved: 'confirmed' };
          next.push({ role: 'assistant', content: '✓ Done — the calendar is updated.' });
          return next;
        });
      } catch (e) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: e instanceof Error ? e.message : 'Could not complete that.', error: true },
        ]);
      } finally {
        setSending(false);
      }
    },
    [sending, getToken]
  );

  function cancel(index: number) {
    setMessages((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], resolved: 'cancelled' };
      next.push({ role: 'assistant', content: 'Okay, I won’t make that change.' });
      return next;
    });
  }

  function newChat() {
    setMessages([]);
    AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>Booking assistant</Text>
        {messages.length > 0 && (
          <TouchableOpacity onPress={newChat}>
            <Text style={styles.newChat}>New chat</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView ref={scrollRef} contentContainerStyle={styles.thread}>
        {messages.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              Ask me to check availability, book, reschedule, or cancel. I book against the live
              calendar, so I can’t double-book.
            </Text>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity key={s} style={styles.suggestion} onPress={() => send(s)}>
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          messages.map((m, i) => (
            <View key={i} style={[styles.bubbleRow, m.role === 'user' ? styles.rowRight : styles.rowLeft]}>
              <View
                style={[
                  styles.bubble,
                  m.role === 'user' ? styles.userBubble : m.error ? styles.errorBubble : styles.aiBubble,
                ]}
              >
                <Text style={[styles.bubbleText, m.error && { color: colors.danger }]}>{m.content}</Text>
                {m.pending && !m.resolved && (
                  <View style={styles.confirmRow}>
                    <TouchableOpacity style={styles.confirmBtn} disabled={sending} onPress={() => confirm(i, m.pending!)}>
                      <Text style={styles.confirmText}>Confirm</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelBtn} disabled={sending} onPress={() => cancel(i)}>
                      <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {m.pending && m.resolved && (
                  <Text style={styles.resolvedText}>{m.resolved === 'confirmed' ? 'Confirmed' : 'Cancelled'}</Text>
                )}
              </View>
            </View>
          ))
        )}
        {sending && (
          <View style={[styles.bubbleRow, styles.rowLeft]}>
            <View style={[styles.bubble, styles.aiBubble]}>
              <ActivityIndicator color={colors.gold} />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Message the assistant…"
          placeholderTextColor={colors.inkFaint}
          multiline
          editable={!sending}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || sending) && styles.sendDisabled]}
          onPress={() => send(input)}
          disabled={!input.trim() || sending}
        >
          <Ionicons name="arrow-up" size={20} color={colors.onGold} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  topTitle: { fontSize: 15, fontWeight: '600', color: colors.ink },
  newChat: { fontSize: 13, color: colors.goldDark, fontWeight: '600' },
  thread: { padding: spacing.lg, gap: spacing.sm, flexGrow: 1 },
  empty: { gap: spacing.sm, paddingTop: spacing.lg },
  emptyText: { color: colors.inkMuted, fontSize: 14, lineHeight: 20, marginBottom: spacing.sm },
  suggestion: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  suggestionText: { color: colors.inkSoft, fontSize: 14 },
  bubbleRow: { flexDirection: 'row', marginBottom: spacing.sm },
  rowRight: { justifyContent: 'flex-end' },
  rowLeft: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '85%', borderRadius: radius.md, padding: spacing.md, borderWidth: 1 },
  userBubble: { backgroundColor: colors.goldTint, borderColor: colors.gold },
  aiBubble: { backgroundColor: colors.card, borderColor: colors.border },
  errorBubble: { backgroundColor: colors.dangerTint, borderColor: colors.danger },
  bubbleText: { fontSize: 15, color: colors.ink, lineHeight: 21 },
  confirmRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  confirmBtn: { backgroundColor: colors.gold, borderRadius: radius.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  confirmText: { color: colors.onGold, fontWeight: '700', fontSize: 13 },
  cancelBtn: { borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  cancelText: { color: colors.inkSoft, fontWeight: '600', fontSize: 13 },
  resolvedText: { marginTop: spacing.sm, fontSize: 11, color: colors.inkFaint, textTransform: 'uppercase', letterSpacing: 0.5 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
});
