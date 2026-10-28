import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, Switch, TextInput, View } from 'react-native';

import { fetchTestAccounts, setTestAccount } from '@/api/admin';
import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { alpha, color, radius } from '@/theme/tokens';

const KEY = ['admin-test-accounts'] as const;

/**
 * Owners only, and in English on purpose: it is an internal tool, not part of
 * the member experience. Lists the accounts that have demo mode and lets an
 * owner add one (for example the account an AI assistant tests with).
 */
export function AdminTestAccounts() {
  const client = useQueryClient();
  const [email, setEmail] = useState('');
  const accounts = useQuery({ queryKey: KEY, queryFn: fetchTestAccounts, retry: false });
  const change = useMutation({
    mutationFn: ({ address, enabled }: { address: string; enabled: boolean }) => setTestAccount(address, enabled),
    onSuccess: () => {
      setEmail('');
      void client.invalidateQueries({ queryKey: KEY });
    },
  });

  // Not an owner (a viewer, say): the server refuses, so show nothing.
  if (accounts.isError) return null;

  return (
    <View style={styles.wrap}>
      <Text variant="micro">Demo mode accounts</Text>
      <Text variant="caption">
        These accounts get sample members, free test Premium and the reset. Nobody else does. Add the account an AI assistant signs in with, after it has signed up.
      </Text>
      {(accounts.data ?? []).map((account) => (
        <View key={account.email} style={styles.row}>
          <Text variant="bodySmall" style={styles.email} numberOfLines={1}>
            {account.email}{account.owner ? '  (owner)' : ''}
          </Text>
          <Switch
            accessibilityLabel={`Demo mode for ${account.email}`}
            value
            disabled={account.owner || change.isPending}
            onValueChange={(enabled) => change.mutate({ address: account.email, enabled })}
            trackColor={{ false: color.sandDeep, true: color.ink }}
            thumbColor={color.white}
          />
        </View>
      ))}
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="email of an account that has signed up"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        style={styles.input}
      />
      {change.isError ? <Text variant="caption">{(change.error as Error).message}</Text> : null}
      <Button
        label="Add demo account"
        variant="secondary"
        loading={change.isPending}
        disabled={!email.includes('@')}
        onPress={() => change.mutate({ address: email.trim(), enabled: true })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  email: { flex: 1 },
  input: {
    borderWidth: 1,
    borderColor: alpha.line,
    borderRadius: radius.card,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: color.ink,
  },
});
