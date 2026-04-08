import { ref, computed } from "vue";

const categories = ref([]);
const loading = ref(false);


export const useCategories = () => {
  const supabase = useSupabaseClient();
  const user = useSupabaseUser();

  const incomeCategories = computed(() =>
    categories.value.filter(c => c.type === 'income')
  );
  const expenseCategories = computed(() =>
    categories.value.filter(c => c.type === 'expense')
  );

  const fetchCategories = async () => {
    if (!user.value?.sub) return;
    loading.value = true;

    const { data, error } = await supabase.from("categories").select("*").eq("user_id", user.value.sub).order("name");
    if (!error && data) {
      categories.value = data;
    }
    loading.value = false;
  };


  const addCategory = async (categoryObj) => {
    if (!user.value?.sub) return;

    const { data, error } = await supabase.from('categories').insert({
      ...categoryObj,
      user_id: user.value.sub
    }).select().single();

    if (!error && data) {
      categories.value.push(data);
    }
  };

  const updateCategory = async (categoryId, updates) => {
    if (!user.value?.sub) return;

    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', categoryId)
      .eq('user_id', user.value.sub)
      .select()
      .single();

    if (!error && data) {
      const idx = categories.value.findIndex(c => c.id === categoryId);
      if (idx !== -1) {
        categories.value[idx] = data;
      }
    }
  };

  const deleteCategory = async (categoryId) => {
    if (!user.value?.sub) return;

    const { error } = await supabase.from('categories')
      .delete()
      .eq("id", categoryId)
      .eq("user_id", user.value.sub);

    if (!error) {
      categories.value = categories.value.filter(c => c.id !== categoryId);
    }
  };

  return {
    categories,
    incomeCategories,
    expenseCategories,
    loading,
    fetchCategories,
    addCategory,
    updateCategory,
    deleteCategory,
  };
}
