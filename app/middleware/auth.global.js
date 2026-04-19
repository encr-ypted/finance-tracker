export default defineNuxtRouteMiddleware(async (to) => {
    const supabase = useSupabaseClient();

    // Must check the session directly — useSupabaseUser() is populated by
    // an async onAuthStateChange listener in the Supabase plugin, which fires
    // AFTER middleware has already run. getSession() awaits the client's
    // internal initialization, so it reliably returns the stored session.
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user ?? null;

    const currentPath = to.path.replace(/\/$/, '') || '/';

    // Routes accessible without authentication
    const publicRoutes = ["/login", "/register", "/confirm", "/forgot-password", "/reset-password"];
    const isPublicRoute = publicRoutes.includes(currentPath);

    // Routes that authenticated users should be redirected away from
    // Note: /confirm and /reset-password are NOT here — users arrive at those
    // pages via email links that include auth tokens, so they're already
    // authenticated by the time the middleware runs.
    const authRedirectRoutes = ["/login", "/register", "/forgot-password"];
    const shouldRedirectAuth = authRedirectRoutes.includes(currentPath);

    if (!user && !isPublicRoute) {
        return navigateTo("/login");
    }

    if (user && shouldRedirectAuth) {
        return navigateTo("/finance");
    }
});