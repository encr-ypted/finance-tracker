import { computed, ref } from 'vue'

const accounts = ref([])
const pockets = ref([])
const transfers = ref([])
const snapshots = ref([])
const transactionRows = ref([])
const loading = ref(false)

export const useAccounts = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const fetchAccounts = async () => {
    if (!user.value?.sub) return
    const { data } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', user.value.sub)
      .order('created_at', { ascending: false })
    accounts.value = data || []
  }

  const fetchPockets = async () => {
    if (!user.value?.sub) return
    const { data } = await supabase
      .from('pockets')
      .select('*')
      .eq('user_id', user.value.sub)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })
    pockets.value = data || []
  }

  const fetchTransfers = async () => {
    if (!user.value?.sub) return
    const { data } = await supabase
      .from('account_transfers')
      .select('*, from_account:from_account_id(name), to_account:to_account_id(name)')
      .eq('user_id', user.value.sub)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    transfers.value = data || []
  }

  const fetchAccountTransactionRows = async () => {
    if (!user.value?.sub) return
    const { data } = await supabase
      .from('transactions')
      .select('account_id, amount, date')
      .eq('user_id', user.value.sub)
      .not('account_id', 'is', null)
    transactionRows.value = data || []
  }

  const fetchSnapshots = async () => {
    if (!user.value?.sub) return
    const { data } = await supabase
      .from('account_snapshots')
      .select('*')
      .eq('user_id', user.value.sub)
      .order('snapshot_date', { ascending: false })
    snapshots.value = data || []
  }

  const refresh = async () => {
    if (!user.value?.sub) return
    loading.value = true
    try {
      await Promise.all([
        fetchAccounts(),
        fetchPockets(),
        fetchTransfers(),
        fetchSnapshots(),
        fetchAccountTransactionRows()
      ])
    } finally {
      loading.value = false
    }
  }

  const addAccount = async (payload) => {
    if (!user.value?.sub) return null
    const { data, error } = await supabase
      .from('accounts')
      .insert({
        user_id: user.value.sub,
        name: payload.name,
        type: payload.type || 'bank',
        provider: payload.provider || null,
        currency: payload.currency || 'GBP',
        opening_balance: Number(payload.opening_balance || 0),
        tracking_start_date: payload.tracking_start_date || null
      })
      .select()
      .single()
    if (error || !data) return null
    accounts.value.unshift(data)
    return data
  }

  const addPocket = async (payload) => {
    if (!user.value?.sub) return null
    const { data, error } = await supabase
      .from('pockets')
      .insert({
        user_id: user.value.sub,
        scope: payload.scope || 'global',
        account_id: payload.scope === 'account' ? payload.account_id : null,
        name: payload.name,
        target_amount: payload.target_amount ? Number(payload.target_amount) : null,
        current_amount: Number(payload.current_amount || 0),
        color: payload.color || null
      })
      .select()
      .single()
    if (error || !data) return null
    pockets.value.unshift(data)
    return data
  }

  const addTransfer = async (payload) => {
    if (!user.value?.sub) return null
    const { data, error } = await supabase
      .from('account_transfers')
      .insert({
        user_id: user.value.sub,
        from_account_id: payload.from_account_id,
        to_account_id: payload.to_account_id,
        amount: Number(payload.amount),
        date: payload.date,
        description: payload.description || null
      })
      .select('*, from_account:from_account_id(name), to_account:to_account_id(name)')
      .single()
    if (error || !data) return null
    transfers.value.unshift(data)
    return data
  }

  const addSnapshot = async (payload) => {
    if (!user.value?.sub) return null
    const { data, error } = await supabase
      .from('account_snapshots')
      .upsert({
        user_id: user.value.sub,
        account_id: payload.account_id,
        snapshot_date: payload.snapshot_date,
        market_value: Number(payload.market_value),
        note: payload.note || null
      }, { onConflict: 'account_id,snapshot_date' })
      .select()
      .single()
    if (error || !data) return null
    await fetchSnapshots()
    return data
  }

  const latestSnapshotByAccount = computed(() => {
    const map = new Map()
    for (const snap of snapshots.value) {
      if (!map.has(snap.account_id)) {
        map.set(snap.account_id, snap)
      }
    }
    return map
  })

  const transactionNetByAccount = computed(() => {
    const trackingStartByAccount = new Map(
      accounts.value.map((account) => [account.id, account.tracking_start_date || null])
    )
    const map = new Map()
    for (const row of transactionRows.value) {
      const trackingStart = trackingStartByAccount.get(row.account_id)
      if (trackingStart && row.date < trackingStart) continue
      const current = Number(map.get(row.account_id) || 0)
      map.set(row.account_id, current + Number(row.amount || 0))
    }
    return map
  })

  const transferNetByAccount = computed(() => {
    const trackingStartByAccount = new Map(
      accounts.value.map((account) => [account.id, account.tracking_start_date || null])
    )
    const map = new Map()
    for (const transfer of transfers.value) {
      const fromTrackingStart = trackingStartByAccount.get(transfer.from_account_id)
      const toTrackingStart = trackingStartByAccount.get(transfer.to_account_id)
      const fromCurrent = Number(map.get(transfer.from_account_id) || 0)
      const toCurrent = Number(map.get(transfer.to_account_id) || 0)
      const amount = Number(transfer.amount || 0)
      if (!fromTrackingStart || transfer.date >= fromTrackingStart) {
        map.set(transfer.from_account_id, fromCurrent - amount)
      }
      if (!toTrackingStart || transfer.date >= toTrackingStart) {
        map.set(transfer.to_account_id, toCurrent + amount)
      }
    }
    return map
  })

  return {
    accounts,
    pockets,
    transfers,
    snapshots,
    latestSnapshotByAccount,
    transactionNetByAccount,
    transferNetByAccount,
    loading,
    refresh,
    addAccount,
    addPocket,
    addTransfer,
    addSnapshot
  }
}
