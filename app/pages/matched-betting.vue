<script setup>
import { computed, reactive, watch } from 'vue'

const {
  sites,
  cycles,
  bankrollTotal,
  profitToDate,
  profitByStrategy,
  profitBySite,
  sitesNeedingAttention,
  loadingSites,
  loadingCycles,
  fetchSites,
  addSite,
  updateSite,
  fetchCycles,
  addCycle,
  updateCycle,
  deleteCycle
} = useMatchedBetting()
const {
  mbStrategyOptions,
  fetchOptions,
  addMbStrategy
} = useDropdownOptions()

const user = useSupabaseUser()
const today = new Date()

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

const siteDraft = reactive({
  name: '',
  kind: 'bookmaker',
  current_balance: '',
  status: 'active',
  bet_state: 'none',
  notes: ''
})

const cycleDraft = reactive({
  site_id: '',
  start_date: formatDate(today),
  date: formatDate(today),
  strategy: '',
  offer_name: '',
  qualifier_pnl: '',
  freebet_pnl: '',
  adjustments: '',
  status: 'completed',
  notes: ''
})

const error = ref('')
const strategyDraft = ref('')
const editingCycleOpen = ref(false)
const editingCycleId = ref('')
const editError = ref('')
const editDraft = reactive({
  site_id: '',
  start_date: formatDate(today),
  date: formatDate(today),
  strategy: '',
  offer_name: '',
  qualifier_pnl: '',
  freebet_pnl: '',
  adjustments: '',
  status: 'completed',
  notes: ''
})

const siteOptions = computed(() => sites.value)

const strategyRows = computed(() => {
  const rows = []
  for (const [strategy, total] of profitByStrategy.value.entries()) {
    rows.push({ strategy, total })
  }
  return rows.sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
})

const siteProfitRows = computed(() => {
  const map = profitBySite.value
  return sites.value
    .map((s) => ({ ...s, profit: Number(map.get(s.id) || 0) }))
    .sort((a, b) => Math.abs(b.profit) - Math.abs(a.profit))
})

const ongoingCycles = computed(() => cycles.value.filter((c) => c.status === 'in_progress'))
const completedCycles = computed(() => cycles.value.filter((c) => c.status !== 'in_progress'))

async function handleAddSite() {
  error.value = ''
  if (!siteDraft.name.trim()) return

  const { error: e } = await addSite({
    name: siteDraft.name.trim(),
    kind: siteDraft.kind,
    current_balance: Number(siteDraft.current_balance || 0),
    status: siteDraft.status,
    bet_state: siteDraft.bet_state,
    notes: siteDraft.notes.trim()
  })

  if (e) {
    error.value = e.message || 'Failed to add site.'
    return
  }

  siteDraft.name = ''
  siteDraft.kind = 'bookmaker'
  siteDraft.current_balance = ''
  siteDraft.status = 'active'
  siteDraft.bet_state = 'none'
  siteDraft.notes = ''
}

async function handleAddCycle() {
  error.value = ''
  if (!cycleDraft.site_id) {
    error.value = 'Pick a site.'
    return
  }
  if (!cycleDraft.strategy) {
    error.value = 'Pick a strategy or add one first.'
    return
  }

  const { error: e } = await addCycle({
    site_id: cycleDraft.site_id,
    start_date: cycleDraft.start_date || null,
    date: cycleDraft.date,
    strategy: cycleDraft.strategy,
    offer_name: cycleDraft.offer_name.trim(),
    qualifier_pnl: Number(cycleDraft.qualifier_pnl || 0),
    freebet_pnl: Number(cycleDraft.freebet_pnl || 0),
    adjustments: Number(cycleDraft.adjustments || 0),
    status: cycleDraft.status,
    notes: cycleDraft.notes.trim()
  })

  if (e) {
    error.value = e.message || 'Failed to add cycle.'
    return
  }

  cycleDraft.offer_name = ''
  cycleDraft.qualifier_pnl = ''
  cycleDraft.freebet_pnl = ''
  cycleDraft.adjustments = ''
  cycleDraft.notes = ''
}

