<script setup>
import { z } from 'zod';

definePageMeta({
  layout: 'auth'
});

const supabase = useSupabaseClient();
const loading = ref(false);
const errorMsg = ref("");
const successMsg = ref("");

const schema = z.object({
  email: z.string().email('Please enter a valid email')
});

const state = reactive({
  email: ''
});

async function handleReset(event) {
  loading.value = true;
  errorMsg.value = "";
  successMsg.value = "";

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(event.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) throw error;
    successMsg.value = "Password reset link sent! Check your email inbox.";
  } catch (err) {
    errorMsg.value = err.message || "An unexpected error occurred. Please try again.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="backdrop-blur-xl bg-white/5 dark:bg-black/60 border border-white/10 dark:border-white/10 rounded-2xl shadow-2xl p-8 w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
    <div class="mb-8 text-center">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 mb-4 shadow-lg shadow-amber-500/40">
        <UIcon name="i-heroicons-key" class="text-3xl text-white" />
      </div>
      <h1 class="text-3xl font-bold tracking-tight text-white mb-2">Forgot Password</h1>
      <p class="text-slate-400 text-sm">Enter your email and we'll send you a reset link</p>
    </div>

    <UForm :schema="schema" :state="state" @submit="handleReset" class="space-y-5">
      <div v-if="errorMsg" class="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm flex items-center gap-2">
        <UIcon name="i-heroicons-exclamation-circle" class="w-5 h-5 flex-shrink-0" />
        {{ errorMsg }}
      </div>
      <div v-if="successMsg" class="p-3 bg-emerald-500/10 border border-emerald-500/50 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
        <UIcon name="i-heroicons-check-circle" class="w-5 h-5 flex-shrink-0" />
        {{ successMsg }}
      </div>

      <UFormField label="Email address" name="email" :ui="{ label: { base: 'text-sm font-medium text-slate-300 block mb-1' } }">
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

      <UButton
          type="submit"
          :loading="loading"
          color="primary"
          size="xl"
          block
          class="mt-8 h-12 rounded-full text-base font-semibold shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 transition-all duration-300 border-0 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white"
      >
        Send Reset Link
      </UButton>
    </UForm>

    <div class="mt-8 pt-6 border-t border-white/5 text-center text-sm text-slate-400">
      Remember your password?
      <NuxtLink to="/login" class="text-amber-400 hover:text-amber-300 font-semibold transition-colors">
        Back to login
      </NuxtLink>
    </div>
  </div>
</template>
