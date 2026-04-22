<script setup>
import { computed, reactive, watch } from 'vue'

const {
  streams,
  events,
  streamTotals,
  totalProfit,
  loadingStreams,
  loadingEvents,
  fetchStreams,
  addStream,
  updateStream,
  fetchEvents,
  addEvent,
  updateEvent,
  deleteEvent
} = useProfit()
const {
  streamTypeOptions,
  fetchOptions,
  addStreamType
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

const streamDraft = reactive({
  name: '',
  type: ''
})

const eventDraft = reactive({
  stream_id: '',
  date: formatDate(today),
  amount: '',
  category: 'general',
  counterparty: '',
  notes: ''
})

const error = ref('')
const streamTypeDraft = ref('')
const editingStreamId = ref('')
const editingEventId = ref('')
const editError = ref('')

const streamEditDraft = reactive({
  name: '',
  type: ''
})

const eventEditDraft = reactive({
  stream_id: '',
  date: formatDate(today),
  amount: '',
  category: '',
  counterparty: '',
  notes: ''
})

const streamOptions = computed(() => streams.value.filter((s) => !s.is_archived))

async function handleAddStream() {
  error.value = ''
  if (!streamDraft.name.trim()) return
  if (!streamDraft.type) {
    error.value = 'Pick a stream type or add one first.'
    return
  }
  const { error: e } = await addStream({ name: streamDraft.name.trim(), type: streamDraft.type })
  if (e) {
    error.value = e.message || 'Failed to add stream.'
    return
  }
  streamDraft.name = ''
  streamDraft.type = ''
}

async function handleAddStreamType() {
  const clean = String(streamTypeDraft.value || '').trim()
  if (!clean) return
  const { error: e } = await addStreamType(clean)
  if (e) {
    error.value = e.message || 'Failed to add stream type.'
    return
  }
  streamDraft.type = clean
  streamTypeDraft.value = ''
}

function startEditStream(stream) {
  editError.value = ''
  editingStreamId.value = stream.id
  streamEditDraft.name = stream.name || ''
  streamEditDraft.type = stream.type || ''
}

async function handleSaveStreamEdit() {
  if (!editingStreamId.value) return
  editError.value = ''

  if (!streamEditDraft.name.trim()) {
    editError.value = 'Stream name is required.'
    return
  }
  if (!streamEditDraft.type) {
    editError.value = 'Stream type is required.'
    return
  }

  const { error: e } = await updateStream(editingStreamId.value, {
    name: streamEditDraft.name.trim(),
    type: streamEditDraft.type
  })

  if (e) {
    editError.value = e.message || 'Failed to update stream.'
    return
  }

  editingStreamId.value = ''
}

function cancelStreamEdit() {
  editingStreamId.value = ''
}

async function handleAddEvent() {
  error.value = ''
  if (!eventDraft.stream_id) {
    error.value = 'Pick a stream.'
    return
  }

  const amount = Number(eventDraft.amount)
  if (!Number.isFinite(amount) || amount === 0) {
    error.value = 'Amount must be a non-zero number (use negative for costs).'
    return
  }

  const { error: e } = await addEvent({
    stream_id: eventDraft.stream_id,
    date: eventDraft.date,
    amount,
    category: eventDraft.category.trim() || 'general',
    counterparty: eventDraft.counterparty.trim() || null,
    notes: eventDraft.notes.trim() || null
  })

  if (e) {
    error.value = e.message || 'Failed to add event.'
    return
  }

  eventDraft.amount = ''
  eventDraft.category = 'general'
  eventDraft.counterparty = ''
  eventDraft.notes = ''
}

function startEditEvent(event) {
  editError.value = ''
  editingEventId.value = event.id
  eventEditDraft.stream_id = event.stream_id || ''
  eventEditDraft.date = event.date || formatDate(today)
  eventEditDraft.amount = String(Number(event.amount || 0))
  eventEditDraft.category = event.category || 'general'
  eventEditDraft.counterparty = event.counterparty || ''
  eventEditDraft.notes = event.notes || ''
}

async function handleSaveEventEdit() {
  if (!editingEventId.value) return
  editError.value = ''

  if (!eventEditDraft.stream_id) {
    editError.value = 'Pick a stream.'
    return
  }

  const amount = Number(eventEditDraft.amount)
  if (!Number.isFinite(amount) || amount === 0) {
    editError.value = 'Amount must be a non-zero number.'
    return
  }

  const { error: e } = await updateEvent(editingEventId.value, {
    stream_id: eventEditDraft.stream_id,
    date: eventEditDraft.date,
    amount,
    category: eventEditDraft.category.trim() || 'general',
    counterparty: eventEditDraft.counterparty.trim() || null,
    notes: eventEditDraft.notes.trim() || null
  })

  if (e) {
    editError.value = e.message || 'Failed to update event.'
    return
  }

  editingEventId.value = ''
}

function cancelEventEdit() {
  editingEventId.value = ''
}

watch(
  user,
  async (u) => {
    if (!u) return
    await Promise.all([fetchStreams(), fetchEvents(), fetchOptions()])
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
            <h1 class="text-2xl md:text-3xl font-bold tracking-tight">Side Hustles & Sales</h1>
            <p class="text-slate-300/80 text-sm mt-1">A simple profit ledger for anything you sell or earn from.</p>
          </div>
          <div class="text-right">
            <p class="text-xs text-slate-400">Total profit (all time)</p>
            <p class="text-2xl font-bold" :class="totalProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'">
              {{ money(totalProfit) }}
            </p>
          </div>
        </div>
      </section>

      <section class="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div class="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-4">
          <h2 class="text-lg font-semibold">Add stream</h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input v-model="streamDraft.name" type="text" placeholder="Stream (e.g. Vinted, eBay)" class="md:col-span-2 bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
            <select v-model="streamDraft.type" class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
              <option value="">Select type</option>
              <option v-for="type in streamTypeOptions" :key="type" :value="type">{{ type }}</option>
            </select>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              v-model="streamTypeDraft"
              type="text"
              placeholder="Add custom stream type"
              class="md:col-span-3 bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm"
            >
            <UButton color="neutral" variant="soft" @click="handleAddStreamType">Add type</UButton>
          </div>
          <UButton color="primary" :loading="loadingStreams" @click="handleAddStream">Add stream</UButton>
        </div>

        <div class="xl:col-span-2 rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-4">
          <h2 class="text-lg font-semibold">Add profit event</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-2">
            <select v-model="eventDraft.stream_id" class="xl:col-span-2 bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
              <option value="">Select stream</option>
              <option v-for="s in streamOptions" :key="s.id" :value="s.id">
                {{ s.name }}
              </option>
            </select>
            <input v-model="eventDraft.amount" type="number" step="0.01" placeholder="+income / -cost" class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
            <input v-model="eventDraft.date" type="date" class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
            <input v-model="eventDraft.category" type="text" placeholder="Category" class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
            <input v-model="eventDraft.counterparty" type="text" placeholder="Counterparty (optional)" class="bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
            <input v-model="eventDraft.notes" type="text" placeholder="Notes (optional)" class="xl:col-span-6 bg-black/30 border border-white/10 rounded-xl px-3 h-11 text-sm">
          </div>

          <div class="flex items-center justify-between gap-3">
            <p v-if="error" class="text-sm text-red-400">{{ error }}</p>
            <UButton color="primary" :loading="loadingEvents" @click="handleAddEvent">Add event</UButton>
          </div>
        </div>
      </section>

      <section class="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Streams</h2>
          <span class="text-xs text-slate-400">{{ streams.length }} streams</span>
        </div>

        <div v-if="loadingStreams" class="text-sm text-slate-400">Loading streams...</div>
        <div v-else-if="!streams.length" class="text-sm text-slate-400">No streams yet.</div>
        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          <div v-for="s in streams" :key="s.id" class="rounded-xl border border-white/10 bg-black/20 p-3">
            <div v-if="editingStreamId === s.id" class="space-y-2">
              <input v-model="streamEditDraft.name" type="text" class="w-full bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
              <div class="grid grid-cols-2 gap-2">
                <select v-model="streamEditDraft.type" class="bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
                  <option value="">Select type</option>
                  <option v-for="type in streamTypeOptions" :key="`edit-type-${type}`" :value="type">{{ type }}</option>
                </select>
                <div class="flex items-center justify-end gap-2">
                  <UButton size="sm" color="neutral" variant="soft" @click="cancelStreamEdit">Cancel</UButton>
                  <UButton size="sm" color="primary" variant="solid" @click="handleSaveStreamEdit">Save</UButton>
                </div>
              </div>
            </div>
            <div v-else>
              <div class="flex items-center justify-between">
                <p class="font-medium">{{ s.name }}</p>
                <p class="text-sm font-semibold" :class="Number(streamTotals.get(s.id) || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                  {{ money(Number(streamTotals.get(s.id) || 0)) }}
                </p>
              </div>
              <p class="text-xs text-slate-500">{{ s.type }}</p>
              <div class="flex justify-end mt-2">
                <UButton size="sm" color="neutral" variant="soft" @click="startEditStream(s)">Edit</UButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="rounded-3xl border border-white/10 bg-white/[0.03] p-4 md:p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">Profit events</h2>
          <span class="text-xs text-slate-400">{{ events.length }} records</span>
        </div>

        <div v-if="loadingEvents" class="text-sm text-slate-400">Loading events...</div>
        <div v-else-if="!events.length" class="text-sm text-slate-400">No events yet.</div>
        <div v-else class="space-y-2 max-h-[460px] overflow-y-auto pr-1">
          <div
            v-for="e in events"
            :key="e.id"
            class="rounded-xl border border-white/10 bg-black/20 p-3 flex items-center justify-between gap-3"
          >
            <template v-if="editingEventId === e.id">
              <div class="w-full space-y-2">
                <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-2">
                  <select v-model="eventEditDraft.stream_id" class="xl:col-span-2 bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
                    <option value="">Select stream</option>
                    <option v-for="s in streamOptions" :key="`edit-stream-${s.id}`" :value="s.id">{{ s.name }}</option>
                  </select>
                  <input v-model="eventEditDraft.amount" type="number" step="0.01" class="bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
                  <input v-model="eventEditDraft.date" type="date" class="bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
                  <input v-model="eventEditDraft.category" type="text" class="bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
                  <input v-model="eventEditDraft.counterparty" type="text" class="bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
                  <input v-model="eventEditDraft.notes" type="text" class="xl:col-span-6 bg-black/30 border border-white/10 rounded-lg px-3 h-9 text-sm">
                </div>
                <div class="flex justify-end gap-2">
                  <UButton size="sm" color="neutral" variant="soft" @click="cancelEventEdit">Cancel</UButton>
                  <UButton size="sm" color="primary" variant="solid" @click="handleSaveEventEdit">Save</UButton>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">
                  {{ e.profit_streams?.name || 'Stream' }} • {{ e.category }}
                </p>
                <p class="text-xs text-slate-400">
                  {{ e.date }}<span v-if="e.counterparty"> • {{ e.counterparty }}</span><span v-if="e.notes"> • {{ e.notes }}</span>
                </p>
              </div>
              <div class="flex items-center gap-3">
                <p class="text-sm font-semibold" :class="Number(e.amount) >= 0 ? 'text-emerald-300' : 'text-rose-300'">
                  {{ money(Number(e.amount)) }}
                </p>
                <UButton size="sm" color="neutral" variant="soft" @click="startEditEvent(e)">Edit</UButton>
                <UButton size="sm" color="error" variant="ghost" @click="deleteEvent(e.id)">Delete</UButton>
              </div>
            </template>
          </div>
        </div>
        <p v-if="editError" class="text-sm text-red-400">{{ editError }}</p>
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

