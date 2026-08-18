"use client";
import React, { useState } from "react";
import { Plus, X, Edit2, Trash2, Key, Shield, AlertCircle } from "lucide-react";
import ActionButton from "./ActionButton";
import { createRoleAction, updateRoleAction, deleteRoleAction, initializeSystemRolesAction } from "@/app/actions/role_actions";

export default function RoleManager({ initialRoles = [] }) {
    const defaultForm = { id: null, name: "", description: "" };
    const [form, setForm] = useState(defaultForm);
    const [showEditor, setShowEditor] = useState(false);

    const openCreator = () => {
        setForm(defaultForm);
        setShowEditor(true);
    };

    const openEditor = (role) => {
        if (role.is_system) {
            alert(`The '${role.name}' role is an immutable system role. You can only manage its permissions, not its properties.`);
            return;
        }
        setForm({ id: role.id, name: role.name, description: role.description || "" });
        setShowEditor(true);
    };

    const handleSave = async () => {
        if (!form.name.trim()) return alert("Role name is required");

        const payload = {
            name: form.name.trim().toLowerCase(),
            description: form.description.trim(),
            permission_ids: [] // We map these via the Action editor later
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

    return (
        <>
            <style>{`
                .clickable-row:hover { background: rgba(102, 252, 241, 0.05); }
                .hover-underline:hover { text-decoration: underline; }
            `}</style>
            
            <header className="dashboard-header fade-in">
                <div>
                    <h1>RBAC & Access Control</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage functional roles, permissions, and security matrices</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {initialRoles.length === 0 && (
                        <button className="btn-secondary" onClick={handleInitialize} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                            <AlertCircle size={18} /> First Setup: Init System Roles
                        </button>
                    )}
                    <button className="btn-primary" onClick={openCreator} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <Plus size={18} /> Add Custom Role
                    </button>
                </div>
            </header>

            {showEditor ? (
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
                <section className="slide-up glass-panel" style={{ animationDelay: '0.2s', padding: 0, overflow: 'hidden' }}>
                    {initialRoles.length === 0 ? (
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
                                    <th style={{ padding: '1rem 1.5rem', fontWeight: 600 }}>System Core</th>
                                    <th style={{ padding: '1rem 1.5rem', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {initialRoles.map((r, i) => (
                                    <tr key={r.id || i} className="clickable-row" style={{ borderBottom: '1px solid var(--panel-border)', transition: "background 0.2s ease" }}>
                                        <td style={{ padding: '1rem 1.5rem', fontWeight: 500, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{r.name}</td>
                                        <td style={{ padding: '1rem 1.5rem', color: 'var(--text-secondary)' }}>{r.description || 'System Definition Component'}</td>
                                        <td style={{ padding: '1rem 1.5rem' }}>
                                            {r.is_system ? (
                                                <span style={{ padding: "0.25rem 0.5rem", background: "rgba(102, 252, 241, 0.15)", color: "var(--primary-color)", borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600 }}>IMMUTABLE</span>
                                            ) : (
                                                <span style={{ padding: "0.25rem 0.5rem", background: "rgba(255, 255, 255, 0.05)", color: "var(--text-secondary)", borderRadius: "6px", fontSize: "0.8rem" }}>CUSTOM</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                                                <ActionButton action={`Opening Permission Matrix for: ${r.name}...`} style={{ color: 'var(--primary-color)', background: 'rgba(102, 252, 241, 0.1)', cursor: 'pointer', padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', display: 'flex', fontSize: '0.85rem' }}>
                                                    Permissions
                                                </ActionButton>

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
