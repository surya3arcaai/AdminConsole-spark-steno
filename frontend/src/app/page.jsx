import { fetchApi } from "@/lib/api";
import { Users, FileText, Server, Activity } from "lucide-react";

export default async function Home() {
    // Fetch Users
    const usersRes = await fetchApi(8005, "/?page_size=5") || { items: [], total: 0 };
    const users = Array.isArray(usersRes) ? usersRes : (usersRes?.items || []);
    const totalUsers = usersRes?.total || users.length;

    // Fetch Templates
    const clinicalRes = await fetchApi(8003, "/clinical/") || [];
    const dischargeRes = await fetchApi(8003, "/discharge/") || [];
    const cLen = clinicalRes.items ? clinicalRes.total : (clinicalRes.length || 0);
    const dLen = dischargeRes.items ? dischargeRes.total : (dischargeRes.length || 0);
    const totalTemplates = cLen + dLen;

    // Fetch Roles (from RBAC)
    const rolesRes = await fetchApi(8001, "/?page_size=1") || { total: 0 };
    const totalRoles = rolesRes.total || (rolesRes.items || []).length;

    // Fetch Service Statuses directly via /health or /docs
    const servicesInfo = [
        { name: 'RBAC Service', port: 8001 },
        { name: 'Template Service', port: 8003 },
        { name: 'Logs Service', port: 8004 },
        { name: 'User Service', port: 8005 }
    ];

    const serviceStatuses = await Promise.all(
        servicesInfo.map(async (svc) => {
            try {
                // Fetch FastAPI swagger docs to securely check if it's responsive
                const res = await fetch(`http://127.0.0.1:${svc.port}/docs`, { 
                    signal: AbortSignal.timeout(2000),
                    cache: 'no-store'
                });
                return { name: svc.name, status: res.ok ? 'Online' : 'Offline' };
            } catch (e) {
                return { name: svc.name, status: 'Offline' };
            }
        })
    );

    const activeServices = serviceStatuses.filter(s => s.status === 'Online').length;
    const isSystemHealthy = activeServices === servicesInfo.length;

    return (
        <div className="fade-in">
            <header className="dashboard-header">
                <div>
                    <h1>System Dashboard</h1>
                    <p style={{ color: "var(--text-secondary)" }}>Arca Spark Admin Control Center</p>
                </div>
                <div className="glass-panel" style={{ padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', height: 'fit-content' }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: isSystemHealthy ? 'var(--success)' : 'var(--error)', boxShadow: isSystemHealthy ? '0 0 10px var(--success)' : '0 0 10px var(--error)' }}></div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{isSystemHealthy ? 'System Healthy' : 'System Degraded'}</span>
                </div>
            </header>

            <div className="metrics-grid slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="glass-panel metric-card">
                    <Users size={20} color="var(--primary-color)" />
                    <span className="metric-value">{totalUsers}</span>
                    <span className="metric-label">Active Users</span>
                </div>
                <div className="glass-panel metric-card">
                    <FileText size={20} color="var(--primary-color)" />
                    <span className="metric-value">{totalTemplates}</span>
                    <span className="metric-label">Total Templates</span>
                </div>
                <div className="glass-panel metric-card">
                    <Server size={20} color="var(--primary-color)" />
                    <span className="metric-value">{activeServices}/{servicesInfo.length}</span>
                    <span className="metric-label">Microservices Online</span>
                </div>
                <div className="glass-panel metric-card">
                    <Activity size={20} color="var(--primary-color)" />
                    <span className="metric-value">{totalRoles}</span>
                    <span className="metric-label">Total RBAC Roles</span>
                </div>
            </div>

            <div className="grid-2 slide-up" style={{ animationDelay: '0.4s' }}>
                <div className="glass-panel">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Users size={20} /> Recent Users
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {users.map((user, i) => (
                            <div key={user.id || i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)' }}>
                                <span>{user.name}</span>
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{user.email}</span>
                            </div>
                        ))}
                        {users.length === 0 && (
                            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No users found.</p>
                        )}
                    </div>
                </div>
                <div className="glass-panel">
                    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Activity size={20} /> System Status
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {serviceStatuses.map(svc => (
                            <div key={svc.name}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                                    <span>{svc.name}</span>
                                    <span style={{ color: svc.status === 'Online' ? 'var(--success)' : 'var(--error)' }}>{svc.status}</span>
                                </div>
                                <div style={{ height: 4, background: 'rgba(255,255,255,0.1)', borderRadius: 2, overflow: 'hidden' }}>
                                    <div style={{ width: svc.status === 'Online' ? '100%' : '0%', height: '100%', background: svc.status === 'Online' ? 'var(--primary-color)' : 'var(--error)', transition: 'width 0.5s ease' }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
