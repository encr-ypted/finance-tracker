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
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"], // path of error
});

const state = reactive({
  email: '',
  password: '',
  confirmPassword: ''
});

async function handleRegister(event) {
  loading.value = true;
  errorMsg.value = "";
  successMsg.value = "";

  try {
    const { error } = await supabase.auth.signUp({
      email: event.data.email,
      password: event.data.password,
    });
    
    if (error) throw error;
    successMsg.value = "Registration successful! You can now log in.";
    
    // Automatically redirect to login page after 2 seconds
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
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-500 mb-4 shadow-lg shadow-emerald-500/40">
        <UIcon name="i-heroicons-user-plus" class="text-3xl text-white" />
      </div>
      <h1 class="text-3xl font-bold tracking-tight text-white mb-2">Create Account</h1>
      <p class="text-slate-400 text-sm">Create an account for Finance Tracker</p>
    </div>

    <UForm :schema="schema" :state="state" @submit="handleRegister" class="space-y-5">
      <div v-if="errorMsg" class="p-3 bg-red-500/10 border border-red-500/50 rounded-lg text-red-500 text-sm flex items-center gap-2">
        <UIcon name="i-heroicons-exclamation-circle" class="w-5 h-5 flex-shrink-0" />
        {{ errorMsg }}
      </div>
      <div v-if="successMsg" class="p-3 bg-emerald-500/10 border border-emerald-500/50 rounded-lg text-emerald-500 text-sm flex items-center gap-2">
        <UIcon name="i-heroicons-check-circle" class="w-5 h-5 flex-shrink-0" />
        {{ successMsg }}
      </div>

      <UFormField label="Email address" name="email" :ui="{ label: { base: 'text-sm font-medium text-slate-300 block mb-1' } }">
        <UInput 
          v-model="state.email"
          type="email" 
          placeholder="you@example.com" 
          icon="i-heroicons-envelope" 
          size="xl"
          class="h-12 w-full text-base"
          variant="outline"
          :ui="{ icon: { base: 'text-slate-400 dark:text-slate-400' } }"
        />
      </UFormField>

      <UFormField label="Password" name="password" :ui="{ label: { base: 'text-sm font-medium text-slate-300 block mb-1' } }">
        <UInput 
          v-model="state.password"
          type="password" 
          placeholder="••••••••" 
          icon="i-heroicons-lock-closed"
          size="xl"
          class="h-12 w-full text-base"
          variant="outline"
          :ui="{ icon: { base: 'text-slate-400 dark:text-slate-400' } }"
        />
      </UFormField>

      <UFormField label="Confirm Password" name="confirmPassword" :ui="{ label: { base: 'text-sm font-medium text-slate-300 block mb-1' } }">
        <UInput 
          v-model="state.confirmPassword"
          type="password" 
          placeholder="••••••••" 
          icon="i-heroicons-lock-closed"
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
        class="mt-8 h-12 rounded-full text-base font-semibold shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 border-0 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white"
      >
        Sign Up
      </UButton>
    </UForm>

    <div class="mt-8 pt-6 border-t border-white/5 text-center text-sm text-slate-400">
      Already have an account? 
      <NuxtLink to="/login" class="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
        Log in instead
      </NuxtLink>
    </div>
  </div>
</template>