import { computed, ref } from 'vue'

const receivables = ref([])
const loading = ref(false)

export const useReceivables = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const fetchReceivables = async () => {
    if (!user.value?.sub) return
    loading.value = true
    try {
      const { data } = await supabase
        .from('receivables')
        .select('*')
        .eq('user_id', user.value.sub)
        .order('status', { ascending: true })
        .order('lent_date', { ascending: false })
        .order('created_at', { ascending: false })

      receivables.value = data || []
    } finally {
      loading.value = false
    }
  }

  const addReceivable = async (payload) => {
    if (!user.value?.sub) return null

    const { data, error } = await supabase
      .from('receivables')
      .insert({
        user_id: user.value.sub,
        person_name: payload.person_name,
        description: payload.description || null,
        amount_total: Number(payload.amount_total),
        amount_repaid: Number(payload.amount_repaid || 0),
        lent_date: payload.lent_date,
        due_date: payload.due_date || null,
        status: payload.status || 'open',
        notes: payload.notes || null
      })
      .select('*')
      .single()

    if (error || !data) return { data: null, error }
    receivables.value.unshift(data)
    return { data, error: null }
  }

  const updateReceivable = async (receivableId, updates) => {
    if (!user.value?.sub) return null

    const { data, error } = await supabase
      .from('receivables')
      .update(updates)
      .eq('id', receivableId)
      .eq('user_id', user.value.sub)
      .select('*')
      .single()

    if (error || !data) return { data: null, error }

    const idx = receivables.value.findIndex((item) => item.id === receivableId)
    if (idx !== -1) receivables.value[idx] = data
    return { data, error: null }
  }

  const deleteReceivable = async (receivableId) => {
    if (!user.value?.sub) return null

    const { error } = await supabase
      .from('receivables')
      .delete()
      .eq('id', receivableId)
      .eq('user_id', user.value.sub)

    if (!error) {
      receivables.value = receivables.value.filter((item) => item.id !== receivableId)
    }

    return { error }
  }

  const receivableRows = computed(() => {
    return receivables.value.map((item) => {
      const total = Number(item.amount_total || 0)
      const repaid = Number(item.amount_repaid || 0)
      const outstanding = Math.max(total - repaid, 0)
      const status = outstanding <= 0 ? 'settled' : (item.status || 'open')

      return {
        ...item,
        total,
        repaid,
        outstanding,
        status
      }
    })
  })

  const totalOutstanding = computed(() =>
    receivableRows.value.reduce((sum, item) => sum + Number(item.outstanding || 0), 0)
  )

  return {
    receivables,
    receivableRows,
    totalOutstanding,
    loading,
    fetchReceivables,
    addReceivable,
    updateReceivable,
    deleteReceivable
  }
}
