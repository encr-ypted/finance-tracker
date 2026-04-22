import { computed, ref } from 'vue'

const streams = ref([])
const events = ref([])
const loadingStreams = ref(false)
const loadingEvents = ref(false)

export const useProfit = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const fetchStreams = async () => {
    if (!user.value?.sub) return
    loadingStreams.value = true
    try {
      const { data } = await supabase
        .from('profit_streams')
        .select('*')
        .eq('user_id', user.value.sub)
        .order('is_archived', { ascending: true })
        .order('name', { ascending: true })
      streams.value = data || []
    } finally {
      loadingStreams.value = false
    }
  }

  const addStream = async (payload) => {
    if (!user.value?.sub) return { data: null, error: null }
    const { data, error } = await supabase
      .from('profit_streams')
      .insert({
        user_id: user.value.sub,
        name: payload.name,
        type: payload.type || 'other',
        currency: payload.currency || 'GBP',
        is_archived: Boolean(payload.is_archived || false)
      })
      .select('*')
      .single()

    if (!error && data) streams.value.push(data)
    return { data, error }
  }

  const updateStream = async (streamId, updates) => {
    if (!user.value?.sub) return { data: null, error: null }
    const { data, error } = await supabase
      .from('profit_streams')
      .update(updates)
      .eq('id', streamId)
      .eq('user_id', user.value.sub)
      .select('*')
      .single()

    if (!error && data) {
      const idx = streams.value.findIndex((s) => s.id === streamId)
      if (idx !== -1) streams.value[idx] = data
    }
    return { data, error }
  }

  const fetchEvents = async (options = {}) => {
    if (!user.value?.sub) return
    loadingEvents.value = true
    try {
      let query = supabase
        .from('profit_events')
        .select('*, profit_streams(name, type, currency)')
        .eq('user_id', user.value.sub)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false })

      if (options.streamId) query = query.eq('stream_id', options.streamId)
      if (options.from) query = query.gte('date', options.from)
      if (options.to) query = query.lte('date', options.to)

      const { data } = await query
      events.value = data || []
    } finally {
      loadingEvents.value = false
    }
  }

  const addEvent = async (payload) => {
    if (!user.value?.sub) return { data: null, error: null }
    const { data, error } = await supabase
      .from('profit_events')
      .insert({
        user_id: user.value.sub,
        stream_id: payload.stream_id,
        date: payload.date,
        amount: Number(payload.amount),
        category: payload.category || 'general',
        counterparty: payload.counterparty || null,
        notes: payload.notes || null
      })
      .select('*, profit_streams(name, type, currency)')
      .single()

    if (!error && data) events.value.unshift(data)
    return { data, error }
  }

  const updateEvent = async (eventId, updates) => {
    if (!user.value?.sub) return { data: null, error: null }
    const { data, error } = await supabase
      .from('profit_events')
      .update(updates)
      .eq('id', eventId)
      .eq('user_id', user.value.sub)
      .select('*, profit_streams(name, type, currency)')
      .single()

    if (!error && data) {
      const idx = events.value.findIndex((e) => e.id === eventId)
      if (idx !== -1) events.value[idx] = data
    }
    return { data, error }
  }

  const deleteEvent = async (eventId) => {
    if (!user.value?.sub) return { error: null }
    const { error } = await supabase
      .from('profit_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', user.value.sub)

    if (!error) events.value = events.value.filter((e) => e.id !== eventId)
    return { error }
  }

  const streamTotals = computed(() => {
    const map = new Map()
    for (const e of events.value) {
      const streamId = e.stream_id
      const current = Number(map.get(streamId) || 0)
      map.set(streamId, current + Number(e.amount || 0))
    }
    return map
  })

  const totalProfit = computed(() =>
    events.value.reduce((sum, e) => sum + Number(e.amount || 0), 0)
  )

  return {
    streams,
    events,
    loadingStreams,
    loadingEvents,
    fetchStreams,
    addStream,
    updateStream,
    fetchEvents,
    addEvent,
    updateEvent,
    deleteEvent,
    streamTotals,
    totalProfit
  }
}

