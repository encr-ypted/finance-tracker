<script setup>
import { watch } from 'vue'

// We still have the composables you saved!
const { transactions, fetchTransactions, loading } = useTransactions();
const { categories, fetchCategories } = useCategories();

const user = useSupabaseUser();

// Reactively fetch data only after the user object is definitively fully hydrated from Supabase.
// This prevents the fetch calls from aborting early when they attempt to read user.value.id.
watch(user, (currentUser) => {
  if (currentUser) {
    fetchCategories();
    fetchTransactions();
  }
}, { immediate: true });
</script>

<template>
  <div>
   {{transactions}}
    {{categories}}
  </div>
</template>
