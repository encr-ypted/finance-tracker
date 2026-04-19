export default defineNuxtRouteMiddleware(async (to) => {
    const user = useSupabaseUser();

    // Clean the path
    const currentPath = to.path.replace(/\/$/, '') || '/';
    const publicRoutes = ["/login", "/register", "/confirm", "/forgot-password", "/reset-password"];
    const isPublicRoute = publicRoutes.includes(currentPath);

    // Standard routing logic without async/await blocking the browser
    if (!user.value && !isPublicRoute) {
        return navigateTo("/login");
    }

    if (user.value && isPublicRoute) {
        return navigateTo("/");
    }
});