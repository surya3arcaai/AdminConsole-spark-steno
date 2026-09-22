"use client";
import React, { useState } from "react";
import { Plus, X, Edit2, Trash2, Key, Shield, AlertCircle, CheckSquare, Square, Save, ArrowLeft, Check, Layers } from "lucide-react";
import { createRoleAction, updateRoleAction, deleteRoleAction, updateRolePermissionsAction, initializeSystemRolesAction } from "@/app/actions/role_actions";

export default function RoleManager({ initialRoles = [], allPermissions = [] }) {
    const activeRoles = (initialRoles || []).filter(r => (r.name || "").toLowerCase() !== "doctor");
    const defaultForm = { id: null, name: "", description: "" };
    const [form, setForm] = useState(defaultForm);
    const [showEditor, setShowEditor] = useState(false);

    // Permission Matrix Editor State
    const [selectedRole, setSelectedRole] = useState(null);
    const [selectedPermIds, setSelectedPermIds] = useState(new Set());
    const [savingPerms, setSavingPerms] = useState(false);
    const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

    const openCreator = () => {
        setForm(defaultForm);
        setShowEditor(true);
        setSelectedRole(null);
    };

    const openEditor = (role) => {
        if (role.is_system) {
            alert(`The '${role.name}' role is an immutable system role. You can only manage its permissions, not its properties.`);
            return;
        }
        setForm({ id: role.id, name: role.name, description: role.description || "" });
        setShowEditor(true);
        setSelectedRole(null);
    };

    const openPermissionMatrix = (role) => {
        setSelectedRole(role);
        const existingIds = (role.permissions || []).map(p => p.id);
        setSelectedPermIds(new Set(existingIds));
        setSaveSuccessMsg("");
        setShowEditor(false);
    };

    const closePermissionMatrix = () => {
        setSelectedRole(null);
        setSelectedPermIds(new Set());
        setSaveSuccessMsg("");
    };

    const togglePermission = (permId) => {
        setSelectedPermIds(prev => {
            const next = new Set(prev);
            if (next.has(permId)) {
                next.delete(permId);
            } else {
                next.add(permId);
            }
            return next;
        });
    };

    const toggleModuleAll = (modulePerms, shouldSelect) => {
        setSelectedPermIds(prev => {
            const next = new Set(prev);
            modulePerms.forEach(p => {
                if (shouldSelect) {
                    next.add(p.id);
                } else {
                    next.delete(p.id);
                }
            });
            return next;
        });
    };

    const handleSavePermissions = async () => {
        if (!selectedRole) return;
        setSavingPerms(true);
        setSaveSuccessMsg("");
        try {
            const permIdsArray = Array.from(selectedPermIds);
            await updateRolePermissionsAction(selectedRole.id, permIdsArray);
            
            // Update local role reference
            selectedRole.permissions = allPermissions.filter(p => selectedPermIds.has(p.id));
            
            setSaveSuccessMsg(`Permissions for '${selectedRole.name}' updated successfully!`);
            setTimeout(() => setSaveSuccessMsg(""), 3500);
        } catch (err) {
            alert("Failed to save permissions: " + (err.message || err));
        } finally {
            setSavingPerms(false);
        }
    };

    const handleSave = async () => {
        if (!form.name.trim()) return alert("Role name is required");

        const payload = {
            name: form.name.trim().toLowerCase(),
            description: form.description.trim(),
            permission_ids: []
        };

        if (form.id) {
            await updateRoleAction(form.id, payload);
        } else {
            await createRoleAction(payload);
        }

        setShowEditor(false);
    };

    const handleDelete = async (role) => {
        if (role.is_system) return alert("System roles cannot be deleted!");
        if (confirm(`Are you sure you want to delete the ${role.name} role?`)) {
            await deleteRoleAction(role.id);
        }
    };

    const handleInitialize = async () => {
        await initializeSystemRolesAction();
    };

    // Group permissions by Module
    const permissionsByModule = allPermissions.reduce((acc, perm) => {
        const mod = perm.module || "General";
        if (!acc[mod]) acc[mod] = [];
        acc[mod].push(perm);
        return acc;
    }, {});

    return (
        <>
            <style>{`
                .clickable-row:hover { background: rgba(102, 252, 241, 0.05); }
                .hover-underline:hover { text-decoration: underline; }
                .perm-card {
                    background: rgba(255, 255, 255, 0.03);
                    border: 1px solid var(--panel-border);
                    border-radius: 8px;
                    padding: 0.9rem 1.1rem;
                    transition: all 0.2s ease;
                    cursor: pointer;
                    display: flex;
                    align-items: flex-start;
                    gap: 0.75rem;
                }
                .perm-card:hover {
                    background: rgba(102, 252, 241, 0.06);
                    border-color: rgba(102, 252, 241, 0.3);
                }
                .perm-card.active {
                    background: rgba(102, 252, 241, 0.1);
                    border-color: var(--primary-color);
                }
            `}</style>
            
            <header className="dashboard-header fade-in">
                <div>
                    <h1>RBAC & Access Control</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage functional roles, security policies, and permissions matrix</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {activeRoles.length === 0 && (
                        <button className="btn-secondary" onClick={handleInitialize} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                            <AlertCircle size={18} /> First Setup: Init System Roles
                        </button>
                    )}
                    {!selectedRole && (
                        <button className="btn-primary" onClick={openCreator} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                            <Plus size={18} /> Add Custom Role
                        </button>
                    )}
                </div>
            </header>

            {/* View 1: Role Permissions Matrix Policy Editor */}
            {selectedRole ? (
                <div className="glass-panel slide-up" style={{ animationDelay: "0.1s", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--panel-border)", paddingBottom: "1rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <button onClick={closePermissionMatrix} className="btn-secondary" style={{ padding: "0.4rem 0.8rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                <ArrowLeft size={16} /> Back to Roles
                            </button>
                            <div>
                                <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.6rem", textTransform: "capitalize" }}>
                                    <Shield size={22} color="var(--primary-color)" />
                                    {selectedRole.name} Policies & Permissions
                                </h2>
                                <p style={{ margin: "0.2rem 0 0 0", color: "var(--text-secondary)", fontSize: "0.88rem" }}>
                                    {selectedRole.description || "System functional role"} • Granted: <strong style={{ color: "var(--primary-color)" }}>{selectedPermIds.size}</strong> of {allPermissions.length} permissions
                                </p>
                            </div>
                        </div>

                        <div style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
                            <button
                                className="btn-primary"
                                onClick={handleSavePermissions}
                                disabled={savingPerms}
                                style={{ display: "flex", gap: "0.5rem", alignItems: "center", padding: "0.6rem 1.2rem" }}
                            >
                                <Save size={18} /> {savingPerms ? "Saving..." : "Save Policies"}
                            </button>
                        </div>
                    </div>

                    {saveSuccessMsg && (
                        <div style={{ padding: "0.8rem 1rem", background: "rgba(102, 252, 241, 0.15)", border: "1px solid var(--primary-color)", borderRadius: "8px", color: "var(--primary-color)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <Check size={18} /> {saveSuccessMsg}
                        </div>
                    )}

                    {/* Permissions Grouped by Module */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        {Object.entries(permissionsByModule).map(([moduleName, modulePerms]) => {
                            const allChecked = modulePerms.every(p => selectedPermIds.has(p.id));
                            const someChecked = modulePerms.some(p => selectedPermIds.has(p.id));

                            return (
                                <div key={moduleName} style={{ background: "rgba(0,0,0,0.15)", borderRadius: "10px", padding: "1.2rem", border: "1px solid var(--panel-border)" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                                            <Layers size={18} color="var(--primary-color)" />
                                            <h3 style={{ margin: 0, fontSize: "1.05rem", textTransform: "capitalize" }}>{moduleName} Module</h3>
                                            <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", background: "rgba(255,255,255,0.06)", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                                                {modulePerms.filter(p => selectedPermIds.has(p.id)).length}/{modulePerms.length} Active
                                            </span>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => toggleModuleAll(modulePerms, !allChecked)}
                                            style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", fontSize: "0.85rem", textDecoration: "underline" }}
                                        >
                                            {allChecked ? "Deselect All" : "Select All"}
                                        </button>
                                    </div>

                                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "0.8rem" }}>
                                        {modulePerms.map(perm => {
                                            const isChecked = selectedPermIds.has(perm.id);
                                            return (
                                                <div
                                                    key={perm.id}
                                                    onClick={() => togglePermission(perm.id)}
                                                    className={`perm-card ${isChecked ? "active" : ""}`}
                                                >
                                                    <div style={{ marginTop: "2px", color: isChecked ? "var(--primary-color)" : "var(--text-secondary)" }}>
                                                        {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.2rem" }}>
                                                            <strong style={{ fontSize: "0.92rem", color: isChecked ? "var(--text-primary)" : "var(--text-secondary)" }}>
                                                                {perm.name}
                                                            </strong>
                                                            <code style={{ fontSize: "0.72rem", background: "rgba(0,0,0,0.3)", padding: "0.1rem 0.4rem", borderRadius: "4px", color: "var(--primary-color)" }}>
                                                                {perm.module.toLowerCase()}:{perm.action}
                                                            </code>
                                                        </div>
                                                        <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.35 }}>
                                                            {perm.description || "No description provided."}
                                                        </p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : showEditor ? (
                /* View 2: Custom Role Details Editor */
                <div className="glass-panel slide-up" style={{ animationDelay: "0.1s", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <Key size={20} color="var(--primary-color)" />
                            {form.id ? "Edit Custom Role" : "Create New Custom Role"}
                        </h3>
                        <button onClick={() => setShowEditor(false)} style={{ color: "var(--text-secondary)", background: "none", cursor: "pointer", border: "none" }}>
                            <X size={24} />
                        </button>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                        <div>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Role Name (System Identifier) *</label>
                            <input className="input-field" placeholder="e.g. data_analyst" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            <small style={{ color: "var(--text-secondary)", marginTop: "0.3rem", display: "block" }}>Lowercase alphanumerics without spaces is recommended.</small>
                        </div>
                        <div>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Role Description</label>
                            <textarea className="input-field" rows={3} placeholder="Describe the purpose and access scope of this role..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                        <button className="btn-secondary" onClick={() => setShowEditor(false)} style={{ flex: 1 }}>Cancel</button>
                        <button className="btn-primary" onClick={handleSave} style={{ flex: 1 }}>{form.id ? "Update Role" : "Save Role"}</button>
                    </div>
                </div>
            ) : (
                /* View 3: Roles Overview Table */
                <section className="slide-up glass-panel" style={{ animationDelay: '0.2s', padding: 0, overflow: 'hidden' }}>
                    {activeRoles.length === 0 ? (
                        <div style={{ padding: "4rem 2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                            <Shield size={48} color="rgba(102, 252, 241, 0.4)" style={{ margin: "0 auto 1rem" }} />
                            <h3 style={{ color: "var(--text-primary)", margin: "0 0 0.5rem 0" }}>No Roles Currently Found</h3>
                            <p>We need to seed the database with core administrative and operational system roles minimum. <br/>Use the initialization button above.</p>
                        </div>
                    ) : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.2)' }}>
                                    <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Role Name</th>
                                    <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Description</th>
                                    <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Assigned Policies</th>
                                    <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>Type</th>
                                    <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeRoles.map((r, i) => (
                                    <tr key={r.id || i} className="clickable-row" style={{ borderBottom: '1px solid var(--panel-border)', transition: "background 0.2s ease" }}>
                                        <td style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{r.name}</td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{r.description || 'System Definition Component'}</td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            <span style={{ padding: "0.25rem 0.6rem", background: "rgba(102, 252, 241, 0.1)", color: "var(--primary-color)", borderRadius: "6px", fontSize: "0.82rem", fontWeight: 600 }}>
                                                {(r.permissions || []).length} Permissions
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            {r.is_system ? (
                                                <span style={{ padding: "0.25rem 0.5rem", background: "rgba(102, 252, 241, 0.15)", color: "var(--primary-color)", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600 }}>SYSTEM</span>
                                            ) : (
                                                <span style={{ padding: "0.25rem 0.5rem", background: "rgba(255, 255, 255, 0.05)", color: "var(--text-secondary)", borderRadius: "6px", fontSize: "0.8rem" }}>CUSTOM</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                                                <button
                                                    onClick={() => openPermissionMatrix(r)}
                                                    style={{ color: 'var(--primary-color)', background: 'rgba(102, 252, 241, 0.1)', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(102, 252, 241, 0.3)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 500 }}
                                                >
                                                    <Key size={14} /> Edit Permissions
                                                </button>

                                                {!r.is_system && (
                                                    <>
                                                        <button onClick={() => openEditor(r)} style={{ color: "var(--primary-color)", background: "none", cursor: "pointer", padding: "0.5rem", borderRadius: "8px", border: "1px solid rgba(102, 252, 241, 0.2)", display: "flex", alignItems: "center" }}>
                                                            <Edit2 size={16} />
                                                        </button>
                                                        <button onClick={() => handleDelete(r)} style={{ color: "var(--error)", background: "rgba(255, 82, 82, 0.1)", cursor: "pointer", padding: "0.5rem", borderRadius: "8px", border: "none", display: "flex", alignItems: "center" }}>
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
            )}
        </>
    );
}

