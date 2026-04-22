import { computed, ref } from 'vue'

const mbStrategies = ref([])
const streamTypes = ref([])
const loading = ref(false)

export const useDropdownOptions = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const fetchOptions = async () => {
    if (!user.value?.sub) return
    loading.value = true
    try {
      const [{ data: mbData }, { data: stData }] = await Promise.all([
        supabase
          .from('mb_strategies')
          .select('name')
          .eq('user_id', user.value.sub)
          .eq('is_archived', false)
          .order('created_at', { ascending: true }),
        supabase
          .from('profit_stream_types')
          .select('name')
          .eq('user_id', user.value.sub)
          .eq('is_archived', false)
          .order('created_at', { ascending: true })
      ])

      mbStrategies.value = Array.from(new Set(
        (mbData || []).map((r) => String(r.name || '').trim()).filter(Boolean)
      ))

      streamTypes.value = Array.from(new Set(
        (stData || []).map((r) => String(r.name || '').trim()).filter(Boolean)
      ))
    } finally {
      loading.value = false
    }
  }

  const addMbStrategy = async (name) => {
    if (!user.value?.sub) return { error: null }
    const clean = String(name || '').trim()
    if (!clean) return { error: null }

    const { error } = await supabase
      .from('mb_strategies')
      .insert({ user_id: user.value.sub, name: clean })

    if (!error && !mbStrategies.value.includes(clean)) {
      mbStrategies.value.push(clean)
    }
    return { error }
  }

  const addStreamType = async (name) => {
    if (!user.value?.sub) return { error: null }
    const clean = String(name || '').trim()
    if (!clean) return { error: null }

    const { error } = await supabase
      .from('profit_stream_types')
      .insert({ user_id: user.value.sub, name: clean })

    if (!error && !streamTypes.value.includes(clean)) {
      streamTypes.value.push(clean)
    }
    return { error }
  }

  const mbStrategyOptions = computed(() => mbStrategies.value)
  const streamTypeOptions = computed(() => streamTypes.value)

  return {
    loading,
    mbStrategyOptions,
    streamTypeOptions,
    fetchOptions,
    addMbStrategy,
    addStreamType
  }
}

