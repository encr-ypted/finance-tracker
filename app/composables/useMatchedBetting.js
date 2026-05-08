import { computed, ref } from 'vue'

const sites = ref([])
const cycles = ref([])
const bankrollSnapshots = ref([])
const fundingFlows = ref([])
const profitWindows = ref([])
const reconciliationSettings = ref(null)
const profitPeriods = ref([])
const periodCapitalEvents = ref([])
const loadingSites = ref(false)
const loadingCycles = ref(false)
const loadingReconciliation = ref(false)

export const useMatchedBetting = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const fetchSites = async () => {
    if (!user.value?.sub) return
    loadingSites.value = true
    try {
      const { data } = await supabase
        .from('mb_sites')
        .select('*')
        .eq('user_id', user.value.sub)
        .order('created_at', { ascending: false })
      sites.value = data || []
    } finally {
      loadingSites.value = false
    }
  }

  const addSite = async (payload) => {
    if (!user.value?.sub) return { data: null, error: null }
    const { data, error } = await supabase
      .from('mb_sites')
      .insert({
        user_id: user.value.sub,
        name: payload.name,
        kind: payload.kind,
        tracking_start_date: payload.tracking_start_date || null,
        current_balance: Number(payload.current_balance || 0),
        status: payload.status || 'active',
        bet_state: payload.bet_state || 'none',
        notes: payload.notes || null
      })
      .select('*')
      .single()

    if (!error && data) sites.value.unshift(data)
    return { data, error }
  }

  const updateSite = async (siteId, updates) => {
    if (!user.value?.sub) return { data: null, error: null }
    const { data, error } = await supabase
      .from('mb_sites')
      .update(updates)
      .eq('id', siteId)
      .eq('user_id', user.value.sub)
      .select('*')
      .single()

    if (!error && data) {
      const idx = sites.value.findIndex((s) => s.id === siteId)
      if (idx !== -1) sites.value[idx] = data
    }
    return { data, error }
  }

  const fetchCycles = async (options = {}) => {
    if (!user.value?.sub) return
    loadingCycles.value = true
    try {
      let query = supabase
        .from('mb_cycles')
        .select('*, mb_sites(name, kind)')
        .eq('user_id', user.value.sub)
        .order('start_date', { ascending: false })
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (options.siteId) query = query.eq('site_id', options.siteId)
      if (options.strategy) query = query.eq('strategy', options.strategy)
      if (options.from) query = query.gte('date', options.from)
      if (options.to) query = query.lte('date', options.to)

      const { data } = await query
      cycles.value = data || []
    } finally {
      loadingCycles.value = false
    }
  }

  const fetchBankrollSnapshots = async () => {
    if (!user.value?.sub) return
    loadingReconciliation.value = true
    try {
      const { data } = await supabase
        .from('mb_bankroll_snapshots')
        .select('*')
        .eq('user_id', user.value.sub)
        .order('snapshot_date', { ascending: false })
        .order('created_at', { ascending: false })
      bankrollSnapshots.value = data || []
    } finally {
      loadingReconciliation.value = false
    }
  }

  const addBankrollSnapshot = async (payload) => {
    if (!user.value?.sub) return { data: null, error: null }
    const { data, error } = await supabase
      .from('mb_bankroll_snapshots')
      .upsert({
        user_id: user.value.sub,
        snapshot_date: payload.snapshot_date,
        total_bankroll: Number(payload.total_bankroll),
        note: payload.note || null
      }, { onConflict: 'user_id,snapshot_date' })
      .select('*')
      .single()

    if (!error && data) await fetchBankrollSnapshots()
    return { data, error }
  }

  const fetchFundingFlows = async () => {
    if (!user.value?.sub) return
    loadingReconciliation.value = true
    try {
      const { data } = await supabase
        .from('mb_funding_flows')
        .select('*, mb_sites(name)')
        .eq('user_id', user.value.sub)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })
      fundingFlows.value = data || []
    } finally {
      loadingReconciliation.value = false
    }
  }

  const addFundingFlow = async (payload) => {
    if (!user.value?.sub) return { data: null, error: null }
    const { data, error } = await supabase
      .from('mb_funding_flows')
      .insert({
        user_id: user.value.sub,
        site_id: payload.site_id || null,
        date: payload.date,
        amount: Number(payload.amount),
        direction: payload.direction,
        note: payload.note || null
      })
      .select('*, mb_sites(name)')
      .single()

    if (!error && data) fundingFlows.value.unshift(data)
    return { data, error }
  }

  const fetchProfitWindows = async () => {
    if (!user.value?.sub) return
    loadingReconciliation.value = true
    try {
      const { data } = await supabase
        .from('mb_profit_windows')
        .select('*')
        .eq('user_id', user.value.sub)
        .order('start_date', { ascending: false })
        .order('created_at', { ascending: false })
      profitWindows.value = data || []
    } finally {
      loadingReconciliation.value = false
    }
  }

  const addProfitWindow = async (payload) => {
    if (!user.value?.sub) return { data: null, error: null }
    const { data, error } = await supabase
      .from('mb_profit_windows')
      .insert({
        user_id: user.value.sub,
        name: payload.name,
        start_date: payload.start_date,
        end_date: payload.end_date,
        initial_capital: Number(payload.initial_capital),
        notes: payload.notes || null
      })
      .select('*')
      .single()
    if (!error && data) profitWindows.value.unshift(data)
    return { data, error }
  }

  const fetchReconciliationSettings = async () => {
    if (!user.value?.sub) return
    loadingReconciliation.value = true
    try {
      const { data } = await supabase
        .from('mb_reconciliation_settings')
        .select('*')
        .eq('user_id', user.value.sub)
        .maybeSingle()
      reconciliationSettings.value = data || { user_id: user.value.sub, total_transferred_bankroll: 0 }
    } finally {
      loadingReconciliation.value = false
    }
  }

  const saveReconciliationSettings = async (payload) => {
    if (!user.value?.sub) return { data: null, error: null }
    const { data, error } = await supabase
      .from('mb_reconciliation_settings')
      .upsert({
        user_id: user.value.sub,
        total_transferred_bankroll: Number(payload.total_transferred_bankroll || 0)
      })
      .select('*')
      .single()
    if (!error && data) reconciliationSettings.value = data
    return { data, error }
  }

  const fetchProfitPeriods = async () => {
    if (!user.value?.sub) return
    loadingReconciliation.value = true
    try {
      const { data } = await supabase
        .from('mb_profit_periods')
        .select('*')
        .eq('user_id', user.value.sub)
        .order('start_date', { ascending: false })
        .order('created_at', { ascending: false })
      profitPeriods.value = data || []
    } finally {
      loadingReconciliation.value = false
    }
  }

  const addProfitPeriod = async (payload) => {
    if (!user.value?.sub) return { data: null, error: null }
    const { data, error } = await supabase
      .from('mb_profit_periods')
      .insert({
        user_id: user.value.sub,
        name: payload.name,
        start_date: payload.start_date,
        end_date: payload.end_date || null,
        starting_capital: Number(payload.starting_capital || 0),
        final_profit: payload.final_profit == null ? null : Number(payload.final_profit),
        notes: payload.notes || null
      })
      .select('*')
      .single()
    if (!error && data) profitPeriods.value.unshift(data)
    return { data, error }
  }

  const updateProfitPeriod = async (periodId, updates) => {
    if (!user.value?.sub) return { data: null, error: null }
    const safeUpdates = { ...updates }
    if ('starting_capital' in safeUpdates) safeUpdates.starting_capital = Number(safeUpdates.starting_capital || 0)
    if ('final_profit' in safeUpdates && safeUpdates.final_profit != null) safeUpdates.final_profit = Number(safeUpdates.final_profit)

    const { data, error } = await supabase
      .from('mb_profit_periods')
      .update(safeUpdates)
      .eq('id', periodId)
      .eq('user_id', user.value.sub)
      .select('*')
      .single()
    if (!error && data) {
      const idx = profitPeriods.value.findIndex((p) => p.id === periodId)
      if (idx !== -1) profitPeriods.value[idx] = data
    }
    return { data, error }
  }

  const fetchPeriodCapitalEvents = async () => {
    if (!user.value?.sub) return
    loadingReconciliation.value = true
    try {
      const { data } = await supabase
        .from('mb_period_capital_events')
        .select('*')
        .eq('user_id', user.value.sub)
        .order('event_date', { ascending: false })
        .order('created_at', { ascending: false })
      periodCapitalEvents.value = data || []
    } finally {
      loadingReconciliation.value = false
    }
  }

  const addPeriodCapitalEvent = async (payload) => {
    if (!user.value?.sub) return { data: null, error: null }
    const { data, error } = await supabase
      .from('mb_period_capital_events')
      .insert({
        user_id: user.value.sub,
        period_id: payload.period_id,
        event_date: payload.event_date,
        direction: payload.direction,
        amount: Number(payload.amount),
        note: payload.note || null
      })
      .select('*')
      .single()
    if (!error && data) periodCapitalEvents.value.unshift(data)
    return { data, error }
  }

  const addCycle = async (payload) => {
    if (!user.value?.sub) return { data: null, error: null }
    const { data, error } = await supabase
      .from('mb_cycles')
      .insert({
        user_id: user.value.sub,
        site_id: payload.site_id,
        start_date: payload.start_date || null,
        date: payload.date,
        strategy: payload.strategy,
        offer_name: payload.offer_name || '',
        qualifier_pnl: Number(payload.qualifier_pnl || 0),
        freebet_pnl: Number(payload.freebet_pnl || 0),
        adjustments: Number(payload.adjustments || 0),
        status: payload.status || 'completed',
        notes: payload.notes || null
      })
      .select('*, mb_sites(name, kind)')
      .single()

    if (!error && data) cycles.value.unshift(data)
    return { data, error }
  }

  const updateCycle = async (cycleId, updates) => {
    if (!user.value?.sub) return { data: null, error: null }

    const { data, error } = await supabase
      .from('mb_cycles')
      .update(updates)
      .eq('id', cycleId)
      .eq('user_id', user.value.sub)
      .select('*, mb_sites(name, kind)')
      .single()

    if (!error && data) {
      const idx = cycles.value.findIndex((c) => c.id === cycleId)
      if (idx !== -1) cycles.value[idx] = data
    }
    return { data, error }
  }

  const deleteCycle = async (cycleId) => {
    if (!user.value?.sub) return { error: null }
    const { error } = await supabase
      .from('mb_cycles')
      .delete()
      .eq('id', cycleId)
      .eq('user_id', user.value.sub)

    if (!error) cycles.value = cycles.value.filter((c) => c.id !== cycleId)
    return { error }
  }

  const bankrollTotal = computed(() =>
    sites.value.reduce((sum, s) => sum + Number(s.current_balance || 0), 0)
  )

  const profitToDate = computed(() =>
    cycles.value.reduce((sum, c) => sum + Number(c.net_profit || 0), 0)
  )

  const profitByStrategy = computed(() => {
    const map = new Map()
    for (const c of cycles.value) {
      const key = c.strategy || 'other'
      const current = Number(map.get(key) || 0)
      map.set(key, current + Number(c.net_profit || 0))
    }
    return map
  })

  const profitBySite = computed(() => {
    const map = new Map()
    for (const c of cycles.value) {
      const key = c.site_id
      const current = Number(map.get(key) || 0)
      map.set(key, current + Number(c.net_profit || 0))
    }
    return map
  })

  const sitesNeedingAttention = computed(() => {
    return sites.value.filter((s) => s.bet_state !== 'none' || s.status !== 'active')
  })

  return {
    sites,
    cycles,
    bankrollSnapshots,
    fundingFlows,
    profitWindows,
    reconciliationSettings,
    profitPeriods,
    periodCapitalEvents,
    loadingSites,
    loadingCycles,
    loadingReconciliation,
    fetchSites,
    addSite,
    updateSite,
    fetchCycles,
    addCycle,
    updateCycle,
    deleteCycle,
    fetchBankrollSnapshots,
    addBankrollSnapshot,
    fetchFundingFlows,
    addFundingFlow,
    fetchProfitWindows,
    addProfitWindow,
    fetchReconciliationSettings,
    saveReconciliationSettings,
    fetchProfitPeriods,
    addProfitPeriod,
    updateProfitPeriod,
    fetchPeriodCapitalEvents,
    addPeriodCapitalEvent,
    bankrollTotal,
    profitToDate,
    profitByStrategy,
    profitBySite,
    sitesNeedingAttention
  }
}

