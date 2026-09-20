// Query routing keeps Supabase's token fragment free and works on GitHub Pages.
export function isPasswordRecovery(location) {
    return new URLSearchParams(location.search).get('reset_password') === '1'
        || new URLSearchParams(location.hash.replace(/^#/, '')).get('type') === 'recovery'
        || /^#\/(?:set|reset)-password(?:$|[?])/.test(location.hash);
}
export function passwordResetUrl() {
    return new URL(`${import.meta.env.BASE_URL}?reset_password=1`, window.location.origin).href;
}