function openEditCycle(cycle) {
  editError.value = ''
  editingCycleId.value = cycle.id
  editDraft.site_id = cycle.site_id || ''
  editDraft.start_date = cycle.start_date || cycle.date || formatDate(today)
  editDraft.date = cycle.date || formatDate(today)
  editDraft.strategy = cycle.strategy || ''
  editDraft.offer_name = cycle.offer_name || ''
  editDraft.qualifier_pnl = String(Number(cycle.qualifier_pnl || 0))
  editDraft.freebet_pnl = String(Number(cycle.freebet_pnl || 0))
  editDraft.adjustments = String(Number(cycle.adjustments || 0))
  editDraft.status = cycle.status || 'completed'
  editDraft.notes = cycle.notes || ''
  editingCycleOpen.value = true
}

async function handleSaveCycleEdit() {
  editError.value = ''
  if (!editingCycleId.value) return
  if (!editDraft.site_id) {
    editError.value = 'Pick a site.'
    return
  }
  if (!editDraft.strategy) {
    editError.value = 'Pick a strategy.'
    return
  }

  const { error: e } = await updateCycle(editingCycleId.value, {
    site_id: editDraft.site_id,
    start_date: editDraft.start_date || null,
    date: editDraft.date,
    strategy: editDraft.strategy,
    offer_name: editDraft.offer_name.trim(),
    qualifier_pnl: Number(editDraft.qualifier_pnl || 0),
    freebet_pnl: Number(editDraft.freebet_pnl || 0),
    adjustments: Number(editDraft.adjustments || 0),
    status: editDraft.status,
    notes: editDraft.notes.trim()
  })

  if (e) {
    editError.value = e.message || 'Failed to save changes.'
    return
  }

  editingCycleOpen.value = false
  editingCycleId.value = ''
}

async function markCycleCompleted(cycle) {
  await updateCycle(cycle.id, { status: 'completed' })
}

async function handleAddStrategy() {
  const clean = String(strategyDraft.value || '').trim()
  if (!clean) return
  const { error: e } = await addMbStrategy(clean)
  if (e) {
    error.value = e.message || 'Failed to add strategy.'
    return
  }
  cycleDraft.strategy = clean
  strategyDraft.value = ''
}

const balanceDraftBySite = reactive({})

watch(
  sites,
  (rows) => {
    for (const s of rows) {
      balanceDraftBySite[s.id] = String(Number(s.current_balance || 0))
    }
  },
  { immediate: true }
)

async function handleUpdateBalance(site) {
  const next = Number(balanceDraftBySite[site.id])
  if (!Number.isFinite(next)) return
  await updateSite(site.id, { current_balance: next })
}

async function handleUpdateState(site, field, value) {
  await updateSite(site.id, { [field]: value })
}

watch(
  user,
  async (u) => {
    if (!u) return
    await Promise.all([fetchSites(), fetchCycles(), fetchOptions()])
  },
  { immediate: true }
)
</script>

