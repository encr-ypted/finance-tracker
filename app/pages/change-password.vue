<script setup>
import { z } from 'zod';

definePageMeta({
  layout: 'default'
});

const supabase = useSupabaseClient();
const loading = ref(false);
const errorMsg = ref("");
const successMsg = ref("");

const schema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => data.currentPassword !== data.newPassword, {
  message: "New password must be different from current password",
  path: ["newPassword"],
});

const state = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
});

async function handleChangePassword(event) {
  loading.value = true;
  errorMsg.value = "";
  successMsg.value = "";

  try {
    // First verify the current password by re-authenticating
    const user = useSupabaseUser();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.value.email,
      password: event.data.currentPassword,
    });

    if (signInError) {
      throw new Error('Current password is incorrect');
    }

    // Update to the new password
    const { error } = await supabase.auth.updateUser({
      password: event.data.newPassword,
    });

    if (error) throw error;
    
    successMsg.value = "Password changed successfully!";
    state.currentPassword = '';
    state.newPassword = '';
    state.confirmPassword = '';
  } catch (err) {
    errorMsg.value = err.message || "An unexpected error occurred. Please try again.";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
    <div class="backdrop-blur-xl bg-white/5 dark:bg-black/60 border border-white/10 dark:border-white/10 rounded-2xl shadow-2xl p-8 w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
      <div class="mb-8 text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 mb-4 shadow-lg shadow-violet-500/40">
          <UIcon name="i-heroicons-shield-check" class="text-3xl text-white" />
        </div>
        <h1 class="text-3xl font-bold tracking-tight text-white mb-2">Change Password</h1>
        <p class="text-slate-400 text-sm">Update your account password</p>
      </div>

      <UForm :schema="schema" :state="state" @submit="handleChangePassword" class="space-y-5">
        <div v-if="errorMsg" class="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm flex items-center gap-2">
          <UIcon name="i-heroicons-exclamation-circle" class="w-5 h-5 flex-shrink-0" />
          {{ errorMsg }}
        </div>
        <div v-if="successMsg" class="p-3 bg-emerald-500/10 border border-emerald-500/50 rounded-lg text-emerald-400 text-sm flex items-center gap-2">
          <UIcon name="i-heroicons-check-circle" class="w-5 h-5 flex-shrink-0" />
          {{ successMsg }}
        </div>

        <UFormField label="Current Password" name="currentPassword" :ui="{ label: { base: 'text-sm font-medium text-slate-300 block mb-1' } }">
          <UInput
              v-model="state.currentPassword"
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

        <div class="border-t border-white/5 pt-5">
          <UFormField label="New Password" name="newPassword" :ui="{ label: { base: 'text-sm font-medium text-slate-300 block mb-1' } }">
            <UInput
                v-model="state.newPassword"
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
        </div>

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
            class="mt-8 h-12 rounded-full text-base font-semibold shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-all duration-300 border-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white"
        >
          Change Password
        </UButton>
      </UForm>

      <div class="mt-8 pt-6 border-t border-white/5 text-center text-sm text-slate-400">
        <NuxtLink to="/" class="text-violet-400 hover:text-violet-300 font-semibold transition-colors inline-flex items-center gap-1">
          <UIcon name="i-heroicons-arrow-left" class="w-4 h-4" />
          Back to Dashboard
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
