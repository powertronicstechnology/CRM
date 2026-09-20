export const APP_ROLES = [
    { id: 'staff', label: 'Staff', user_type: 'staff', role: 'Staff' },
    // Paused for the small-team rollout; restore with matching database permissions.
    // { id: 'accounts', label: 'Accounts', user_type: 'accounts', role: 'Accounts' },
    // { id: 'manager', label: 'Manager', user_type: 'manager', role: 'Manager' },
    { id: 'admin', label: 'Admin', user_type: 'admin', role: 'Admin' },
];

export function permissionsFor(userType) {
    return {
        crm: ['staff', 'admin'].includes(userType),
        finance: ['staff', 'admin'].includes(userType),
        admin: userType === 'admin',
    };
}

export function canEnterPortal(profile) {
    return profile?.status === 'active' && APP_ROLES.some(r => r.id === profile.user_type);
}
