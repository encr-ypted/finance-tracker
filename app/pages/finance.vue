<script setup>
import { computed, defineAsyncComponent, reactive, watch } from 'vue'

const {
  transactions,
  fetchTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  loading
} = useTransactions()

const { categories, fetchCategories, addCategory, updateCategory, deleteCategory } = useCategories()
const {
  accounts,
  pockets,
  transfers,
  latestSnapshotByAccount,
  snapshots,
  transactionNetByAccount,
  transferNetByAccount,
  refresh: refreshAccounts,
  addAccount,
  addTransfer,
  addSnapshot
} = useAccounts()
const {
  receivableRows,
  totalOutstanding,
  fetchReceivables,
  addReceivable,
  updateReceivable,
  deleteReceivable
} = useReceivables()
const {
  payableRows,
  totalOutstanding: totalPayableOutstanding,
  fetchPayables,
  addPayable,
  updatePayable,
  deletePayable
} = usePayables()
const user = useSupabaseUser()
const ApexChart = defineAsyncComponent(() => import('vue3-apexcharts'))

const today = new Date()
const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)

const filters = reactive({
  mode: 'month',
  from: formatDate(monthStart),
  to: formatDate(monthEnd),
  monthValue: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
  categoryId: '',
  accountId: ''
})

const form = reactive({
  description: '',
  amount: '',
  categoryId: '',
  accountId: '',
  date: formatDate(today)
})

const submitting = ref(false)
const formError = ref('')
const categoryPanelOpen = ref(false)
const savingCategoryId = ref('')
const categoryDraft = reactive({
  name: '',
  type: 'expense',
  color: '#818cf8'
})
const accountDraft = reactive({
  name: '',
  type: 'bank',
  provider: '',
  opening_balance: '',
  tracking_start_date: formatDate(today)
})
const transferDraft = reactive({
  from_account_id: '',
  to_account_id: '',
  amount: '',
  date: formatDate(today),
  description: ''
})
const snapshotDraft = reactive({
  account_id: '',
  snapshot_date: formatDate(today),
  market_value: '',
  note: ''
})
const receivableDraft = reactive({
  person_name: '',
  description: '',
  amount_total: '',
  amount_repaid: '',
  lent_date: formatDate(today),
  due_date: '',
  notes: ''
})
const receivableError = ref('')
const repaymentDraftById = reactive({})

const payableDraft = reactive({
  person_name: '',
  description: '',
  amount_total: '',
  amount_paid: '',
  owed_date: formatDate(today),
  due_date: '',
  notes: ''
})
const payableError = ref('')
const paidDraftById = reactive({})

const editTransactionDrawerOpen = ref(false)
const editingTransactionId = ref(null)
const editSubmitting = ref(false)
const editFormError = ref('')
const editForm = reactive({
  description: '',
  amount: '',
  categoryId: '',
  accountId: '',
  date: formatDate(today)
})

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function money(value) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 2
  }).format(value || 0)
}

const selectedCategory = computed(() =>
  categories.value.find((cat) => cat.id === form.categoryId)
)

const selectedEditCategory = computed(() =>
  categories.value.find((cat) => cat.id === editForm.categoryId)
)

const filteredTransactions = computed(() => {
  return transactions.value.filter((txn) => {
    const passCategory = !filters.categoryId || txn.category_id === filters.categoryId
    return passCategory
  })
})

