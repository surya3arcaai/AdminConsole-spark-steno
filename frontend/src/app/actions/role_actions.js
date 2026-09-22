"use server";
import { fetchApi } from "@/lib/api";
import { revalidatePath } from "next/cache";

const PORT = 8001; // rbac-service

export async function fetchRolesAction() {
    const res = await fetchApi(PORT, '/roles');
    return res?.items || [];
}

export async function getUserRolesAction(userId) {
    const res = await fetchApi(PORT, `/users/${userId}/roles`);
    return res?.roles || [];
}

export async function assignRoleAction(userId, roleName) {
    // roleName can be 'user', 'admin', or 'supervisor'
    const targetRole = (roleName || '').toLowerCase();
    const cleanRole = targetRole === 'doctor' ? 'user' : targetRole;
    
    const res = await fetchApi(PORT, `/users/${userId}/roles/${cleanRole}`, {
        method: 'POST'
    });
    revalidatePath('/users');
    return res;
}

export async function revokeRoleAction(userId, roleName) {
    const res = await fetchApi(PORT, `/users/${userId}/roles/${roleName}`, {
        method: 'DELETE'
    });
    revalidatePath('/users');
    return res;
}

export async function createRoleAction(data) {
    const res = await fetchApi(PORT, '/roles', {
        method: 'POST',
        body: JSON.stringify(data)
    });
    revalidatePath('/rbac');
    return res;
}

export async function updateRoleAction(id, data) {
    const res = await fetchApi(PORT, `/roles/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    revalidatePath('/rbac');
    return res;
}

export async function deleteRoleAction(id) {
    const res = await fetchApi(PORT, `/roles/${id}`, {
        method: 'DELETE'
    });
    revalidatePath('/rbac');
    return res;
}

export async function fetchPermissionsAction() {
    const res = await fetchApi(PORT, '/permissions?page_size=100');
    return res?.items || [];
}

export async function updateRolePermissionsAction(roleId, permissionIds) {
    const res = await fetchApi(PORT, `/roles/${roleId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permission_ids: permissionIds })
    });
    revalidatePath('/rbac');
    return res;
}

export async function initializeSystemRolesAction() {
    await fetchApi(PORT, `/roles/admin`, { method: 'POST', body: JSON.stringify({ description: "System Administrator" }) });
    await fetchApi(PORT, `/roles/user`, { method: 'POST', body: JSON.stringify({ description: "Standard Clinical Practitioner" }) });
    await fetchApi(PORT, `/roles/supervisor`, { method: 'POST', body: JSON.stringify({ description: "Department Supervisor" }) });
    revalidatePath('/rbac');
}
