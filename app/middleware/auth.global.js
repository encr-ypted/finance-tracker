export default defineNuxtRouteMiddleware(async (to) => {
    const supabase = useSupabaseClient();

    const { data } = await supabase.auth.getSession();
    const session = data.session;

    const currentPath = to.path.replace(/\/$/, '') || '/';
    const publicRoutes =  ["/login", "/register", "/confirm", "/forgot-password", "/reset-password"];
    const isPublicRoute = publicRoutes.includes(currentPath);

    if (!session && !isPublicRoute){
        return navigateTo("/login");
    }

    if (session && isPublicRoute){
        return navigateTo("/")
    }
});