const chartByCategory = computed(() => {
  const bucket = new Map()

  for (const txn of filteredTransactions.value) {
    if (Number(txn.amount) >= 0) continue
    const key = txn.categories?.name || 'Uncategorised'
    const prev = bucket.get(key) || { total: 0, color: txn.categories?.color || '#6b7280' }
    prev.total += Math.abs(Number(txn.amount))
    bucket.set(key, prev)
  }

  return Array.from(bucket.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
})

const incomeByCategory = computed(() => {
  const bucket = new Map()

  for (const txn of filteredTransactions.value) {
    if (Number(txn.amount) <= 0) continue
    const key = txn.categories?.name || 'Uncategorised'
    const prev = bucket.get(key) || { total: 0, color: txn.categories?.color || '#34d399' }
    prev.total += Number(txn.amount)
    bucket.set(key, prev)
  }

  return Array.from(bucket.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.total - a.total)
})

const expensePieSeries = computed(() => chartByCategory.value.map((item) => Number(item.total.toFixed(2))))
const expensePieOptions = computed(() => ({
  labels: chartByCategory.value.map((item) => item.name),
  colors: chartByCategory.value.map((item) => item.color || '#818cf8'),
  legend: {
    position: 'bottom',
    labels: {
      colors: '#cbd5e1'
    }
  },
  dataLabels: {
    enabled: true,
    style: { colors: ['#0b1020'] }
  },
  stroke: {
    colors: ['#0a0a0f']
  },
  tooltip: {
    y: {
      formatter: (val) => money(val)
    }
  },
  plotOptions: {
    pie: {
      donut: {
        size: '62%'
      }
    }
  }
}))

const totalIncome = computed(() =>
  filteredTransactions.value
    .filter((txn) => Number(txn.amount) > 0)
    .reduce((sum, txn) => sum + Number(txn.amount), 0)
)

const totalExpenses = computed(() =>
  filteredTransactions.value
    .filter((txn) => Number(txn.amount) < 0)
    .reduce((sum, txn) => sum + Math.abs(Number(txn.amount)), 0)
)

const net = computed(() => totalIncome.value - totalExpenses.value)

const snapshotHistoryByAccount = computed(() => {
  const map = new Map()
  for (const snap of snapshots.value) {
    if (!map.has(snap.account_id)) map.set(snap.account_id, [])
    map.get(snap.account_id).push(snap)
  }

  // Sort latest-first, in case the backend ordering changes or dates tie.
  for (const [accountId, list] of map.entries()) {
    list.sort((a, b) => {
      const ad = a.snapshot_date ? new Date(a.snapshot_date).getTime() : 0
      const bd = b.snapshot_date ? new Date(b.snapshot_date).getTime() : 0
      if (bd !== ad) return bd - ad

      const ac = a.created_at ? new Date(a.created_at).getTime() : 0
      const bc = b.created_at ? new Date(b.created_at).getTime() : 0
      return bc - ac
    })
    map.set(accountId, list)
  }

  return map
})

const accountBalanceRows = computed(() => {
  return accounts.value.map((account) => {
    const txNet = Number(transactionNetByAccount.value.get(account.id) || 0)
    const transferNet = Number(transferNetByAccount.value.get(account.id) || 0)
    const ledgerBalance = Number(account.opening_balance || 0) + txNet + transferNet

    const history = snapshotHistoryByAccount.value.get(account.id) || []
    const latest = history[0]
    const displayBalance = account.type === 'investment' && latest
      ? Number(latest.market_value || 0)
      : ledgerBalance

    return {
      ...account,
      ledgerBalance,
      displayBalance,
      snapshotDate: latest?.snapshot_date || null,
      snapshotCount: history.length,
      recentSnapshots: history.slice(0, 3)
    }
  })
})
const visiblePockets = computed(() => pockets.value.filter((p) => !p.is_archived))
const totalAvailableAcrossAccounts = computed(() =>
  accountBalanceRows.value.reduce((sum, acc) => sum + Number(acc.displayBalance || 0), 0)
)
const totalPocketedAmount = computed(() =>
  visiblePockets.value.reduce((sum, p) => sum + Number(p.current_amount || 0), 0)
)
const unpocketedAmount = computed(() => totalAvailableAcrossAccounts.value - totalPocketedAmount.value)
const pocketedByAccount = computed(() => {
  const map = new Map()
  for (const p of visiblePockets.value) {
    if (!p.account_id) continue
    const current = Number(map.get(p.account_id) || 0)
    map.set(p.account_id, current + Number(p.current_amount || 0))
  }
  return map
})
const accountUnpocketedRows = computed(() => {
  return accountBalanceRows.value.map((acc) => {
    const pocketed = Number(pocketedByAccount.value.get(acc.id) || 0)
    const unpocketed = Number(acc.displayBalance || 0) - pocketed
    return { ...acc, pocketed, unpocketed }
  })
})
const periodLabel = computed(() => {
  if (filters.mode === 'week') return 'Current week'
  if (filters.mode === 'month') return 'Current month'
  if (filters.mode === 'specificMonth') return `Month: ${filters.monthValue}`
  if (filters.mode === 'year') return 'Current year'
  if (filters.mode === 'all') return 'All time'
  return `${filters.from} to ${filters.to}`
})

async function refreshData() {
  const { from, to } = getRangeFromMode()
  await fetchTransactions(from, to, filters.categoryId || undefined, filters.accountId || undefined)
}

function getRangeFromMode() {
  const now = new Date()

  if (filters.mode === 'all') {
    return { from: '1900-01-01', to: formatDate(now) }
  }

  if (filters.mode === 'year') {
    const start = new Date(now.getFullYear(), 0, 1)
    const end = new Date(now.getFullYear(), 11, 31)
    return { from: formatDate(start), to: formatDate(end) }
  }

  if (filters.mode === 'week') {
    const day = now.getDay() || 7
    const start = new Date(now)
    start.setDate(now.getDate() - day + 1)
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return { from: formatDate(start), to: formatDate(end) }
  }

  if (filters.mode === 'month') {
    return { from: formatDate(monthStart), to: formatDate(monthEnd) }
  }

  if (filters.mode === 'specificMonth') {
    const [yearStr, monthStr] = String(filters.monthValue || '').split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    if (!year || !month || month < 1 || month > 12) {
      return { from: formatDate(monthStart), to: formatDate(monthEnd) }
    }
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0)
    return { from: formatDate(start), to: formatDate(end) }
  }

  return { from: filters.from, to: filters.to }
}

async function handleSubmit() {
  formError.value = ''

  if (!form.description || !form.amount || !form.categoryId || !form.date) {
    formError.value = 'Please fill description, amount, category and date.'
    return
  }

  const amountValue = Number(form.amount)
  if (!Number.isFinite(amountValue) || amountValue <= 0) {
    formError.value = 'Amount must be a valid number greater than 0.'
    return
  }

  submitting.value = true
  try {
    const normalizedAmount = selectedCategory.value?.type === 'expense'
      ? -Math.abs(amountValue)
      : Math.abs(amountValue)

    await addTransaction({
      description: form.description.trim(),
      amount: normalizedAmount,
      date: form.date,
      category_id: form.categoryId,
      account_id: form.accountId || null
    })

    form.description = ''
    form.amount = ''
    form.categoryId = ''
    form.accountId = ''
    await refreshAccounts()
  } finally {
    submitting.value = false
  }
}

function startEdit(txn) {
  editFormError.value = ''
  editingTransactionId.value = txn.id

  editForm.description = txn.description || ''
  editForm.amount = String(Math.abs(Number(txn.amount || 0)))
  editForm.categoryId = txn.category_id || ''
  editForm.accountId = txn.account_id || ''
  editForm.date = txn.date || formatDate(today)

  editTransactionDrawerOpen.value = true
}

