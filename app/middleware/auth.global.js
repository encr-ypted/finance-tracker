export default defineNuxtRouteMiddleware(async (to) => {
    const user = useSupabaseUser();
    const supabase = useSupabaseClient();

    if (import.meta.client && !user.value) {
        await supabase.auth.getSession();
        // Awaiting this forces the Supabase module to update `user.value`
        // if a valid session actually exists in the browser.
    }

    // 2. FORGIVING PATH MATCHING
    // Safely removes trailing slashes (e.g., converts "/login/" to "/login")
    const currentPath = to.path.replace(/\/$/, '') || '/';

    const publicRoutes =  ["/login", "/register", "/confirm", "/forgot-password", "/reset-password"];
    const isPublicRoute = publicRoutes.includes(currentPath);

    if (!user.value && !isPublicRoute){
        return navigateTo("/login");
    }

    if (user.value && isPublicRoute){
        return navigateTo("/")
    }
});