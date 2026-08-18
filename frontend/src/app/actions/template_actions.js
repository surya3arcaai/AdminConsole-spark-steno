"use server";
import { fetchApi } from "@/lib/api";
import { revalidatePath } from "next/cache";

// Type is either 'clinical' or 'discharge'

export async function createTemplateAction(type, data) {
    const endpoint = type === 'clinical' ? '/clinical/' : '/discharge/';
    const res = await fetchApi(8003, endpoint, {
        method: 'POST',
        body: JSON.stringify(data)
    });
    revalidatePath('/templates');
    return res;
}

export async function previewTemplateAction(type, id, variables) {
    const endpoint = type === 'clinical' ? `/clinical/${id}/preview` : `/discharge/${id}/preview`;
    return await fetchApi(8003, endpoint, {
        method: 'POST',
        body: JSON.stringify({ variables })
    });
}

export async function updateTemplateAction(type, id, data) {
    const endpoint = type === 'clinical' ? `/clinical/${id}` : `/discharge/${id}`;
    const res = await fetchApi(8003, endpoint, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
    revalidatePath('/templates');
    return res;
}

export async function duplicateTemplateAction(type, id, newName) {
    // Use URLSearchParams or directly inject into query
    const endpoint = type === 'clinical' ? `/clinical/${id}/duplicate?name=${encodeURIComponent(newName)}` : `/discharge/${id}/duplicate?name=${encodeURIComponent(newName)}`;
    const res = await fetchApi(8003, endpoint, { method: 'POST' });
    revalidatePath('/templates');
    return res;
}

export async function deleteTemplateAction(type, id) {
    const endpoint = type === 'clinical' ? `/clinical/${id}` : `/discharge/${id}`;
    // We mock the failure gracefully since our fetchApi returns null on failure 
    // and Delete might return 204 no content which might break .json() parsing in api.js.
    // We'll update api.js to handle 204.
    const res = await fetchApi(8003, endpoint, { method: 'DELETE' });
    revalidatePath('/templates');
    return res;
}
