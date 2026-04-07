<script setup>
definePageMeta({
  layout: 'auth'
});

const user = useSupabaseUser();
const redirectInfo = useSupabaseCookieRedirect();

const status = ref('verifying'); // 'verifying' | 'success' | 'error'
const countdown = ref(5);

let timer = null;

// The @nuxtjs/supabase module handles token exchange from the URL hash
// and reactively updates useSupabaseUser
watch(user, () => {
  if (user.value && status.value === 'verifying') {
    status.value = 'success';
    startCountdown();
  }
}, { immediate: true });

function startCountdown() {
  timer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) {
      clearInterval(timer);
      // Get redirect path, and clear it from the cookie
      const path = redirectInfo?.pluck ? redirectInfo.pluck() : null;
      // Redirect to the saved path, or fallback to home
      navigateTo(path || '/');
    }
  }, 1000);
}

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <div class="backdrop-blur-xl bg-white/5 dark:bg-black/60 border border-white/10 dark:border-white/10 rounded-2xl shadow-2xl p-8 w-full max-w-md mx-auto animate-in fade-in zoom-in duration-500 relative z-10">
    
    <!-- Verifying State -->
    <div v-if="status === 'verifying'" class="text-center py-8">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 mb-6 shadow-lg shadow-indigo-500/40 animate-pulse">
        <UIcon name="i-heroicons-arrow-path" class="text-3xl text-white animate-spin" />
      </div>
      <h1 class="text-2xl font-bold tracking-tight text-white mb-3">Verifying Your Email</h1>
      <p class="text-slate-400 text-sm">Please wait while we confirm your account...</p>
      <div class="mt-6 flex justify-center">
        <div class="flex gap-1.5">
          <span class="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style="animation-delay: 0ms"></span>
          <span class="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style="animation-delay: 150ms"></span>
          <span class="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style="animation-delay: 300ms"></span>
        </div>
      </div>
    </div>

    <!-- Success State -->
    <div v-else-if="status === 'success'" class="text-center py-8">
      <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 mb-6 shadow-lg shadow-emerald-500/40 animate-in zoom-in duration-300">
        <UIcon name="i-heroicons-check" class="text-4xl text-white" />
      </div>
      <h1 class="text-2xl font-bold tracking-tight text-white mb-3">Email Confirmed!</h1>
      <p class="text-slate-400 text-sm mb-6">Your account has been verified successfully.</p>
      
      <div class="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl mb-6">
        <p class="text-emerald-400 text-sm">
          Redirecting to your dashboard in <span class="font-bold text-emerald-300">{{ countdown }}</span> seconds...
        </p>
      </div>

      <UButton
          @click="navigateTo('/')"
          color="primary"
          size="xl"
          block
          class="h-12 rounded-full text-base font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 border-0 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white"
      >
        Go to Dashboard
      </UButton>
    </div>

    <!-- Error State -->
    <div v-else-if="status === 'error'" class="text-center py-8">
      <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-tr from-red-500 to-rose-500 mb-6 shadow-lg shadow-red-500/40">
        <UIcon name="i-heroicons-x-mark" class="text-4xl text-white" />
      </div>
      <h1 class="text-2xl font-bold tracking-tight text-white mb-3">Verification Failed</h1>
      <p class="text-slate-400 text-sm mb-6">We couldn't verify your email address.</p>

      <div v-if="errorMsg" class="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm flex items-center gap-2 mb-6">
        <UIcon name="i-heroicons-exclamation-circle" class="w-5 h-5 flex-shrink-0" />
        {{ errorMsg }}
      </div>

      <div class="space-y-3">
        <UButton
            @click="navigateTo('/register')"
            color="primary"
            size="xl"
            block
            class="h-12 rounded-full text-base font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 border-0 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white"
        >
          Try Again
        </UButton>
        <NuxtLink to="/login" class="block text-center text-sm text-slate-400 hover:text-slate-300 transition-colors mt-4">
          Back to login
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
