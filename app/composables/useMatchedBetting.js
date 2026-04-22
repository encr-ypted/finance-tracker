import { computed, ref } from 'vue'

const sites = ref([])
const cycles = ref([])
const loadingSites = ref(false)
const loadingCycles = ref(false)

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
    loadingSites,
    loadingCycles,
    fetchSites,
    addSite,
    updateSite,
    fetchCycles,
    addCycle,
    updateCycle,
    deleteCycle,
    bankrollTotal,
    profitToDate,
    profitByStrategy,
    profitBySite,
    sitesNeedingAttention
  }
}

