import { fetchApi } from "@/lib/api";
import RoleManager from "@/components/RoleManager";

export default async function RBACPage() {
    const rolesRes = await fetchApi(8001, "/roles/") || { items: [], total: 0 };
    const permsRes = await fetchApi(8001, "/permissions?page_size=100") || { items: [], total: 0 };

    const rawRoles = Array.isArray(rolesRes) ? rolesRes : (rolesRes?.items || []);
    // Exclude any obsolete 'doctor' role (system canonical role is 'User')
    const roles = rawRoles.filter(r => (r.name || "").toLowerCase() !== "doctor");
    const permissions = Array.isArray(permsRes) ? permsRes : (permsRes?.items || []);

    return <RoleManager initialRoles={roles} allPermissions={permissions} />;
}

