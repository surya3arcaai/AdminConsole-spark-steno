"use server";
import { fetchApi } from "@/lib/api";
import { revalidatePath } from "next/cache";

const PORT = 8005;

export async function createUserAction(data) {
    const hospId = data.hospital_id || data.location_id || null;
    const res = await fetchApi(PORT, '/registerUser', {
        method: 'POST',
        body: JSON.stringify({
            name: data.name,
            email: data.email,
            phone: data.phone || '',
            password: data.password || '',
            department_id: data.department_id || null,
            hospital_id: hospId,
            location_id: hospId,
            specialization_id: data.specialization_id || null
        })
    }) || await fetchApi(PORT, '/', {
        method: 'POST',
        body: JSON.stringify(data)
    });

    revalidatePath('/users');
    return res;
}

export async function updateUserAction(id, data) {
    const res = await fetchApi(PORT, `/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    revalidatePath('/users');
    return res;
}

export async function deleteUserAction(id) {
    const res = await fetchApi(PORT, `/${id}`, {
        method: 'DELETE'
    });
    revalidatePath('/users');
    return res;
}

export async function generateEidAction() {
    return await fetchApi(PORT, '/eid/generate', {
        method: 'POST'
    });
}

export async function assignEidAction(id, eid) {
    const params = eid ? `?eid=${encodeURIComponent(eid)}` : '';
    const res = await fetchApi(PORT, `/${id}/eid${params}`, {
        method: 'PUT'
    });
    revalidatePath('/users');
    return res;
}

export async function getRegistrationAction(id) {
    return await fetchApi(PORT, `/${id}/registration`);
}

export async function setRegistrationAction(id, data, isUpdate = false) {
    const res = await fetchApi(PORT, `/${id}/registration`, {
        method: isUpdate ? 'PUT' : 'POST',
        body: JSON.stringify(data)
    });
    revalidatePath('/users');
    return res;
}

export async function getSupervisorAction(id) {
    return await fetchApi(PORT, `/${id}/supervisor`);
}

export async function assignSupervisorAction(id, supervisor_id, isUpdate = false) {
    const res = await fetchApi(PORT, `/${id}/supervisor`, {
        method: isUpdate ? 'PUT' : 'POST',
        body: JSON.stringify({ supervisor_id })
    });
    revalidatePath('/users');
    return res;
}

export async function removeSupervisorAction(id) {
    const res = await fetchApi(PORT, `/${id}/supervisor`, {
        method: 'DELETE'
    });
    revalidatePath('/users');
    return res;
}

export async function createDepartmentAction(data) {
    const res = await fetchApi(PORT, '/demographics/departments', {
        method: 'POST',
        body: JSON.stringify(data)
    });
    revalidatePath('/users');
    return res;
}

export async function createHospitalAction(data) {
    const res = await fetchApi(PORT, '/demographics/hospitals', {
        method: 'POST',
        body: JSON.stringify(data)
    });
    revalidatePath('/users');
    return res;
}

export const createLocationAction = createHospitalAction;

export async function createSpecializationAction(data) {
    const res = await fetchApi(PORT, '/demographics/specializations', {
        method: 'POST',
        body: JSON.stringify(data)
    });
    revalidatePath('/users');
    return res;
}

export async function updateDemographicsAction(id, data) {
    const res = await fetchApi(PORT, `/${id}/demographics`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    revalidatePath('/users');
    return res;
}
