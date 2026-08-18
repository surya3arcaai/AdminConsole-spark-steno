import { fetchApi } from "@/lib/api";
import RoleManager from "@/components/RoleManager";

export default async function RBACPage() {
    const rolesRes = await fetchApi(8001, "/roles/") || { items: [], total: 0 };
    // fetchApi for PaginatedResponse returns an object with items array
    const roles = Array.isArray(rolesRes) ? rolesRes : (rolesRes?.items || []);

    return <RoleManager initialRoles={roles} />;
}

