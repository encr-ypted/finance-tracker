export default defineNuxtRouteMiddleware(async (to) => {
    const user = useSupabaseUser();

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

    if (!user.value && !isPublicRoute) {
        return navigateTo("/login");
    }

    if (user.value && shouldRedirectAuth) {
        return navigateTo("/");
    }
});