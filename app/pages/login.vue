<script setup>
import {z} from 'zod';

definePageMeta({
  layout: 'auth'
});

const user = useSupabaseUser();
const supabase = useSupabaseClient();
const loading = ref(false);
const errorMsg = ref("");

const schema = z.object({
  email: z.email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const state = reactive({
  email: '',
  password: ''
});


watch(user, () => {
  if (user.value) {
     navigateTo("/");
  }
}, { immediate: true });


async function handleLogin(event) {
  loading.value = true;
  errorMsg.value = "";

  try {
    const {error} = await supabase.auth.signInWithPassword({
      email: event.data.email,
      password: event.data.password,
    });

    if (error) throw error;
  } catch (err) {
    errorMsg.value = err.message || "An unexpected error occurred. Please try again.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div
      class="backdrop-blur-xl bg-white/5 dark:bg-black/60 border border-white/10 dark:border-white/10 rounded-2xl shadow-2xl p-8 w-full max-w-md mx-auto animate-in fade-in zoom-in duration-500 relative z-10">
    <div class="mb-8 text-center">
      <div
          class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 mb-4 shadow-lg shadow-indigo-500/40">
        <UIcon name="i-heroicons-sparkles" class="text-3xl text-white"/>
      </div>
      <h1 class="text-3xl font-bold tracking-tight text-white mb-2">Welcome Back</h1>
      <p class="text-slate-400 text-sm">Enter your credentials to access Finance Tracker</p>
    </div>

    <UForm :schema="schema" :state="state" @submit="handleLogin" class="space-y-5">
      <div v-if="errorMsg"
           class="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm flex items-center gap-2">
        <UIcon name="i-heroicons-exclamation-circle" class="w-5 h-5 flex-shrink-0"/>
        {{ errorMsg }}
      </div>

      <UFormField label="Email address" name="email"
                  :ui="{ label: { base: 'text-sm font-medium text-slate-300 block mb-1' } }">
        <UInput
            v-model="state.email"
            type="email"
            placeholder="you@example.com"
            icon="i-heroicons-envelope"
            autocomplete="email"
            size="xl"
            class="h-12 w-full text-base"
            variant="outline"
            :ui="{ icon: { base: 'text-slate-400 dark:text-slate-400' } }"
        />
      </UFormField>

      <UFormField label="Password" name="password"
                  :ui="{ label: { base: 'text-sm font-medium text-slate-300 block mb-1' } }">
        <UInput
            v-model="state.password"
            type="password"
            placeholder="••••••••"
            icon="i-heroicons-lock-closed"
            autocomplete="current-password"
            size="xl"
            class="h-12 w-full text-base"
            variant="outline"
            :ui="{ icon: { base: 'text-slate-400 dark:text-slate-400' } }"
        />
      </UFormField>

      <div class="flex justify-end">
        <NuxtLink to="/forgot-password" class="text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
          Forgot password?
        </NuxtLink>
      </div>

      <UButton
          type="submit"
          :loading="loading"
          color="primary"
          size="xl"
          block
          class="mt-4 h-12 rounded-full text-base font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 border-0 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white"
      >
        Sign In
      </UButton>
    </UForm>

    <div class="mt-8 pt-6 border-t border-white/5 text-center text-sm text-slate-400">
      Don't have an account?
      <NuxtLink to="/register" class="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
        Create one now
      </NuxtLink>
    </div>
  </div>
</template>