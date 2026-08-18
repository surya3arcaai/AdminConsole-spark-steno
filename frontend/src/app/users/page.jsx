import { fetchApi } from "@/lib/api";
import UserManager from "@/components/UserManager";

export default async function UsersPage() {
    const usersRes = await fetchApi(8005, "/?page_size=100") || { items: [], total: 0 };
    const users = Array.isArray(usersRes) ? usersRes : (usersRes?.items || []);

    const demographicsRes = await fetchApi(8005, "/demographics/") || {
        departments: [],
        locations: [],
        specializations: []
    };

    const clinicalRes = await fetchApi(8003, "/clinical/") || [];
    const dischargeRes = await fetchApi(8003, "/discharge/") || [];
    const templates = {
        clinical: clinicalRes.items || clinicalRes || [],
        discharge: dischargeRes.items || dischargeRes || []
    };

    return (
        <div className="container-main">
            <UserManager initialUsers={users} demographics={demographicsRes} templates={templates} />
        </div>
    );
}
