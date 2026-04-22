import { computed, ref } from 'vue'

const payables = ref([])
const loading = ref(false)

export const usePayables = () => {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  const fetchPayables = async () => {
    if (!user.value?.sub) return
    loading.value = true
    try {
      const { data } = await supabase
        .from('payables')
        .select('*')
        .eq('user_id', user.value.sub)
        .order('status', { ascending: true })
        .order('owed_date', { ascending: false })
        .order('created_at', { ascending: false })

      payables.value = data || []
    } finally {
      loading.value = false
    }
  }

  const addPayable = async (payload) => {
    if (!user.value?.sub) return null

    const { data, error } = await supabase
      .from('payables')
      .insert({
        user_id: user.value.sub,
        person_name: payload.person_name,
        description: payload.description || null,
        amount_total: Number(payload.amount_total),
        amount_paid: Number(payload.amount_paid || 0),
        owed_date: payload.owed_date,
        due_date: payload.due_date || null,
        status: payload.status || 'open',
        notes: payload.notes || null
      })
      .select('*')
      .single()

    if (error || !data) return { data: null, error }
    payables.value.unshift(data)
    return { data, error: null }
  }

  const updatePayable = async (payableId, updates) => {
    if (!user.value?.sub) return null

    const { data, error } = await supabase
      .from('payables')
      .update(updates)
      .eq('id', payableId)
      .eq('user_id', user.value.sub)
      .select('*')
      .single()

    if (error || !data) return { data: null, error }

    const idx = payables.value.findIndex((item) => item.id === payableId)
    if (idx !== -1) payables.value[idx] = data
    return { data, error: null }
  }

  const deletePayable = async (payableId) => {
    if (!user.value?.sub) return null

    const { error } = await supabase
      .from('payables')
      .delete()
      .eq('id', payableId)
      .eq('user_id', user.value.sub)

    if (!error) {
      payables.value = payables.value.filter((item) => item.id !== payableId)
    }

    return { error }
  }

  const payableRows = computed(() => {
    return payables.value.map((item) => {
      const total = Number(item.amount_total || 0)
      const paid = Number(item.amount_paid || 0)
      const outstanding = Math.max(total - paid, 0)
      const status = outstanding <= 0 ? 'settled' : (item.status || 'open')

      return {
        ...item,
        total,
        paid,
        outstanding,
        status
      }
    })
  })

  const totalOutstanding = computed(() =>
    payableRows.value.reduce((sum, item) => sum + Number(item.outstanding || 0), 0)
  )

  return {
    payables,
    payableRows,
    totalOutstanding,
    loading,
    fetchPayables,
    addPayable,
    updatePayable,
    deletePayable
  }
}

