import { supabase } from './supabase';

export interface Transaction {
  id: string;
  from_user_id?: string;
  to_user_id?: string;
  user_id?: string;
  amount: number;
  type: string;
  description?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export async function getWalletBalance(userId: string): Promise<number> {
  const { data, error } = await supabase
    .from('dl365_tokens')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data?.balance || 0;
}

export async function transferTokens(
  fromUserId: string,
  toUserId: string,
  amount: number,
  description: string
): Promise<void> {
  const { data: fromBalance } = await supabase
    .from('dl365_tokens')
    .select('balance')
    .eq('user_id', fromUserId)
    .maybeSingle();

  if (!fromBalance || fromBalance.balance < amount) {
    throw new Error('Insufficient balance');
  }

  const { error: deductError } = await supabase
    .from('dl365_tokens')
    .update({ balance: fromBalance.balance - amount })
    .eq('user_id', fromUserId);

  if (deductError) throw deductError;

  const { data: toBalance } = await supabase
    .from('dl365_tokens')
    .select('balance')
    .eq('user_id', toUserId)
    .maybeSingle();

  const newToBalance = (toBalance?.balance || 0) + amount;

  if (toBalance) {
    const { error: addError } = await supabase
      .from('dl365_tokens')
      .update({ balance: newToBalance })
      .eq('user_id', toUserId);

    if (addError) throw addError;
  } else {
    const { error: createError } = await supabase
      .from('dl365_tokens')
      .insert({ user_id: toUserId, balance: amount });

    if (createError) throw createError;
  }

  const { error: txError } = await supabase.from('transactions').insert({
    from_user_id: fromUserId,
    to_user_id: toUserId,
    amount,
    type: 'transfer',
    description,
  });

  if (txError) throw txError;
}

export async function getTransactionHistory(userId: string): Promise<Transaction[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .or(`user_id.eq.${userId},from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

export async function depositTokens(userId: string, amount: number): Promise<void> {
  const { data: currentBalance } = await supabase
    .from('dl365_tokens')
    .select('balance')
    .eq('user_id', userId)
    .maybeSingle();

  const newBalance = (currentBalance?.balance || 0) + amount;

  if (currentBalance) {
    const { error } = await supabase
      .from('dl365_tokens')
      .update({ balance: newBalance })
      .eq('user_id', userId);

    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('dl365_tokens')
      .insert({ user_id: userId, balance: amount });

    if (error) throw error;
  }

  const { error: txError } = await supabase.from('transactions').insert({
    user_id: userId,
    amount,
    type: 'deposit',
    description: 'Wallet deposit',
  });

  if (txError) throw txError;
}
