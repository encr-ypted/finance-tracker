<script setup>
const user = useSupabaseUser();
const supabase = useSupabaseClient();
const isProfileSlideoverOpen = ref(false);

const logout = async () => {
  await supabase.auth.signOut();
  navigateTo('/login');
}
</script>

<template>
  <div class="min-h-screen bg-[#05070d] text-slate-200 selection:bg-indigo-500/30">
    <header class="sticky top-0 z-40 backdrop-blur-xl bg-[#05070d]/80 border-b border-white/10">
      <div class="max-w-7xl mx-auto px-4 md:px-8 h-14 flex items-center justify-between">
        <button class="flex items-center gap-2" @click="navigateTo('/finance')">
          <UIcon name="i-heroicons-wallet" class="w-6 h-6 text-emerald-400" />
          <span class="font-semibold tracking-tight">Finance Tracker</span>
        </button>
        <div class="flex items-center gap-2">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-heroicons-user-circle"
            @click="isProfileSlideoverOpen = true"
          >
            Account
          </UButton>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto">
      <slot />
    </main>

    <!-- Account panel -->
    <USlideover v-model:open="isProfileSlideoverOpen" class="dark:bg-[#0a0a0a]" :ui="{ overlay: 'bg-black/80' }">
      <template #content>
        <div class="h-full w-full bg-[#0a0a0a] border-l border-white/[0.05] p-6 flex flex-col shadow-2xl overflow-y-auto">
          <div class="flex items-center justify-between mb-8">
            <h3 class="text-lg font-semibold tracking-tight text-slate-100">Account</h3>
            <UButton icon="i-heroicons-x-mark" color="gray" variant="ghost" class="rounded-full" @click="isProfileSlideoverOpen = false" />
          </div>

          <div class="flex items-center gap-4 p-4 rounded-xl bg-[#171717] ring-1 ring-white/[0.05] mb-8">
            <UAvatar :alt="user?.email?.toUpperCase() || 'U'" size="md" class="bg-indigo-500 text-white" />
            <div class="flex flex-col overflow-hidden">
               <span class="font-medium text-slate-100 truncate">{{ user?.email?.split('@')[0] || 'User' }}</span>
               <span class="text-xs text-slate-500 truncate">{{ user?.email }}</span>
            </div>
          </div>

          <div class="mb-8">
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 px-1">Quick Actions</p>
            <div class="flex flex-col gap-1">
              <UButton icon="i-heroicons-cog-6-tooth" color="gray" variant="ghost" class="justify-start text-slate-300 hover:text-white hover:bg-white/5 h-10 rounded-lg" @click="isProfileSlideoverOpen = false; navigateTo('/finance')">Finance</UButton>
            </div>
          </div>

          <div class="flex-1"></div>
          <USeparator class="my-6 border-white/[0.02]" />
          <UButton color="white" variant="ghost" icon="i-heroicons-arrow-right-on-rectangle" class="justify-start h-10 text-slate-400 hover:text-red-400" @click="logout">Log Out</UButton>
        </div>
      </template>
    </USlideover>
  </div>
</template>