async function handleUpdateTransaction() {
  editFormError.value = ''

  if (!editingTransactionId.value) return

  if (!editForm.description || !editForm.amount || !editForm.categoryId || !editForm.date) {
    editFormError.value = 'Please fill description, amount, category and date.'
    return
  }

  const amountValue = Number(editForm.amount)
  if (!Number.isFinite(amountValue) || amountValue <= 0) {
    editFormError.value = 'Amount must be a valid number greater than 0.'
    return
  }

  const normalizedAmount = selectedEditCategory.value?.type === 'expense'
    ? -Math.abs(amountValue)
    : Math.abs(amountValue)

  editSubmitting.value = true
  try {
    const { error } = await updateTransaction(editingTransactionId.value, {
      description: editForm.description.trim(),
      amount: normalizedAmount,
      date: editForm.date,
      category_id: editForm.categoryId,
      account_id: editForm.accountId || null
    })

    if (error) {
      editFormError.value = error.message || 'Failed to update transaction.'
      return
    }

    editTransactionDrawerOpen.value = false
    editingTransactionId.value = null
    await Promise.all([refreshData(), refreshAccounts()])
  } finally {
    editSubmitting.value = false
  }
}

async function handleRefreshAll() {
  await Promise.all([refreshData(), refreshAccounts(), fetchReceivables(), fetchPayables()])
}

async function handleAddAccount() {
  if (!accountDraft.name.trim()) return
  await addAccount({
    name: accountDraft.name.trim(),
    type: accountDraft.type,
    provider: accountDraft.provider.trim(),
    opening_balance: Number(accountDraft.opening_balance || 0),
    tracking_start_date: accountDraft.tracking_start_date || null
  })
  accountDraft.name = ''
  accountDraft.provider = ''
  accountDraft.opening_balance = ''
  accountDraft.tracking_start_date = formatDate(today)
}

async function handleAddTransfer() {
  if (!transferDraft.from_account_id || !transferDraft.to_account_id) return
  if (transferDraft.from_account_id === transferDraft.to_account_id) return
  if (!Number(transferDraft.amount)) return
  await addTransfer({
    ...transferDraft,
    amount: Number(transferDraft.amount)
  })
  transferDraft.amount = ''
  transferDraft.description = ''
  await refreshAccounts()
}

async function handleAddSnapshot() {
  if (!snapshotDraft.account_id || !snapshotDraft.market_value) return
  await addSnapshot({
    ...snapshotDraft,
    market_value: Number(snapshotDraft.market_value)
  })
  snapshotDraft.market_value = ''
  snapshotDraft.note = ''
}

async function handleAddReceivable() {
  receivableError.value = ''

  const total = Number(receivableDraft.amount_total)
  const repaid = Number(receivableDraft.amount_repaid || 0)

  if (!receivableDraft.person_name.trim()) {
    receivableError.value = 'Please add the person name.'
    return
  }

  if (!Number.isFinite(total) || total <= 0) {
    receivableError.value = 'Total amount must be greater than 0.'
    return
  }

  if (!Number.isFinite(repaid) || repaid < 0 || repaid > total) {
    receivableError.value = 'Repaid amount must be between 0 and the total amount.'
    return
  }

  const status = repaid >= total ? 'settled' : repaid > 0 ? 'partial' : 'open'
  const { error } = await addReceivable({
    person_name: receivableDraft.person_name.trim(),
    description: receivableDraft.description.trim(),
    amount_total: total,
    amount_repaid: repaid,
    lent_date: receivableDraft.lent_date,
    due_date: receivableDraft.due_date || null,
    notes: receivableDraft.notes.trim(),
    status
  })

  if (error) {
    receivableError.value = error.message || 'Failed to save receivable.'
    return
  }

  receivableDraft.person_name = ''
  receivableDraft.description = ''
  receivableDraft.amount_total = ''
  receivableDraft.amount_repaid = ''
  receivableDraft.lent_date = formatDate(today)
  receivableDraft.due_date = ''
  receivableDraft.notes = ''
}

async function handleRecordRepayment(item) {
  const nextRepaid = Number(repaymentDraftById[item.id] ?? item.repaid)
  if (!Number.isFinite(nextRepaid) || nextRepaid < 0 || nextRepaid > item.total) return

  const status = nextRepaid >= item.total ? 'settled' : nextRepaid > 0 ? 'partial' : 'open'
  const { data, error } = await updateReceivable(item.id, {
    amount_repaid: nextRepaid,
    status
  })

  if (!error && data) {
    repaymentDraftById[item.id] = String(Number(data.amount_repaid || 0))
  }
}

async function handleAddPayable() {
  payableError.value = ''

  const total = Number(payableDraft.amount_total)
  const paid = Number(payableDraft.amount_paid || 0)

  if (!payableDraft.person_name.trim()) {
    payableError.value = 'Please add the person name.'
    return
  }

  if (!Number.isFinite(total) || total <= 0) {
    payableError.value = 'Total amount must be greater than 0.'
    return
  }

  if (!Number.isFinite(paid) || paid < 0 || paid > total) {
    payableError.value = 'Paid amount must be between 0 and the total amount.'
    return
  }

  const status = paid >= total ? 'settled' : paid > 0 ? 'partial' : 'open'
  const { error } = await addPayable({
    person_name: payableDraft.person_name.trim(),
    description: payableDraft.description.trim(),
    amount_total: total,
    amount_paid: paid,
    owed_date: payableDraft.owed_date,
    due_date: payableDraft.due_date || null,
    notes: payableDraft.notes.trim(),
    status
  })

  if (error) {
    payableError.value = error.message || 'Failed to save payable.'
    return
  }

  payableDraft.person_name = ''
  payableDraft.description = ''
  payableDraft.amount_total = ''
  payableDraft.amount_paid = ''
  payableDraft.owed_date = formatDate(today)
  payableDraft.due_date = ''
  payableDraft.notes = ''
}

