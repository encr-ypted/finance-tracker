export default defineNuxtRouteMiddleware(async (to) => {
    const user = useSupabaseUser();

    const publicRoutes =  ["/login", "/register", "/confirm"];
    const isPublicRoute = publicRoutes.includes(to.path);

    if (!user.value && !isPublicRoute){
        return navigateTo("/login");
    }

    if (user.value && isPublicRoute){
        return navigateTo("/")
    }
});