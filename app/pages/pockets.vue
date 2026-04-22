<script setup>
import { computed, reactive, watch } from 'vue'

const {
  accounts,
  pockets,
  latestSnapshotByAccount,
  transactionNetByAccount,
  transferNetByAccount,
  refresh,
  addPocket,
  updatePocket,
  archivePocket
} = useAccounts()

const user = useSupabaseUser()
const today = new Date()

function money(value) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 2
  }).format(value || 0)
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const uiError = ref('')
const saving = ref(false)

const pocketDraft = reactive({
  scope: 'global',
  account_id: '',
  name: '',
  current_amount: '',
  target_amount: ''
})

const filters = reactive({
  scope: 'all',
  accountId: ''
})

const allocationDraft = reactive({
  mode: 'unpocketed_to_pocket',
  from_pocket_id: '',
  to_pocket_id: '',
  amount: ''
})

const accountBalanceRows = computed(() => {
  return accounts.value.map((account) => {
    const txNet = Number(transactionNetByAccount.value.get(account.id) || 0)
    const transferNet = Number(transferNetByAccount.value.get(account.id) || 0)
    const ledgerBalance = Number(account.opening_balance || 0) + txNet + transferNet

    const snapshot = latestSnapshotByAccount.value.get(account.id)
    const displayBalance = account.type === 'investment' && snapshot
      ? Number(snapshot.market_value || 0)
      : ledgerBalance

    return { ...account, displayBalance }
  })
})

const totalAvailableAcrossAccounts = computed(() =>
  accountBalanceRows.value.reduce((sum, acc) => sum + Number(acc.displayBalance || 0), 0)
)

const visiblePockets = computed(() => pockets.value.filter((p) => !p.is_archived))

const filteredPockets = computed(() => {
  return visiblePockets.value.filter((p) => {
    if (filters.scope !== 'all' && p.scope !== filters.scope) return false
    if (filters.accountId && p.account_id !== filters.accountId) return false
    return true
  })
})

const totalPocketedAmount = computed(() =>
  visiblePockets.value.reduce((sum, p) => sum + Number(p.current_amount || 0), 0)
)

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

const unpocketedAmount = computed(() =>
  totalAvailableAcrossAccounts.value - totalPocketedAmount.value
)

const selectableToPockets = computed(() =>
  visiblePockets.value.filter((p) => p.scope === 'global' || p.account_id)
)

const selectableFromPockets = computed(() =>
  visiblePockets.value.filter((p) => Number(p.current_amount || 0) > 0)
)

const selectedFromPocket = computed(() =>
  selectableFromPockets.value.find((p) => p.id === allocationDraft.from_pocket_id)
)

const selectedToPocket = computed(() =>
  selectableToPockets.value.find((p) => p.id === allocationDraft.to_pocket_id)
)

const selectedToAccountUnpocketed = computed(() => {
  if (!selectedToPocket.value || selectedToPocket.value.scope !== 'account') return null
  return accountUnpocketedRows.value.find((a) => a.id === selectedToPocket.value.account_id)
})

async function handleAddPocket() {
  uiError.value = ''
  if (!pocketDraft.name.trim()) return

  const payload = {
    scope: pocketDraft.scope,
    account_id: pocketDraft.scope === 'account' ? pocketDraft.account_id : null,
    name: pocketDraft.name.trim(),
    current_amount: Number(pocketDraft.current_amount || 0),
    target_amount: pocketDraft.target_amount ? Number(pocketDraft.target_amount) : null
  }

  if (payload.scope === 'account' && !payload.account_id) {
    uiError.value = 'Select an account for account-scoped pockets.'
    return
  }

  saving.value = true
  try {
    await addPocket(payload)
    pocketDraft.name = ''
    pocketDraft.current_amount = ''
    pocketDraft.target_amount = ''
    pocketDraft.account_id = ''
  } finally {
    saving.value = false
  }
}

async function handleSavePocket(pocket) {
  uiError.value = ''
  await updatePocket(pocket.id, {
    name: String(pocket.name || '').trim(),
    current_amount: Number(pocket.current_amount || 0),
    target_amount: pocket.target_amount ? Number(pocket.target_amount) : null
  })
}

async function handleArchivePocket(pocketId) {
  uiError.value = ''
  await archivePocket(pocketId)
}

