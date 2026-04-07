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
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const state = reactive({
  password: '',
  confirmPassword: ''
});

async function handlePasswordUpdate(event) {
  loading.value = true;
  errorMsg.value = "";
  successMsg.value = "";

  try {
    const { error } = await supabase.auth.updateUser({
      password: event.data.password,
    });

    if (error) throw error;
    successMsg.value = "Password updated successfully! Redirecting to login...";

    setTimeout(() => {
      navigateTo("/login");
    }, 2000);
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
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 mb-4 shadow-lg shadow-rose-500/40">
        <UIcon name="i-heroicons-lock-open" class="text-3xl text-white" />
      </div>
      <h1 class="text-3xl font-bold tracking-tight text-white mb-2">Reset Password</h1>
      <p class="text-slate-400 text-sm">Choose a new password for your account</p>
    </div>

    <UForm :schema="schema" :state="state" @submit="handlePasswordUpdate" class="space-y-5">
      <div v-if="errorMsg" class="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm flex items-center gap-2">
        <UIcon name="i-heroicons-exclamation-circle" class="w-5 h-5 flex-shrink-0" />
        {{ errorMsg }}
      </div>
      <div v-if="successMsg" class="p-3 bg-emerald-500/10 border border-emerald-500/50 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
        <UIcon name="i-heroicons-check-circle" class="w-5 h-5 flex-shrink-0" />
        {{ successMsg }}
      </div>

      <UFormField label="New Password" name="password" :ui="{ label: { base: 'text-sm font-medium text-slate-300 block mb-1' } }">
        <UInput
            v-model="state.password"
            type="password"
            placeholder="••••••••"
            icon="i-heroicons-lock-closed"
            autocomplete="new-password"
            size="xl"
            class="h-12 w-full text-base"
            variant="outline"
            :ui="{ icon: { base: 'text-slate-400 dark:text-slate-400' } }"
        />
      </UFormField>

      <UFormField label="Confirm New Password" name="confirmPassword" :ui="{ label: { base: 'text-sm font-medium text-slate-300 block mb-1' } }">
        <UInput
            v-model="state.confirmPassword"
            type="password"
            placeholder="••••••••"
            icon="i-heroicons-lock-closed"
            autocomplete="new-password"
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
          class="mt-8 h-12 rounded-full text-base font-semibold shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 transition-all duration-300 border-0 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-400 hover:to-pink-400 text-white"
      >
        Update Password
      </UButton>
    </UForm>

    <div class="mt-8 pt-6 border-t border-white/5 text-center text-sm text-slate-400">
      <NuxtLink to="/login" class="text-rose-400 hover:text-rose-300 font-semibold transition-colors">
        Back to login
      </NuxtLink>
    </div>
  </div>
</template>
