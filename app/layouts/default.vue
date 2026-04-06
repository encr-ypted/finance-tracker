<script setup>
const user = useSupabaseUser();
const supabase = useSupabaseClient();
const route = useRoute();

const open = ref(true); // Desktop sidebar state
const isAppDrawerOpen = ref(false); // Bottom Drawer override
const isProfileSlideoverOpen = ref(false); // Control center override

// Core OS Navigation (App Library)
const navigationItems = computed(() => {
  return [{
    label: 'Home',
    icon: 'i-heroicons-home',
    to: '/'
  }, {
    label: 'Finance',
    icon: 'i-heroicons-wallet',
    to: '/finance'
  }, {
    label: 'Notes',
    icon: 'i-heroicons-document-text',
    to: '/notes'
  }, {
    label: 'Voice',
    icon: 'i-heroicons-microphone',
    to: '/voice'
  }]
})

// Dynamic App Icon for Mobile Dock
const currentAppIcon = computed(() => {
  const currentApp = navigationItems.value.find(item => item.to === route.path && route.path !== '/');
  return currentApp ? currentApp.icon : 'i-heroicons-squares-2x2';
});

const logout = async () => {
  await supabase.auth.signOut()
  navigateTo('/login')
}
</script>

<template>
  <div class="flex h-screen bg-black overflow-hidden text-slate-200 selection:bg-indigo-500/30 relative">
    
    <USidebar
      v-model:open="open"
      variant="inset"
      collapsible="icon"
      :ui="{
        container: 'h-full',
        inner: 'divide-transparent bg-transparent',
        body: 'py-0',
      }"
    >
      <template #header>
        <div class="flex items-center w-full" :class="open ? 'justify-between' : 'justify-center pl-1.5'">
          <div class="flex items-center gap-2 overflow-hidden" v-if="open">
            <UIcon name="i-heroicons-sparkles" class="w-8 h-8 text-indigo-500 shadow-sm rounded flex-shrink-0" />
            <span class="text-xl font-bold tracking-tight truncate">LifeOS</span>
          </div>
          <UButton
            :icon="open ? 'i-heroicons-chevron-left' : 'i-heroicons-bars-3'"
            color="gray"
            variant="ghost"
            class="flex-shrink-0"
            @click="open = !open"
          />
        </div>
      </template>

      <template #default="{ state }">
        <UNavigationMenu
          :key="state"
          :items="navigationItems"
          orientation="vertical"
          :ui="{ link: 'p-1.5 overflow-hidden text-slate-400 hover:text-white', linkActive: 'text-white bg-white/5' }"
        />
      </template>

      <template #footer>
        <UButton
          color="neutral"
          variant="ghost"
          square
          class="w-full h-12 overflow-hidden flex items-center px-2 hover:bg-white-[0.02] transition-colors"
          :class="open ? 'justify-start' : 'justify-center mx-auto w-10 h-10'"
          @click="isProfileSlideoverOpen = true"
        >
          <UAvatar :alt="user?.email?.toUpperCase() || 'U'" size="sm" class="bg-indigo-500 text-white flex-shrink-0" />
          <span v-if="open" class="truncate ml-3 text-sm text-slate-300">{{ user?.email || 'User' }}</span>
        </UButton>
      </template>
    </USidebar>

    <!-- Main Page Wrapper (Full-screen on mobile, floating bezel on desktop) -->
    <div class="flex-1 flex flex-col min-w-0 bg-[#0a0a0a] md:m-2 lg:m-4 md:rounded-2xl md:ring-1 md:ring-white/[0.05] relative overflow-hidden z-10 md:shadow-2xl">
      
      <!-- Page Content / Slot -->
      <div class="flex-1 overflow-y-auto w-full relative pb-24 md:pb-0">
        <slot />
      </div>

    </div>

    <!-- ULTRA-MINIMALIST MOBILE DOCK -->
    <div class="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#171717]/90 backdrop-blur-xl rounded-full flex items-center justify-center gap-6 px-6 py-3 z-50 shadow-2xl ring-1 ring-white/[0.08]">
      
      <!-- Home Shortcut -->
      <router-link to="/" class="flex items-center justify-center w-12 h-12 rounded-full transition-colors group" active-class="bg-white/5">
        <UIcon name="i-heroicons-home" class="w-6 h-6 text-slate-400 group-[.router-link-active]:text-white transition-colors" />
      </router-link>

       <!-- Dynamic App Drawer Button -->
      <button @click="isAppDrawerOpen = true" class="flex items-center justify-center w-12 h-12 rounded-full bg-white text-black hover:bg-slate-200 active:scale-95 transition-all">
        <UIcon :name="currentAppIcon" class="w-6 h-6" />
      </button>

      <!-- Control Center / Profile Override -->
      <button @click="isProfileSlideoverOpen = true" class="flex items-center justify-center w-12 h-12 rounded-full text-slate-400 hover:text-white transition-colors">
         <UAvatar :alt="user?.email?.toUpperCase() || 'U'" size="sm" class="bg-indigo-500 text-white flex-shrink-0" />
      </button>

    </div>

    <!-- APP SWITCHER (Bottom Drawer) -->
    <client-only>
      <UDrawer v-model:open="isAppDrawerOpen" class="dark:bg-[#171717]"  :ui="{ overlay: 'bg-black/80'}">
        <template #content>
          <div class="p-6 pt-10 pb-12 relative">
            <h2 class="text-xl font-semibold mb-6 flex justify-center text-slate-200">Switch Application</h2>
            
            <div class="grid grid-cols-3 sm:grid-cols-4 gap-4 px-2 max-w-lg mx-auto">
              <router-link 
                v-for="app in navigationItems.filter(i => i.to !== '/')" 
                :key="app.label" 
                :to="app.to" 
                @click="isAppDrawerOpen = false" 
                class="flex flex-col items-center gap-3 p-4 rounded-2xl transition-all"
                :class="route.path === app.to ? 'bg-white/10 ring-1 ring-white/20' : 'hover:bg-white/5 active:scale-95'"
              >
                <UIcon :name="app.icon" class="w-8 h-8 transition-colors" :class="route.path === app.to ? 'text-white' : 'text-slate-400'" />
                <span class="text-xs font-medium transition-colors" :class="route.path === app.to ? 'text-white' : 'text-slate-500'">{{ app.label }}</span>
              </router-link>
            </div>
          </div>
        </template>
      </UDrawer>
    </client-only>

    <!-- CONTROL CENTER (Right Slideover) -->
    <USlideover v-model:open="isProfileSlideoverOpen" class="dark:bg-[#0a0a0a]" :ui="{ overlay: 'bg-black/80' }">
      <template #content>
        <div class="h-full w-full bg-[#0a0a0a] border-l border-white/[0.05] p-6 flex flex-col shadow-2xl overflow-y-auto">
          <div class="flex items-center justify-between mb-8">
            <h3 class="text-lg font-semibold tracking-tight text-slate-100">Control Center</h3>
            <UButton icon="i-heroicons-x-mark" color="gray" variant="ghost" class="rounded-full" @click="isProfileSlideoverOpen = false" />
          </div>
          
          <!-- User Profile Card -->
          <div class="flex items-center gap-4 p-4 rounded-xl bg-[#171717] ring-1 ring-white/[0.05] mb-8">
            <UAvatar :alt="user?.email?.toUpperCase() || 'U'" size="md" class="bg-indigo-500 text-white" />
            <div class="flex flex-col overflow-hidden">
               <span class="font-medium text-slate-100 truncate">{{ user?.email?.split('@')[0] || 'User' }}</span>
               <span class="text-xs text-slate-500 truncate">{{ user?.email }}</span>
            </div>
          </div>

          <!-- System Status Mini-Widget -->
          <div class="mb-8">
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 px-1">System Status</p>
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-[#171717] rounded-xl p-3 ring-1 ring-white/[0.05] flex flex-col gap-1">
                <UIcon name="i-heroicons-cloud-arrow-up" class="w-5 h-5 text-emerald-400" />
                <span class="text-[10px] text-slate-400">Sync Status</span>
                <span class="text-xs font-semibold text-white">Up to date</span>
              </div>
              <div class="bg-[#171717] rounded-xl p-3 ring-1 ring-white/[0.05] flex flex-col gap-1">
                <UIcon name="i-heroicons-server" class="w-5 h-5 text-indigo-400" />
                <span class="text-[10px] text-slate-400">Database</span>
                <span class="text-xs font-semibold text-white">Connected</span>
              </div>
            </div>
          </div>

          <!-- Quick Toggles -->
          <div class="mb-8">
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3 px-1">Quick Actions</p>
            <div class="flex flex-col gap-1">
              <UButton icon="i-heroicons-moon" color="gray" variant="ghost" class="justify-start text-slate-300 hover:text-white hover:bg-white/5 h-10 rounded-lg">Dark Mode</UButton>
              <UButton icon="i-heroicons-bell-slash" color="gray" variant="ghost" class="justify-start text-slate-300 hover:text-white hover:bg-white/5 h-10 rounded-lg">Do Not Disturb</UButton>
              <UButton icon="i-heroicons-lock-closed" color="gray" variant="ghost" class="justify-start text-slate-300 hover:text-white hover:bg-white/5 h-10 rounded-lg" to="/settings" @click="isProfileSlideoverOpen = false">Privacy Controls</UButton>
            </div>
          </div>

          <div class="flex-1"></div>

          <USeparator class="my-6 border-white/[0.02]" />

          <UButton color="white" variant="ghost" icon="i-heroicons-arrow-right-on-rectangle" class="justify-start h-10 text-slate-400 hover:text-red-400" @click="logout">Log Out User</UButton>
        </div>
      </template>
    </USlideover>
  </div>
</template>