async function handleAllocationMove() {
  uiError.value = ''
  const amount = Number(allocationDraft.amount || 0)
  if (!selectedToPocket.value) {
    uiError.value = 'Choose a destination pocket.'
    return
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    uiError.value = 'Allocation amount must be greater than 0.'
    return
  }

  if (allocationDraft.mode === 'unpocketed_to_pocket') {
    if (selectedToPocket.value.scope === 'global') {
      if (amount > Number(unpocketedAmount.value || 0)) {
        uiError.value = 'Not enough unpocketed amount available.'
        return
      }
    } else {
      const row = selectedToAccountUnpocketed.value
      if (!row || amount > Number(row.unpocketed || 0)) {
        uiError.value = 'Not enough unpocketed amount in that account.'
        return
      }
    }

    await updatePocket(selectedToPocket.value.id, {
      current_amount: Number(selectedToPocket.value.current_amount || 0) + amount
    })
  } else {
    if (!selectedFromPocket.value) {
      uiError.value = 'Choose a source pocket.'
      return
    }
    const fromCurrent = Number(selectedFromPocket.value.current_amount || 0)
    if (amount > fromCurrent) {
      uiError.value = 'Source pocket does not have enough allocated amount.'
      return
    }
    if (selectedFromPocket.value.id === selectedToPocket.value.id) {
      uiError.value = 'Source and destination pockets must be different.'
      return
    }

    await updatePocket(selectedFromPocket.value.id, {
      current_amount: fromCurrent - amount
    })
    await updatePocket(selectedToPocket.value.id, {
      current_amount: Number(selectedToPocket.value.current_amount || 0) + amount
    })
  }

  allocationDraft.amount = ''
  allocationDraft.from_pocket_id = ''
  allocationDraft.to_pocket_id = ''
}

watch(
  user,
  async (u) => {
    if (!u) return
    await refresh()
  },
  { immediate: true }
)
</script>

