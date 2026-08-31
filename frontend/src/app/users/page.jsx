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

    const clinicalList = Array.isArray(clinicalRes) ? clinicalRes : (clinicalRes?.items || []);
    const dischargeList = Array.isArray(dischargeRes) ? dischargeRes : (dischargeRes?.items || []);

    const templates = {
        clinical: clinicalList,
        discharge: dischargeList
    };

    return (
        <div className="container-main">
            <UserManager initialUsers={users} demographics={demographicsRes} templates={templates} />
        </div>
    );
}
