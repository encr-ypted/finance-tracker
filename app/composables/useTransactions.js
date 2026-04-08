import { ref, computed } from 'vue';

const transactions = ref([]);
const loading = ref(false);

export const useTransactions = () => {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  const fetchTransactions = async (dateFrom, dateTo, categoryId, accountId) => {
    if (!user.value?.sub) return;
    loading.value = true;

    let query = supabase
      .from('transactions')
      .select('*, categories(name, color, icon, type), accounts(name)')
      .eq('user_id', user.value.sub)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (dateFrom) query = query.gte('date', dateFrom);
    if (dateTo) query = query.lte('date', dateTo);
    if (categoryId) query = query.eq('category_id', categoryId);
    if (accountId) query = query.eq('account_id', accountId);

    const { data, error } = await query;

    if (!error && data) {
      transactions.value = data;
    }

    loading.value = false;
  };


  const addTransaction = async (txnObj) => {
    if (!user.value?.sub) return;

    const { data, error } = await supabase.from('transactions').insert({
      ...txnObj, 
      user_id: user.value.sub 
    }).select('*, categories(name, color, icon, type), accounts(name)').single();

    if (!error && data) {
      const idx = transactions.value.findIndex(t => t.date <= data.date);
      if (idx === -1) {
        transactions.value.push(data);
      } else {
        transactions.value.splice(idx, 0, data);
      }
    }
  };

  // ── Delete ─────────────────────────────────────────────────

  const deleteTransaction = async (txnId) => {
    if (!user.value?.sub) return;

    const { error } = await supabase.from('transactions')
      .delete()
      .eq('id', txnId)
      .eq('user_id', user.value.sub);

    if (!error) {
      transactions.value = transactions.value.filter(t => t.id !== txnId);
    }
  };

  // ── Aggregations ───────────────────────────────────────────

  const totalIncome = computed(() =>
    transactions.value
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + Number(t.amount), 0)
  );

  const totalExpenses = computed(() =>
    transactions.value
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0)
  );

  const netBalance = computed(() => totalIncome.value - totalExpenses.value);

  const categoryBreakdown = computed(() => {
    const map = new Map();

    for (const t of transactions.value) {
      if (t.amount >= 0) continue; // only expenses
      
      const cat = t.categories;
      const key = cat?.name ?? 'Uncategorised';
      const existing = map.get(key);

      if (existing) {
        existing.total += Math.abs(Number(t.amount));
      } else {
        map.set(key, {
          name: key,
          color: cat?.color ?? '#6b7280',
          icon: cat?.icon ?? 'i-heroicons-ellipsis-horizontal',
          total: Math.abs(Number(t.amount)),
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  });

  // ── Group by date ──────────────────────────────────────────

  const groupedByDate = computed(() => {
    const groups = [];

    for (const t of transactions.value) {
      const last = groups[groups.length - 1];
      if (last && last.date === t.date) {
        last.items.push(t);
      } else {
        groups.push({ date: t.date, items: [t] });
      }
    }

    return groups;
  });

  return {
    transactions,
    loading,
    fetchTransactions,
    addTransaction,
    deleteTransaction,
    totalIncome,
    totalExpenses,
    netBalance,
    categoryBreakdown,
    groupedByDate,
  };
}