<template>
  <div class="min-h-full bg-transparent text-slate-100 px-4 md:px-8 py-6 md:py-8">
    <div class="max-w-7xl mx-auto space-y-5">
      <section class="rounded-3xl border border-white/10 bg-gradient-to-br from-emerald-500/15 via-cyan-500/5 to-transparent p-5 md:p-6 shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
        <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 class="text-2xl md:text-3xl font-bold tracking-tight">Matched Betting</h1>
            <p class="text-slate-300/80 text-sm mt-1">Track bankroll, site state, and profit per strategy from your new tracking period.</p>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p class="text-xs text-slate-400">Profit to date</p>
              <p class="text-xl font-bold" :class="profitToDate >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                {{ money(profitToDate) }}
              </p>
            </div>
            <div class="rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
              <p class="text-xs text-slate-400">Total bankroll</p>
              <p class="text-xl font-bold text-slate-100">
                {{ money(bankrollTotal) }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div class="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-4">
          <h2 class="text-lg font-semibold">Add site</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input v-model="siteDraft.name" type="text" placeholder="Site name (e.g. Bet365, Smarkets)" class="md:col-span-2 bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
            <select v-model="siteDraft.kind" class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
              <option value="bookmaker">bookmaker</option>
              <option value="exchange">exchange</option>
            </select>
            <input v-model="siteDraft.current_balance" type="number" step="0.01" placeholder="Current balance" class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
            <select v-model="siteDraft.status" class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
              <option value="active">active</option>
              <option value="restricted">restricted</option>
              <option value="gubbed">gubbed</option>
              <option value="paused">paused</option>
            </select>
            <select v-model="siteDraft.bet_state" class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
              <option value="none">none</option>
              <option value="pending_bet">pending_bet</option>
              <option value="unplaced_free_bet">unplaced_free_bet</option>
              <option value="qualifier_in_progress">qualifier_in_progress</option>
            </select>
            <input v-model="siteDraft.notes" type="text" placeholder="Notes (optional)" class="md:col-span-2 bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
          </div>
          <UButton color="primary" :loading="loadingSites" @click="handleAddSite">Add site</UButton>
          <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
        </div>

        <div class="xl:col-span-2 rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-4">
          <h2 class="text-lg font-semibold">Add cycle (strategy transaction)</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-2">
            <select v-model="cycleDraft.site_id" class="xl:col-span-2 bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
              <option value="">Select site</option>
              <option v-for="s in siteOptions" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
            <select v-model="cycleDraft.strategy" class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
              <option value="">Select strategy</option>
              <option v-for="strategy in mbStrategyOptions" :key="strategy" :value="strategy">{{ strategy }}</option>
            </select>
            <input v-model="cycleDraft.start_date" type="date" class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
            <input v-model="cycleDraft.date" type="date" class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
            <input v-model="cycleDraft.offer_name" type="text" placeholder="Offer / note" class="xl:col-span-2 bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
            <input v-model="cycleDraft.qualifier_pnl" type="number" step="0.01" placeholder="Qualifier P/L" class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
            <input v-model="cycleDraft.freebet_pnl" type="number" step="0.01" placeholder="Free bet P/L" class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
            <input v-model="cycleDraft.adjustments" type="number" step="0.01" placeholder="Adjustments (fees/comm)" class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
            <select v-model="cycleDraft.status" class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
              <option value="completed">completed</option>
              <option value="in_progress">in_progress</option>
            </select>
            <input v-model="cycleDraft.notes" type="text" placeholder="Notes (optional)" class="xl:col-span-6 bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
            <div class="xl:col-span-6 grid grid-cols-1 md:grid-cols-4 gap-2">
              <input
                v-model="strategyDraft"
                type="text"
                placeholder="Add custom strategy"
                class="md:col-span-3 bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm"
              >
              <UButton color="neutral" variant="soft" @click="handleAddStrategy">Add strategy</UButton>
            </div>
          </div>
          <div class="flex items-center justify-end">
            <UButton color="primary" :loading="loadingCycles" @click="handleAddCycle">Add cycle</UButton>
          </div>
        </div>
      </section>

      <section class="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div class="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">Needs attention</h2>
            <span class="text-xs text-slate-400">{{ sitesNeedingAttention.length }}</span>
          </div>
          <div v-if="!sitesNeedingAttention.length" class="text-sm text-slate-400">All sites look clean.</div>
          <div v-else class="space-y-2">
            <div v-for="s in sitesNeedingAttention" :key="s.id" class="rounded-xl border border-white/10 bg-black/20 p-3">
              <div class="flex items-center justify-between">
                <p class="font-medium">{{ s.name }}</p>
                <p class="text-xs text-slate-400">{{ s.kind }}</p>
              </div>
              <p class="text-xs text-amber-300 mt-1" v-if="s.status !== 'active'">status: {{ s.status }}</p>
              <p class="text-xs text-amber-300" v-if="s.bet_state !== 'none'">bet_state: {{ s.bet_state }}</p>
            </div>
          </div>
        </div>

        <div class="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">Profit by strategy</h2>
            <span class="text-xs text-slate-400">{{ strategyRows.length }}</span>
          </div>
          <div v-if="!strategyRows.length" class="text-sm text-slate-400">No cycles yet.</div>
          <div v-else class="space-y-2">
            <div v-for="row in strategyRows" :key="row.strategy" class="rounded-xl border border-white/10 bg-black/20 p-3 flex items-center justify-between">
              <p class="text-sm font-medium">{{ row.strategy }}</p>
              <p class="text-sm font-semibold" :class="row.total >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                {{ money(row.total) }}
              </p>
            </div>
          </div>
        </div>

        <div class="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-3">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">Top sites (profit)</h2>
            <span class="text-xs text-slate-400">{{ siteProfitRows.length }}</span>
          </div>
          <div v-if="!siteProfitRows.length" class="text-sm text-slate-400">No sites yet.</div>
          <div v-else class="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            <div v-for="s in siteProfitRows" :key="s.id" class="rounded-xl border border-white/10 bg-black/20 p-3 flex items-center justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ s.name }}</p>
                <p class="text-xs text-slate-500">{{ s.kind }} • {{ money(Number(s.current_balance || 0)) }} bankroll</p>
              </div>
              <p class="text-sm font-semibold" :class="s.profit >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                {{ money(s.profit) }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Sites</h2>
          <span class="text-xs text-slate-400">{{ sites.length }}</span>
        </div>

        <div v-if="loadingSites" class="text-sm text-slate-400">Loading sites...</div>
        <div v-else-if="!sites.length" class="text-sm text-slate-400">No sites yet.</div>
        <div v-else class="space-y-2">
          <div v-for="s in sites" :key="s.id" class="rounded-xl border border-white/10 bg-black/20 p-3">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ s.name }}</p>
                <p class="text-xs text-slate-500">{{ s.kind }} • profit {{ money(Number(profitBySite.get(s.id) || 0)) }}</p>
              </div>
              <div class="flex flex-col sm:flex-row sm:items-center gap-2">
                <input v-model="balanceDraftBySite[s.id]" type="number" step="0.01" class="bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm w-44">
                <UButton size="sm" color="primary" variant="soft" @click="handleUpdateBalance(s)">Update balance</UButton>
                <select
                  :value="s.status"
                  class="bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm"
                  @change="handleUpdateState(s, 'status', $event.target.value)"
                >
                  <option value="active">active</option>
                  <option value="restricted">restricted</option>
                  <option value="gubbed">gubbed</option>
                  <option value="paused">paused</option>
                </select>
                <select
                  :value="s.bet_state"
                  class="bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm"
                  @change="handleUpdateState(s, 'bet_state', $event.target.value)"
                >
                  <option value="none">none</option>
                  <option value="pending_bet">pending_bet</option>
                  <option value="unplaced_free_bet">unplaced_free_bet</option>
                  <option value="qualifier_in_progress">qualifier_in_progress</option>
                </select>
              </div>
            </div>
            <p v-if="s.notes" class="text-[11px] text-slate-500 mt-2">{{ s.notes }}</p>
          </div>
        </div>
      </section>

      <section class="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Ongoing Cycles</h2>
          <span class="text-xs text-slate-400">{{ ongoingCycles.length }}</span>
        </div>

        <div v-if="!ongoingCycles.length" class="text-sm text-slate-400">No ongoing cycles right now.</div>
        <div v-else class="space-y-2">
          <div
            v-for="c in ongoingCycles"
            :key="`ongoing-${c.id}`"
            class="rounded-xl border border-amber-400/20 bg-amber-500/5 p-3"
          >
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ c.mb_sites?.name || 'Site' }} • {{ c.strategy }}</p>
                <p class="text-xs text-slate-400">
                  start {{ c.start_date || c.date }} • settle {{ c.date }} • {{ c.offer_name || 'cycle' }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <UButton size="sm" color="neutral" variant="soft" @click="openEditCycle(c)">Edit</UButton>
                <UButton size="sm" color="primary" variant="solid" @click="markCycleCompleted(c)">Mark completed</UButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Cycles</h2>
          <span class="text-xs text-slate-400">{{ completedCycles.length }}</span>
        </div>

        <div v-if="loadingCycles" class="text-sm text-slate-400">Loading cycles...</div>
        <div v-else-if="!completedCycles.length" class="text-sm text-slate-400">No completed cycles yet.</div>
        <div v-else class="space-y-2 max-h-[520px] overflow-y-auto pr-1">
          <div v-for="c in completedCycles" :key="c.id" class="rounded-xl border border-white/10 bg-black/20 p-3">
            <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ c.mb_sites?.name || 'Site' }} • {{ c.strategy }}</p>
                <p class="text-xs text-slate-400">
                  start {{ c.start_date || c.date }} • settle {{ c.date }} • {{ c.offer_name || 'cycle' }} • {{ c.status }}
                </p>
                <p v-if="c.notes" class="text-[11px] text-slate-500 mt-1">{{ c.notes }}</p>
              </div>
              <div class="grid grid-cols-4 gap-3 text-xs min-w-[320px]">
                <div>
                  <p class="text-slate-500">Qualifier</p>
                  <p class="font-semibold" :class="Number(c.qualifier_pnl) >= 0 ? 'text-emerald-300' : 'text-rose-300'">{{ money(Number(c.qualifier_pnl)) }}</p>
                </div>
                <div>
                  <p class="text-slate-500">Free bet</p>
                  <p class="font-semibold" :class="Number(c.freebet_pnl) >= 0 ? 'text-emerald-300' : 'text-rose-300'">{{ money(Number(c.freebet_pnl)) }}</p>
                </div>
                <div>
                  <p class="text-slate-500">Adj</p>
                  <p class="font-semibold" :class="Number(c.adjustments) >= 0 ? 'text-emerald-300' : 'text-rose-300'">{{ money(Number(c.adjustments)) }}</p>
                </div>
                <div>
                  <p class="text-slate-500">Net</p>
                  <p class="font-semibold" :class="Number(c.net_profit) >= 0 ? 'text-emerald-300' : 'text-rose-300'">{{ money(Number(c.net_profit)) }}</p>
                </div>
              </div>
            </div>
            <div class="flex justify-end gap-2 mt-2">
              <UButton size="sm" color="neutral" variant="soft" @click="openEditCycle(c)">Edit</UButton>
              <UButton size="sm" color="error" variant="ghost" @click="deleteCycle(c.id)">Delete</UButton>
            </div>
          </div>
        </div>
      </section>

      <UDrawer v-model:open="editingCycleOpen" :ui="{ overlay: 'bg-black/80' }" class="bg-[#0a0a0f]">
        <template #content>
          <div class="p-4 md:p-6 bg-[#0a0a0f] text-slate-100 border-white/10 space-y-3">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold">Edit cycle</h2>
              <UButton icon="i-lucide-x" variant="ghost" color="neutral" @click="editingCycleOpen = false" />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-2">
              <select v-model="editDraft.site_id" class="xl:col-span-2 bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
                <option value="">Select site</option>
                <option v-for="s in siteOptions" :key="`edit-site-${s.id}`" :value="s.id">{{ s.name }}</option>
              </select>
              <select v-model="editDraft.strategy" class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
                <option value="">Select strategy</option>
                <option v-for="strategy in mbStrategyOptions" :key="`edit-strategy-${strategy}`" :value="strategy">{{ strategy }}</option>
              </select>
              <input v-model="editDraft.start_date" type="date" class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
              <input v-model="editDraft.date" type="date" class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
              <input v-model="editDraft.offer_name" type="text" placeholder="Offer / note" class="xl:col-span-2 bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
              <input v-model="editDraft.qualifier_pnl" type="number" step="0.01" placeholder="Qualifier P/L" class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
              <input v-model="editDraft.freebet_pnl" type="number" step="0.01" placeholder="Free bet P/L" class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
              <input v-model="editDraft.adjustments" type="number" step="0.01" placeholder="Adjustments" class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
              <select v-model="editDraft.status" class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
                <option value="completed">completed</option>
                <option value="in_progress">in_progress</option>
              </select>
              <input v-model="editDraft.notes" type="text" placeholder="Notes (optional)" class="xl:col-span-6 bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
            </div>

            <p v-if="editError" class="text-sm text-red-400">{{ editError }}</p>

            <div class="flex items-center justify-end gap-2">
              <UButton color="neutral" variant="soft" @click="editingCycleOpen = false">Cancel</UButton>
              <UButton color="primary" variant="solid" @click="handleSaveCycleEdit">Save changes</UButton>
            </div>
          </div>
        </template>
      </UDrawer>
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

