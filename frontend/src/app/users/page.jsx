import { fetchApi } from "@/lib/api";
import UserManager from "@/components/UserManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
    const [usersRes, demographicsRes] = await Promise.all([
        fetchApi(8005, "/?page_size=100"),
        fetchApi(8005, "/demographics/")
    ]);
    const rawUsers = Array.isArray(usersRes) ? usersRes : (usersRes?.items || []);

    // Fetch roles and supervisors for each user
    const users = await Promise.all(
        rawUsers.map(async (u) => {
            try {
                const [rRes, sRes] = await Promise.all([
                    fetchApi(8001, `/users/${u.id}/roles`),
                    fetchApi(8005, `/${u.id}/supervisor`).catch(() => null)
                ]);
                const roles = (rRes?.roles || []).map(r => (r.name || "").toLowerCase());
                return {
                    ...u,
                    roles,
                    is_supervisor: roles.includes("supervisor"),
                    supervisor_id: sRes?.supervisor_id || u.supervisor_id || null,
                    supervisor_name: sRes?.supervisor_name || null
                };
            } catch (e) {
                return { ...u, roles: [], is_supervisor: false, supervisor_id: u.supervisor_id || null, supervisor_name: null };
            }
        })
    );

    const safeDemographics = demographicsRes || {
        departments: [],
        locations: [],
        specializations: [],
        hospitals: []
    };

    return (
        <div className="container-main">
            <UserManager initialUsers={users} demographics={safeDemographics} />
        </div>
    );
}