async function handleRecordPayment(item) {
  const nextPaid = Number(paidDraftById[item.id] ?? item.paid)
  if (!Number.isFinite(nextPaid) || nextPaid < 0 || nextPaid > item.total) return

  const status = nextPaid >= item.total ? 'settled' : nextPaid > 0 ? 'partial' : 'open'
  const { data, error } = await updatePayable(item.id, {
    amount_paid: nextPaid,
    status
  })

  if (!error && data) {
    paidDraftById[item.id] = String(Number(data.amount_paid || 0))
  }
}

async function handleAddCategory() {
  const name = categoryDraft.name.trim()
  if (!name) return
  await addCategory({
    name,
    type: categoryDraft.type,
    color: categoryDraft.color
  })
  categoryDraft.name = ''
}

async function handleUpdateCategory(category) {
  savingCategoryId.value = category.id
  try {
    await updateCategory(category.id, {
      name: String(category.name || '').trim(),
      type: category.type,
      color: category.color || '#818cf8'
    })
  } finally {
    savingCategoryId.value = ''
  }
}

async function handleDeleteCategory(categoryId) {
  await deleteCategory(categoryId)
}

watch(
  user,
  async (currentUser) => {
    if (!currentUser) return
    await fetchCategories()
    await refreshAccounts()
    await fetchReceivables()
    await fetchPayables()
    await refreshData()
  },
  { immediate: true }
)

watch(
  () => [filters.mode, filters.from, filters.to, filters.monthValue, filters.categoryId, filters.accountId],
  async () => {
    if (!user.value) return
    await refreshData()
  }
)

watch(
  receivableRows,
  (rows) => {
    for (const item of rows) {
      repaymentDraftById[item.id] = String(Number(item.repaid || 0))
    }
  },
  { immediate: true }
)

watch(
  payableRows,
  (rows) => {
    for (const item of rows) {
      paidDraftById[item.id] = String(Number(item.paid || 0))
    }
  },
  { immediate: true }
)

</script>