<template>
  <div class="min-h-full bg-transparent text-slate-100 px-4 md:px-8 py-6 md:py-8">
    <div class="max-w-7xl mx-auto space-y-5">
      <section class="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/15 via-cyan-500/5 to-transparent p-5 md:p-6 shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-2xl md:text-3xl font-bold tracking-tight">Pockets</h1>
            <p class="text-slate-300/80 text-sm mt-1">Logical fund buckets that do not change account balances.</p>
          </div>
          <UButton color="neutral" variant="soft" to="/finance">Back to Finance</UButton>
        </div>
      </section>

      <section class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="rounded-3xl border border-indigo-400/20 bg-indigo-500/10 p-4">
          <p class="text-xs text-indigo-300">Total Available</p>
          <p class="text-2xl font-bold mt-1">{{ money(totalAvailableAcrossAccounts) }}</p>
        </div>
        <div class="rounded-3xl border border-emerald-400/20 bg-emerald-500/10 p-4">
          <p class="text-xs text-emerald-300">Allocated to Pockets</p>
          <p class="text-2xl font-bold mt-1">{{ money(totalPocketedAmount) }}</p>
        </div>
        <div class="rounded-3xl border border-amber-400/20 bg-amber-500/10 p-4">
          <p class="text-xs text-amber-300">Unpocketed</p>
          <p class="text-2xl font-bold mt-1">{{ money(unpocketedAmount) }}</p>
        </div>
      </section>

      <section class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div class="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-3">
          <h2 class="text-lg font-semibold">Create Pocket</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <select v-model="pocketDraft.scope" class="bg-black/30 border border-white/10 rounded-xl px-3 h-10 text-sm">
              <option value="global">global</option>
              <option value="account">account</option>
            </select>
            <select v-if="pocketDraft.scope === 'account'" v-model="pocketDraft.account_id" class="bg-black/30 border border-white/10 rounded-xl px-3 h-10 text-sm">
              <option value="">Select account</option>
              <option v-for="acc in accounts" :key="acc.id" :value="acc.id">{{ acc.name }}</option>
            </select>
            <input v-model="pocketDraft.name" type="text" placeholder="Pocket name" class="md:col-span-2 bg-black/30 border border-white/10 rounded-xl px-3 h-10 text-sm">
            <input v-model="pocketDraft.current_amount" type="number" step="0.01" placeholder="Initial allocation" class="bg-black/30 border border-white/10 rounded-xl px-3 h-10 text-sm">
            <input v-model="pocketDraft.target_amount" type="number" step="0.01" placeholder="Target (optional)" class="bg-black/30 border border-white/10 rounded-xl px-3 h-10 text-sm">
          </div>
          <UButton color="primary" :loading="saving" @click="handleAddPocket">Add pocket</UButton>
          <p v-if="uiError" class="text-sm text-red-400">{{ uiError }}</p>
        </div>

        <div class="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-3">
          <h2 class="text-lg font-semibold">Move Allocation</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <select v-model="allocationDraft.mode" class="md:col-span-2 bg-black/30 border border-white/10 rounded-xl px-3 h-10 text-sm">
              <option value="unpocketed_to_pocket">Unpocketed -> Pocket</option>
              <option value="pocket_to_pocket">Pocket -> Pocket</option>
            </select>
            <select
              v-if="allocationDraft.mode === 'pocket_to_pocket'"
              v-model="allocationDraft.from_pocket_id"
              class="bg-black/30 border border-white/10 rounded-xl px-3 h-10 text-sm"
            >
              <option value="">From pocket</option>
              <option v-for="p in selectableFromPockets" :key="`from-${p.id}`" :value="p.id">{{ p.name }}</option>
            </select>
            <select v-model="allocationDraft.to_pocket_id" class="bg-black/30 border border-white/10 rounded-xl px-3 h-10 text-sm">
              <option value="">To pocket</option>
              <option v-for="p in selectableToPockets" :key="`to-${p.id}`" :value="p.id">{{ p.name }}</option>
            </select>
            <input v-model="allocationDraft.amount" type="number" step="0.01" placeholder="Amount" class="bg-black/30 border border-white/10 rounded-xl px-3 h-10 text-sm">
          </div>
          <UButton color="primary" variant="soft" @click="handleAllocationMove">Move allocation</UButton>
        </div>
      </section>

      <section class="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-3">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Pockets</h2>
          <span class="text-xs text-slate-400">{{ filteredPockets.length }} shown</span>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          <select v-model="filters.scope" class="bg-black/30 border border-white/10 rounded-xl px-3 h-10 text-sm">
            <option value="all">all scopes</option>
            <option value="global">global</option>
            <option value="account">account</option>
          </select>
          <select v-model="filters.accountId" class="bg-black/30 border border-white/10 rounded-xl px-3 h-10 text-sm">
            <option value="">all accounts</option>
            <option v-for="acc in accounts" :key="`flt-${acc.id}`" :value="acc.id">{{ acc.name }}</option>
          </select>
        </div>

        <div v-if="!filteredPockets.length" class="text-sm text-slate-400">No pockets found.</div>
        <div v-else class="space-y-2">
          <div v-for="p in filteredPockets" :key="p.id" class="rounded-xl border border-white/10 bg-black/20 p-3 space-y-2">
            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
              <input v-model="p.name" type="text" class="bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
              <input v-model="p.current_amount" type="number" step="0.01" class="bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
              <input v-model="p.target_amount" type="number" step="0.01" class="bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
              <div class="text-xs text-slate-400 flex items-center px-2">
                {{ p.scope }}<span v-if="p.account_id"> • {{ accounts.find(a => a.id === p.account_id)?.name || 'Unknown' }}</span>
              </div>
              <div class="flex justify-end gap-2">
                <UButton size="sm" color="neutral" variant="soft" @click="handleSavePocket(p)">Save</UButton>
                <UButton size="sm" color="error" variant="ghost" @click="handleArchivePocket(p.id)">Archive</UButton>
              </div>
            </div>
            <div v-if="p.target_amount" class="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                class="h-full rounded-full bg-emerald-400"
                :style="{ width: `${Math.min((Number(p.current_amount || 0) / Number(p.target_amount || 1)) * 100, 100)}%` }"
              />
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-3">
        <h2 class="text-lg font-semibold">Unpocketed by Account</h2>
        <div class="space-y-1">
          <div v-for="row in accountUnpocketedRows" :key="row.id" class="text-sm flex items-center justify-between">
            <span>{{ row.name }}</span>
            <span :class="row.unpocketed >= 0 ? 'text-slate-200' : 'text-rose-300'">{{ money(row.unpocketed) }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
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

