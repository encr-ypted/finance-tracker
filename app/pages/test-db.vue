<script setup>
import { ref, onMounted } from 'vue'

const supabase = useSupabaseClient()
const user = useSupabaseUser()

const testResults = ref(null)
const errorResult = ref(null)
const status = ref('Initializing...')

onMounted(async () => {
  status.value = 'Checking user session...'
  if (!user.value) {
    status.value = 'Failed: No user logged in. Supabase cannot fetch RLS protected rows.'
    return
  }

  status.value = `User found: ${user.value.id}. Fetching from categories...`
  
  try {
    const { data, error } = await supabase.from('categories').select('*')
    if (error) {
      errorResult.value = error
      status.value = 'Database Error!'
    } else {
      testResults.value = data
      status.value = `Success! Fetched ${data.length} rows.`
    }
  } catch (err) {
    errorResult.value = err.message
    status.value = 'Catch Block Error'
  }
})
</script>

<template>
  <div class="p-8 max-w-2xl mx-auto space-y-6 bg-slate-900 border border-slate-700 rounded-xl mt-10">
    <h1 class="text-xl font-bold text-white">Supabase Connection Test</h1>
    
    <div class="p-4 rounded-lg" :class="status.includes('Success') ? 'bg-green-900/50 text-green-300' : (status.includes('Failed') || status.includes('Error') ? 'bg-red-900/50 text-red-300' : 'bg-blue-900/50 text-blue-300')">
      <strong>Status:</strong> {{ status }}
    </div>

    <div>
      <h2 class="text-sm font-semibold text-slate-400 mb-2">User Session Info:</h2>
      <pre class="bg-black/50 p-4 ring-1 ring-white/10 rounded text-[11px] text-slate-300 overflow-auto max-h-48">{{ user ? { id: user.id, email: user.email, updated_at: user.updated_at } : 'No active session (null)' }}</pre>
    </div>

    <div v-if="errorResult">
      <h2 class="text-sm font-semibold text-red-400 mb-2">Supabase Error Payload:</h2>
      <pre class="bg-red-950/50 p-4 ring-1 ring-red-500/20 rounded text-[11px] text-red-300 overflow-auto max-h-64">{{ errorResult }}</pre>
    </div>

    <div v-if="testResults">
      <h2 class="text-sm font-semibold text-green-400 mb-2">Data Fetched from 'categories':</h2>
      <pre class="bg-green-950/50 p-4 ring-1 ring-green-500/20 rounded text-[11px] text-green-300 overflow-auto max-h-64">{{ testResults.length === 0 ? 'Empty Array [] (No rows match the user_id or RLS blocked it)' : testResults }}</pre>
    </div>
  </div>
</template>