<template>
  <div class="finance-page min-h-full bg-transparent text-slate-100 px-4 md:px-8 py-6 md:py-8">
    <div class="max-w-7xl mx-auto space-y-5">
      <section class="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/15 via-cyan-500/5 to-transparent p-5 md:p-6 shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-2xl md:text-3xl font-bold tracking-tight">Finance Tracker</h1>
            <p class="text-slate-300/80 text-sm mt-1">Track spending clearly, spot where your money goes, and stay in control.</p>
          </div>
          <div class="flex items-center gap-2">
            <UButton color="neutral" variant="soft" to="/matched-betting">
              Matched Betting
            </UButton>
            <UButton color="neutral" variant="soft" to="/hustles">
              Side Hustles
            </UButton>
            <UButton color="neutral" variant="soft" to="/pockets">
              Pockets
            </UButton>
            <UButton icon="i-lucide-settings-2" color="neutral" variant="soft" @click="categoryPanelOpen = true">
              Categories
            </UButton>
            <UButton icon="i-lucide-refresh-cw" color="neutral" variant="soft" @click="handleRefreshAll">
              Refresh
            </UButton>
          </div>
        </div>
      </section>

      <section class="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div class="xl:col-span-2 rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-4">
          <h2 class="text-lg font-semibold">Quick Add Transaction</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            <input
              v-model="form.description"
              type="text"
              placeholder="Description"
              class="lg:col-span-2 bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
            <input
              v-model="form.amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount"
              class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
            <select
              v-model="form.categoryId"
              class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select category</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }} ({{ cat.type }})
              </option>
            </select>
            <select v-model="form.accountId" class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">Select account</option>
              <option v-for="acc in accounts" :key="acc.id" :value="acc.id">{{ acc.name }}</option>
            </select>
            <input
              v-model="form.date"
              type="date"
              class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
          </div>

          <div class="flex items-center justify-between gap-3">
            <p class="text-xs text-slate-400">
              Amount is auto-normalized from category type (income positive, expense negative).
            </p>
            <UButton
              icon="i-lucide-plus"
              color="primary"
              :loading="submitting"
              @click="handleSubmit"
            >
              Add
            </UButton>
          </div>

          <p v-if="formError" class="text-sm text-red-400">{{ formError }}</p>
        </div>

        <div class="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-3">
          <h2 class="text-lg font-semibold">Filters</h2>
          <div class="grid grid-cols-2 lg:grid-cols-3 gap-2">
            <UButton :variant="filters.mode === 'week' ? 'solid' : 'soft'" @click="filters.mode = 'week'">Current Week</UButton>
            <UButton :variant="filters.mode === 'month' ? 'solid' : 'soft'" @click="filters.mode = 'month'">Current Month</UButton>
            <UButton :variant="filters.mode === 'specificMonth' ? 'solid' : 'soft'" @click="filters.mode = 'specificMonth'">Specific Month</UButton>
            <UButton :variant="filters.mode === 'year' ? 'solid' : 'soft'" @click="filters.mode = 'year'">Current Year</UButton>
            <UButton :variant="filters.mode === 'custom' ? 'solid' : 'soft'" @click="filters.mode = 'custom'">Custom Range</UButton>
            <UButton :variant="filters.mode === 'all' ? 'solid' : 'soft'" @click="filters.mode = 'all'">All Time</UButton>
          </div>
          <div v-if="filters.mode === 'specificMonth'" class="grid grid-cols-1 gap-2">
            <input v-model="filters.monthValue" type="month" class="bg-black/30 border border-white/10 rounded-xl px-3 h-10 text-sm">
          </div>
          <div v-if="filters.mode === 'custom'" class="grid grid-cols-2 gap-2">
            <input v-model="filters.from" type="date" class="bg-black/30 border border-white/10 rounded-xl px-3 h-10 text-sm">
            <input v-model="filters.to" type="date" class="bg-black/30 border border-white/10 rounded-xl px-3 h-10 text-sm">
          </div>
          <select v-model="filters.categoryId" class="w-full bg-black/30 border border-white/10 rounded-xl px-3 h-10 text-sm">
            <option value="">All categories</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
          <select v-model="filters.accountId" class="w-full bg-black/30 border border-white/10 rounded-xl px-3 h-10 text-sm">
            <option value="">All accounts</option>
            <option v-for="acc in accounts" :key="acc.id" :value="acc.id">{{ acc.name }}</option>
          </select>
        </div>
      </section>

      <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-4">
          <p class="text-xs text-emerald-300">Total Income</p>
          <p class="text-2xl font-bold mt-1">{{ money(totalIncome) }}</p>
          <p class="text-xs text-emerald-200/80 mt-1">{{ periodLabel }}</p>
        </div>
        <div class="rounded-3xl border border-rose-400/20 bg-rose-500/10 p-4">
          <p class="text-xs text-rose-300">Total Expenses</p>
          <p class="text-2xl font-bold mt-1">{{ money(totalExpenses) }}</p>
          <p class="text-xs text-rose-200/80 mt-1">{{ periodLabel }}</p>
        </div>
        <div class="rounded-3xl border border-indigo-400/20 bg-indigo-500/10 p-4">
          <p class="text-xs text-indigo-300">Current Amount (Income - Expense)</p>
          <p class="text-2xl font-bold mt-1">{{ money(net) }}</p>
          <p class="text-xs text-indigo-200/80 mt-1">{{ periodLabel }}</p>
        </div>
      </section>

      <section class="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Cashflow Breakdown</h2>
          <span class="text-xs text-slate-400">
            {{ chartByCategory.length }} expense • {{ incomeByCategory.length }} income
          </span>
        </div>

        <div v-if="!chartByCategory.length" class="text-sm text-slate-400">
          No expense data in current filter.
        </div>

        <div v-else class="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
          <div class="rounded-xl border border-white/10 bg-black/20 p-3">
            <ClientOnly>
              <ApexChart
                type="donut"
                height="320"
                :options="expensePieOptions"
                :series="expensePieSeries"
              />
            </ClientOnly>
          </div>

          <div class="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
            <div v-for="item in chartByCategory" :key="item.name" class="space-y-1">
              <div class="flex items-center justify-between text-sm">
                <div class="flex items-center gap-2 min-w-0">
                  <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" :style="{ backgroundColor: item.color || '#818cf8' }" />
                  <span class="text-slate-300 truncate">{{ item.name }}</span>
                </div>
                <span class="font-medium">{{ money(item.total) }}</span>
              </div>
              <div class="h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  class="h-full rounded-full"
                  :style="{ width: `${(item.total / totalExpenses) * 100}%`, backgroundColor: item.color || '#818cf8' }"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-xl border border-white/10 bg-white/[0.02] p-3 md:p-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-medium text-slate-300">Income Breakdown</h3>
            <span class="text-[11px] text-slate-500">{{ incomeByCategory.length }} categories</span>
          </div>

          <div v-if="!incomeByCategory.length" class="text-xs text-slate-500">
            No income data in current filter.
          </div>

          <div v-else class="space-y-2">
            <div v-for="item in incomeByCategory" :key="item.name" class="space-y-1">
              <div class="flex items-center justify-between text-xs">
                <span class="text-slate-400 truncate">{{ item.name }}</span>
                <span class="text-slate-300">{{ money(item.total) }}</span>
              </div>
              <div class="h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  class="h-full rounded-full opacity-80"
                  :style="{ width: `${(item.total / (totalIncome || 1)) * 100}%`, backgroundColor: item.color || '#34d399' }"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Accounts, Transfers & Pockets</h2>
          <span class="text-xs text-slate-400">{{ accounts.length }} accounts</span>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div class="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
            <h3 class="text-sm font-medium text-slate-300">Account Balances</h3>
            <div v-if="!accountBalanceRows.length" class="text-xs text-slate-500">No accounts yet.</div>
            <div v-else class="space-y-2">
              <div v-for="acc in accountBalanceRows" :key="acc.id" class="rounded-lg border border-white/10 p-2">
                <div class="flex items-center justify-between text-sm">
                  <span class="truncate">{{ acc.name }}</span>
                  <span class="font-semibold">{{ money(acc.displayBalance) }}</span>
                </div>
                <p class="text-[11px] text-slate-500">
                  {{ acc.type }}<span v-if="acc.tracking_start_date"> • tracking from {{ acc.tracking_start_date }}</span>
                  <span v-if="acc.type === 'investment' && acc.snapshotCount"> • {{ acc.snapshotCount }} snapshot{{ acc.snapshotCount === 1 ? '' : 's' }}</span>
                  <span v-if="acc.type === 'investment' && acc.snapshotDate"> • latest {{ acc.snapshotDate }}</span>
                </p>

                <div
                  v-if="acc.type === 'investment' && acc.recentSnapshots?.length"
                  class="mt-1 text-[11px] text-slate-500 space-y-0.5"
                >
                  <div
                    v-for="s in acc.recentSnapshots"
                    :key="s.id"
                    class="flex items-center justify-between gap-2"
                  >
                    <span>{{ s.snapshot_date }}</span>
                    <span class="font-medium">{{ money(Number(s.market_value || 0)) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
            <h3 class="text-sm font-medium text-slate-300">New Account / Transfer</h3>
            <input v-model="accountDraft.name" type="text" placeholder="Account name" class="w-full bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
            <div class="grid grid-cols-2 gap-2">
              <select v-model="accountDraft.type" class="bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
                <option value="bank">bank</option>
                <option value="cash">cash</option>
                <option value="investment">investment</option>
                <option value="savings">savings</option>
              </select>
              <input v-model="accountDraft.opening_balance" type="number" step="0.01" placeholder="Opening balance" class="bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
            </div>
            <input v-model="accountDraft.tracking_start_date" type="date" class="w-full bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
            <input v-model="accountDraft.provider" type="text" placeholder="Provider (optional)" class="w-full bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
            <UButton size="sm" color="primary" class="w-full" @click="handleAddAccount">Add account</UButton>

            <div class="border-t border-white/10 my-2"></div>
            <select v-model="transferDraft.from_account_id" class="w-full bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
              <option value="">From account</option>
              <option v-for="acc in accounts" :key="`from-${acc.id}`" :value="acc.id">{{ acc.name }}</option>
            </select>
            <select v-model="transferDraft.to_account_id" class="w-full bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
              <option value="">To account</option>
              <option v-for="acc in accounts" :key="`to-${acc.id}`" :value="acc.id">{{ acc.name }}</option>
            </select>
            <div class="grid grid-cols-2 gap-2">
              <input v-model="transferDraft.amount" type="number" step="0.01" placeholder="Amount" class="bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
              <input v-model="transferDraft.date" type="date" class="bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
            </div>
            <input v-model="transferDraft.description" type="text" placeholder="Transfer note (optional)" class="w-full bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
            <UButton size="sm" color="neutral" class="w-full" @click="handleAddTransfer">Move money</UButton>
          </div>

          <div class="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
            <h3 class="text-sm font-medium text-slate-300">Pockets (fund buckets) & Investment Value</h3>
            <div class="rounded-lg border border-white/10 bg-white/[0.03] p-2 text-xs text-slate-300 space-y-1">
              <p>Allocated to pockets: <span class="font-semibold">{{ money(totalPocketedAmount) }}</span></p>
              <p>Unpocketed total: <span class="font-semibold">{{ money(unpocketedAmount) }}</span></p>
            </div>
            <div v-if="accountUnpocketedRows.length" class="space-y-1 pt-1">
              <p class="text-xs text-slate-400">Unpocketed by account</p>
              <div v-for="row in accountUnpocketedRows" :key="`unp-${row.id}`" class="text-[11px] text-slate-400 flex items-center justify-between">
                <span>{{ row.name }}</span>
                <span>{{ money(row.unpocketed) }}</span>
              </div>
            </div>
            <UButton size="sm" color="primary" variant="soft" class="w-full" to="/pockets">Manage pockets</UButton>

            <div class="border-t border-white/10 my-2"></div>
            <select v-model="snapshotDraft.account_id" class="w-full bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
              <option value="">Investment account</option>
              <option v-for="acc in accounts.filter(a => a.type === 'investment')" :key="`snap-${acc.id}`" :value="acc.id">{{ acc.name }}</option>
            </select>
            <div class="grid grid-cols-2 gap-2">
              <input v-model="snapshotDraft.market_value" type="number" step="0.01" placeholder="Market value" class="bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
              <input v-model="snapshotDraft.snapshot_date" type="date" class="bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
            </div>
            <input v-model="snapshotDraft.note" type="text" placeholder="Snapshot note (optional)" class="w-full bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
            <UButton size="sm" color="neutral" class="w-full" @click="handleAddSnapshot">Save valuation snapshot</UButton>
          </div>
        </div>

        <p class="text-xs text-slate-500">
          Opening balance is a baseline at the tracking start date. If tracking start date is set, older transactions/transfers are ignored for the balance.
        </p>
      </section>

      <section class="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold">Money Owed To Me</h2>
            <p class="text-xs text-slate-400 mt-1">Track personal loans, repayments, and remaining balances.</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-slate-400">Outstanding</p>
            <p class="text-lg font-semibold text-amber-300">{{ money(totalOutstanding) }}</p>
          </div>
        </div>

        <div class="rounded-xl border border-white/10 bg-black/20 p-3 space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
            <input v-model="receivableDraft.person_name" type="text" placeholder="Person name" class="bg-black/30 border border-white/10 rounded-lg px-3 h-10 text-sm">
            <input v-model="receivableDraft.description" type="text" placeholder="What they owe for" class="bg-black/30 border border-white/10 rounded-lg px-3 h-10 text-sm">
            <input v-model="receivableDraft.amount_total" type="number" min="0" step="0.01" placeholder="Total amount" class="bg-black/30 border border-white/10 rounded-lg px-3 h-10 text-sm">
            <input v-model="receivableDraft.amount_repaid" type="number" min="0" step="0.01" placeholder="Already repaid (optional)" class="bg-black/30 border border-white/10 rounded-lg px-3 h-10 text-sm">
            <input v-model="receivableDraft.lent_date" type="date" class="bg-black/30 border border-white/10 rounded-lg px-3 h-10 text-sm">
            <input v-model="receivableDraft.due_date" type="date" class="bg-black/30 border border-white/10 rounded-lg px-3 h-10 text-sm">
            <input v-model="receivableDraft.notes" type="text" placeholder="Notes (optional)" class="md:col-span-2 bg-black/30 border border-white/10 rounded-lg px-3 h-10 text-sm">
          </div>

          <div class="flex items-center justify-between gap-3">
            <p v-if="receivableError" class="text-sm text-red-400">{{ receivableError }}</p>
            <div class="ml-auto">
              <UButton size="sm" color="primary" @click="handleAddReceivable">Add owed amount</UButton>
            </div>
          </div>
        </div>

        <div v-if="!receivableRows.length" class="text-sm text-slate-400">No money owed entries yet.</div>
        <div v-else class="space-y-2">
          <div
            v-for="item in receivableRows"
            :key="item.id"
            class="rounded-xl border border-white/10 bg-black/20 p-3 space-y-3"
          >
            <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ item.person_name }}</p>
                <p class="text-xs text-slate-400">
                  {{ item.description || 'Personal receivable' }} • lent {{ item.lent_date }}
                  <span v-if="item.due_date"> • due {{ item.due_date }}</span>
                </p>
                <p v-if="item.notes" class="text-[11px] text-slate-500 mt-1">{{ item.notes }}</p>
              </div>

              <div class="grid grid-cols-3 gap-3 text-xs min-w-[240px]">
                <div>
                  <p class="text-slate-500">Total</p>
                  <p class="font-semibold">{{ money(item.total) }}</p>
                </div>
                <div>
                  <p class="text-slate-500">Repaid</p>
                  <p class="font-semibold text-emerald-300">{{ money(item.repaid) }}</p>
                </div>
                <div>
                  <p class="text-slate-500">Outstanding</p>
                  <p class="font-semibold text-amber-300">{{ money(item.outstanding) }}</p>
                </div>
              </div>
            </div>

            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div class="flex items-center gap-2 text-xs">
                <span class="rounded-full px-2 py-1 border border-white/10 bg-white/5 uppercase tracking-wide">
                  {{ item.status }}
                </span>
              </div>

              <div class="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  v-model="repaymentDraftById[item.id]"
                  type="number"
                  min="0"
                  :max="item.total"
                  step="0.01"
                  placeholder="Repaid total"
                  class="bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm"
                >
                <UButton size="sm" color="primary" variant="soft" @click="handleRecordRepayment(item)">
                  Update repaid
                </UButton>
                <UButton size="sm" color="error" variant="ghost" @click="deleteReceivable(item.id)">
                  Delete
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-lg font-semibold">Money I Owe</h2>
            <p class="text-xs text-slate-400 mt-1">Track what you owe people, payments made, and remaining balances.</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-slate-400">Outstanding</p>
            <p class="text-lg font-semibold text-rose-300">{{ money(totalPayableOutstanding) }}</p>
          </div>
        </div>

        <div class="rounded-xl border border-white/10 bg-black/20 p-3 space-y-3">
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
            <input v-model="payableDraft.person_name" type="text" placeholder="Person name" class="bg-black/30 border border-white/10 rounded-lg px-3 h-10 text-sm">
            <input v-model="payableDraft.description" type="text" placeholder="What you owe for" class="bg-black/30 border border-white/10 rounded-lg px-3 h-10 text-sm">
            <input v-model="payableDraft.amount_total" type="number" min="0" step="0.01" placeholder="Total amount" class="bg-black/30 border border-white/10 rounded-lg px-3 h-10 text-sm">
            <input v-model="payableDraft.amount_paid" type="number" min="0" step="0.01" placeholder="Already paid (optional)" class="bg-black/30 border border-white/10 rounded-lg px-3 h-10 text-sm">
            <input v-model="payableDraft.owed_date" type="date" class="bg-black/30 border border-white/10 rounded-lg px-3 h-10 text-sm">
            <input v-model="payableDraft.due_date" type="date" class="bg-black/30 border border-white/10 rounded-lg px-3 h-10 text-sm">
            <input v-model="payableDraft.notes" type="text" placeholder="Notes (optional)" class="md:col-span-2 bg-black/30 border border-white/10 rounded-lg px-3 h-10 text-sm">
          </div>

          <div class="flex items-center justify-between gap-3">
            <p v-if="payableError" class="text-sm text-red-400">{{ payableError }}</p>
            <div class="ml-auto">
              <UButton size="sm" color="primary" @click="handleAddPayable">Add payable</UButton>
            </div>
          </div>
        </div>

        <div v-if="!payableRows.length" class="text-sm text-slate-400">No money owed entries yet.</div>
        <div v-else class="space-y-2">
          <div
            v-for="item in payableRows"
            :key="item.id"
            class="rounded-xl border border-white/10 bg-black/20 p-3 space-y-3"
          >
            <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ item.person_name }}</p>
                <p class="text-xs text-slate-400">
                  {{ item.description || 'Personal payable' }} • owed {{ item.owed_date }}
                  <span v-if="item.due_date"> • due {{ item.due_date }}</span>
                </p>
                <p v-if="item.notes" class="text-[11px] text-slate-500 mt-1">{{ item.notes }}</p>
              </div>

              <div class="grid grid-cols-3 gap-3 text-xs min-w-[240px]">
                <div>
                  <p class="text-slate-500">Total</p>
                  <p class="font-semibold">{{ money(item.total) }}</p>
                </div>
                <div>
                  <p class="text-slate-500">Paid</p>
                  <p class="font-semibold text-emerald-300">{{ money(item.paid) }}</p>
                </div>
                <div>
                  <p class="text-slate-500">Outstanding</p>
                  <p class="font-semibold text-rose-300">{{ money(item.outstanding) }}</p>
                </div>
              </div>
            </div>

            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div class="flex items-center gap-2 text-xs">
                <span class="rounded-full px-2 py-1 border border-white/10 bg-white/5 uppercase tracking-wide">
                  {{ item.status }}
                </span>
              </div>

              <div class="flex flex-col sm:flex-row sm:items-center gap-2">
                <input
                  v-model="paidDraftById[item.id]"
                  type="number"
                  min="0"
                  :max="item.total"
                  step="0.01"
                  placeholder="Paid total"
                  class="bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm"
                >
                <UButton size="sm" color="primary" variant="soft" @click="handleRecordPayment(item)">
                  Update paid
                </UButton>
                <UButton size="sm" color="error" variant="ghost" @click="deletePayable(item.id)">
                  Delete
                </UButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">Transactions</h2>
          <span class="text-xs text-slate-400">{{ filteredTransactions.length }} records</span>
        </div>

        <div v-if="loading" class="text-sm text-slate-400">Loading transactions...</div>
        <div v-else-if="!filteredTransactions.length" class="text-sm text-slate-400">No transactions yet.</div>
        <div v-else class="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          <div
            v-for="txn in filteredTransactions"
            :key="txn.id"
            class="rounded-xl border border-white/10 bg-black/20 p-3 flex items-center justify-between gap-3"
          >
            <div class="min-w-0">
              <p class="text-sm font-medium truncate">{{ txn.description }}</p>
              <p class="text-xs text-slate-400">
                {{ txn.date }} • {{ txn.categories?.name || 'Uncategorised' }}<span v-if="txn.accounts?.name"> • {{ txn.accounts.name }}</span>
              </p>
            </div>
            <div class="flex items-center gap-3">
              <p class="text-sm font-semibold" :class="Number(txn.amount) < 0 ? 'text-rose-300' : 'text-emerald-300'">
                {{ money(Number(txn.amount)) }}
              </p>
              <UButton
                size="sm"
                color="neutral"
                variant="ghost"
                :disabled="editSubmitting"
                @click="startEdit(txn)"
              >
                Edit
              </UButton>
              <UButton
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                @click="deleteTransaction(txn.id)"
              />
            </div>
          </div>
        </div>
      </section>

    </div>

    <UDrawer v-model:open="editTransactionDrawerOpen" :ui="{ overlay: 'bg-black/80' }" class="bg-[#0a0a0f]">
      <template #content>
        <div class="p-4 md:p-6 bg-[#0a0a0f] text-slate-100 border-white/10">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">Edit Transaction</h2>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              color="neutral"
              @click="editTransactionDrawerOpen = false; editingTransactionId = null; editFormError = ''"
            />
          </div>

          <div class="space-y-3">
            <input
              v-model="editForm.description"
              type="text"
              placeholder="Description"
              class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >

            <input
              v-model="editForm.amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount"
              class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >

            <select
              v-model="editForm.categoryId"
              class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select category</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }} ({{ cat.type }})
              </option>
            </select>

            <select
              v-model="editForm.accountId"
              class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select account</option>
              <option v-for="acc in accounts" :key="acc.id" :value="acc.id">{{ acc.name }}</option>
            </select>

            <input
              v-model="editForm.date"
              type="date"
              class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            >

            <p v-if="editFormError" class="text-sm text-red-400">{{ editFormError }}</p>

            <div class="flex items-center justify-between gap-3 pt-2">
              <UButton
                color="neutral"
                variant="soft"
                :disabled="editSubmitting"
                @click="editTransactionDrawerOpen = false; editingTransactionId = null; editFormError = ''"
              >
                Cancel
              </UButton>

              <UButton
                color="primary"
                variant="solid"
                :loading="editSubmitting"
                @click="handleUpdateTransaction"
              >
                Save
              </UButton>
            </div>
          </div>
        </div>
      </template>
    </UDrawer>

    <UDrawer v-model:open="categoryPanelOpen" :ui="{ overlay: 'bg-black/80' }" class="bg-[#0a0a0f]">
      <template #content>
        <div class="p-4 md:p-6 bg-[#0a0a0f] text-slate-100 border-white/10">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">Manage Categories</h2>
            <UButton icon="i-lucide-x" variant="ghost" color="neutral" @click="categoryPanelOpen = false" />
          </div>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
            <input v-model="categoryDraft.name" type="text" placeholder="New category name" class="md:col-span-2 bg-black/30 border border-white/10 rounded-xl px-3 h-10 text-sm">
            <select v-model="categoryDraft.type" class="bg-black/30 border border-white/10 rounded-xl px-3 h-10 text-sm">
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <div class="flex gap-2">
              <input v-model="categoryDraft.color" type="color" class="h-10 w-14 rounded-xl border border-white/10 bg-black/30 p-1">
              <UButton icon="i-lucide-plus" color="primary" class="flex-1" @click="handleAddCategory">Add</UButton>
            </div>
          </div>

          <div class="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            <div
              v-for="cat in categories"
              :key="cat.id"
              class="rounded-xl border border-white/10 bg-black/20 p-3 grid grid-cols-1 md:grid-cols-12 gap-2 items-center"
            >
              <input v-model="cat.name" type="text" class="md:col-span-5 bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
              <select v-model="cat.type" class="md:col-span-3 bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
                <option value="income">income</option>
                <option value="expense">expense</option>
              </select>
              <input v-model="cat.color" type="color" class="md:col-span-1 h-9 w-12 rounded-lg border border-white/10 bg-black/30 p-1">
              <UButton icon="i-lucide-save" size="sm" color="primary" class="md:col-span-2" :loading="savingCategoryId === cat.id" @click="handleUpdateCategory(cat)">Save</UButton>
              <UButton icon="i-lucide-trash-2" size="sm" color="error" variant="ghost" class="md:col-span-1" @click="handleDeleteCategory(cat.id)" />
            </div>
          </div>
        </div>
      </template>
    </UDrawer>
  </div>
</template>

<style scoped>
/* Normalize native select dropdown styling for dark UI */
select {
  color-scheme: dark;
}

select option,
select optgroup {
  background-color: #0b1220;
  color: #e2e8f0;
}

select option:checked {
  background-color: #1d4ed8;
  color: #ffffff;
}

</style>
