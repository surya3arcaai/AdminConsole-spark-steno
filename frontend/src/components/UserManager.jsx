"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    createUserAction, updateUserAction, deleteUserAction, generateEidAction,
    assignEidAction, setRegistrationAction,
    assignSupervisorAction, removeSupervisorAction, getSupervisorAction,
    createDepartmentAction, createLocationAction, createSpecializationAction,
    updateDemographicsAction
} from "@/app/actions/user_actions";
import { assignRoleAction, getUserRolesAction } from "@/app/actions/role_actions";
import {
    Loader2, Plus, X, User, Edit2, Trash2, Key, Check, Shield, AlertTriangle, CheckCircle2,
    Building2, Search, ChevronDown, ChevronRight, Users, LayoutGrid, List, MapPin
} from "lucide-react";

export default function UserManager({ initialUsers = [], demographics = {} }) {
    const router = useRouter();

    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        setMounted(true);
    }, []);

    const defaultForm = {
        id: null,
        name: "", email: "", phone: "", password: "", status: "active", system_role: "user", eid: "",
        department_id: "", hospital_id: "", location_id: "", specialization_id: "",
        registration_number: "", council_name: "", supervisor_id: ""
    };

    const [showEditor, setShowEditor] = useState(false);
    const [viewingUser, setViewingUser] = useState(null);
    const [form, setForm] = useState(defaultForm);
    const [isEditingExistingUser, setIsEditingExistingUser] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isSubSubmitting, setIsSubSubmitting] = useState(false);

    const [localDepts, setLocalDepts] = useState(demographics.departments || []);
    const [localLocs, setLocalLocs] = useState(demographics.hospitals || demographics.locations || []);
    const [localSpecs, setLocalSpecs] = useState(demographics.specializations || []);

    const [addingType, setAddingType] = useState(null);
    const [subForm, setSubForm] = useState({});

    const openAddPanel = (type) => {
        setAddingType(type);
        setSubForm({});
    };

    const handleSubSubmit = async () => {
        setIsSubSubmitting(true);
        try {
            if (addingType === "department") {
                if (!subForm.name || !subForm.name.trim()) return alert("Department Name is required");
                const res = await createDepartmentAction({
                    name: subForm.name.trim(),
                    code: subForm.code && subForm.code.trim() ? subForm.code.trim() : undefined,
                    description: subForm.description ? subForm.description.trim() : undefined
                });
                if (res?.id) {
                    setLocalDepts(prev => [...prev, res]);
                    setForm(f => ({ ...f, department_id: res.id }));
                    setAddingType(null);
                } else {
                    alert(`Failed to create department: ${res?.detail || res?.error || "Unknown error"}`);
                }
            } else if (addingType === "location") {
                if (!subForm.name || !subForm.name.trim()) return alert("Hospital Name is required");
                const res = await createLocationAction({
                    name: subForm.name.trim(),
                    city: subForm.city ? subForm.city.trim() : undefined,
                    address: subForm.address ? subForm.address.trim() : undefined
                });
                if (res?.id) {
                    setLocalLocs(prev => [...prev, res]);
                    setForm(f => ({ ...f, hospital_id: res.id, location_id: res.id }));
                    setAddingType(null);
                } else {
                    alert(`Failed to create hospital: ${res?.detail || res?.error || "Hospital might already exist or server error."}`);
                }
            } else if (addingType === "specialization") {
                if (!subForm.name || !subForm.name.trim()) return alert("Specialization Name is required");
                const res = await createSpecializationAction({
                    name: subForm.name.trim(),
                    category: subForm.category ? subForm.category.trim() : undefined
                });
                if (res?.id) {
                    setLocalSpecs(prev => [...prev, res]);
                    setForm(f => ({ ...f, specialization_id: res.id }));
                    setAddingType(null);
                } else {
                    alert(`Failed to create specialization: ${res?.detail || res?.error || "Unknown error"}`);
                }
            }
        } catch (e) {
            alert("Failed to add " + (addingType === "location" ? "hospital" : addingType));
        } finally {
            setIsSubSubmitting(false);
        }
    };

    const handleAddDept = () => openAddPanel("department");
    const handleAddLoc = () => openAddPanel("location");
    const handleAddSpec = () => openAddPanel("specialization");

    const [searchTerm, setSearchTerm] = useState("");
    const [selectedHospitalFilter, setSelectedHospitalFilter] = useState("all");
    const [viewMode, setViewMode] = useState("grouped"); // "grouped" | "flat"
    const [collapsedHospitals, setCollapsedHospitals] = useState({});

    const toggleCollapse = (hospId) => {
        setCollapsedHospitals(prev => ({
            ...prev,
            [hospId]: !prev[hospId]
        }));
    };

    const openNewUserForm = (presetHospitalId = "") => {
        const defaultHospId = (typeof presetHospitalId === "string" && presetHospitalId) ? presetHospitalId : (localLocs.length > 0 ? localLocs[0].id : "");
        setForm({
            ...defaultForm,
            system_role: "user",
            department_id: localDepts.length > 0 ? localDepts[0].id : "",
            hospital_id: defaultHospId,
            location_id: defaultHospId,
            specialization_id: localSpecs.length > 0 ? localSpecs[0].id : "",
            supervisor_id: ""
        });
        setIsEditingExistingUser(false);
        setShowEditor(true);
    };

    const getDeptName = (deptId) => localDepts.find(d => d.id === deptId)?.name || "";
    const getSpecName = (specId) => localSpecs.find(s => s.id === specId)?.name || "";
    const getHospitalName = (hospId) => localLocs.find(l => l.id === hospId)?.name || "Unassigned";

    // Supervisor Quick-Assign Modal State & Handlers
    const [assigningSupervisorUser, setAssigningSupervisorUser] = useState(null);
    const [selectedSupId, setSelectedSupId] = useState("");
    const [isSavingSupervisor, setIsSavingSupervisor] = useState(false);

    const openSupervisorModal = (u) => {
        setAssigningSupervisorUser(u);
        setSelectedSupId(u.supervisor_id || "");
    };

    const handleSaveSupervisor = async () => {
        if (!assigningSupervisorUser) return;
        setIsSavingSupervisor(true);
        try {
            if (selectedSupId) {
                await assignSupervisorAction(
                    assigningSupervisorUser.id,
                    selectedSupId,
                    !!assigningSupervisorUser.supervisor_id
                );
            } else {
                await removeSupervisorAction(assigningSupervisorUser.id).catch(() => {});
            }
            setAssigningSupervisorUser(null);
            window.location.reload();
        } catch (err) {
            alert(`Failed to update supervisor: ${err.message || err}`);
        } finally {
            setIsSavingSupervisor(false);
        }
    };

    const getSupervisorInfo = (u) => {
        if (u.supervisor_name) {
            return { name: u.supervisor_name, id: u.supervisor_id };
        }
        if (u.supervisor_id) {
            const sup = initialUsers.find(s => s.id === u.supervisor_id);
            if (sup) return { name: sup.name, id: sup.id };
            return { name: "Assigned", id: u.supervisor_id };
        }
        return null;
    };

    const getUserRoleInfo = (u) => {
        const roles = Array.isArray(u.roles) ? u.roles.map(r => String(r).toLowerCase()) : [];
        if (u.is_supervisor || roles.includes("supervisor")) {
            return { label: "Supervisor", color: "#66fcf1", bg: "rgba(102, 252, 241, 0.12)", border: "1px solid rgba(102, 252, 241, 0.3)" };
        }
        if (roles.includes("admin")) {
            return { label: "Admin", color: "#e040fb", bg: "rgba(224, 64, 251, 0.12)", border: "1px solid rgba(224, 64, 251, 0.3)" };
        }
        return { label: "User", color: "#69f0ae", bg: "rgba(105, 240, 174, 0.12)", border: "1px solid rgba(105, 240, 174, 0.3)" };
    };

    const filteredUsers = React.useMemo(() => {
        return initialUsers.filter(u => {
            const hospId = u.hospital_id || u.location_id || "unassigned";
            if (selectedHospitalFilter !== "all" && hospId !== selectedHospitalFilter) {
                return false;
            }
            if (!searchTerm.trim()) return true;
            const term = searchTerm.toLowerCase().trim();
            const name = (u.name || "").toLowerCase();
            const email = (u.email || "").toLowerCase();
            const eid = (u.eid || "").toLowerCase();
            const phone = (u.phone || "").toLowerCase();
            return name.includes(term) || email.includes(term) || eid.includes(term) || phone.includes(term);
        });
    }, [initialUsers, searchTerm, selectedHospitalFilter]);

    const hospitalSections = React.useMemo(() => {
        const map = {};
        localLocs.forEach(loc => {
            map[loc.id] = {
                id: loc.id,
                name: loc.name,
                city: loc.city || "",
                address: loc.address || "",
                users: []
            };
        });

        const unassignedUsers = [];

        filteredUsers.forEach(u => {
            const hospId = u.hospital_id || u.location_id;
            if (hospId && map[hospId]) {
                map[hospId].users.push(u);
            } else if (hospId) {
                if (!map[hospId]) {
                    map[hospId] = {
                        id: hospId,
                        name: `Hospital (${hospId.slice(0, 8)}...)`,
                        city: "",
                        address: "",
                        users: []
                    };
                }
                map[hospId].users.push(u);
            } else {
                unassignedUsers.push(u);
            }
        });

        let list = Object.values(map);
        if (selectedHospitalFilter !== "all") {
            if (selectedHospitalFilter === "unassigned") {
                list = [];
            } else {
                list = list.filter(h => h.id === selectedHospitalFilter);
            }
        }

        return {
            hospitals: list,
            unassigned: selectedHospitalFilter === "all" || selectedHospitalFilter === "unassigned" ? unassignedUsers : []
        };
    }, [filteredUsers, localLocs, selectedHospitalFilter]);

    const openEditor = async (user) => {
        setIsEditingExistingUser(true);
        const hospId = user.hospital_id || user.location_id || "";
        const initialRole = (user.roles && user.roles.length > 0)
            ? user.roles[0].toLowerCase()
            : (user.is_supervisor ? "supervisor" : "user");
        setForm({
            id: user.id,
            name: user.name || "",
            email: user.email || "",
            phone: user.phone || "",
            password: "",
            status: user.status || "active",
            system_role: initialRole === "doctor" ? "user" : initialRole,
            eid: user.eid || "",
            department_id: user.department_id || "",
            hospital_id: hospId,
            location_id: hospId,
            specialization_id: user.specialization_id || "",
            registration_number: "Loading...",
            council_name: "Loading...",
            supervisor_id: user.supervisor_id || ""
        });
        setShowEditor(true);

        try {
            const roleRes = await getUserRolesAction(user.id);
            const rolesList = Array.isArray(roleRes) ? roleRes : (roleRes?.roles || []);
            if (rolesList.length > 0) {
                const rawRole = rolesList[0]?.name?.toLowerCase() || "user";
                const userRole = rawRole === "doctor" ? "user" : rawRole;
                setForm(f => ({ ...f, system_role: userRole }));
            }
        } catch (e) {
            // Keep initialRole
        }

        try {
            const regRes = await fetch(`/api/users/${user.id}/registration`).then(r => r.json()).catch(() => null);
            setForm(f => ({
                ...f,
                registration_number: regRes?.registration_number || "",
                council_name: regRes?.council_name || ""
            }));
        } catch (e) {
            setForm(f => ({ ...f, registration_number: "", council_name: "" }));
        }

        if (!user.supervisor_id) {
            try {
                const supRes = await getSupervisorAction(user.id);
                if (supRes?.supervisor_id) {
                    setForm(f => ({ ...f, supervisor_id: supRes.supervisor_id }));
                }
            } catch (e) {}
        }
    };

    const openViewer = async (user) => {
        const initialRole = (user.roles && user.roles.length > 0)
            ? user.roles[0].toLowerCase()
            : (user.is_supervisor ? "supervisor" : "user");
        const formattedInitial = initialRole === "doctor" ? "User" : (initialRole.charAt(0).toUpperCase() + initialRole.slice(1));
        setViewingUser({
            ...user,
            system_role: formattedInitial,
            registration_number: "Loading...",
            council_name: "Loading..."
        });

        try {
            const roleRes = await getUserRolesAction(user.id);
            const rolesList = Array.isArray(roleRes) ? roleRes : (roleRes?.roles || []);
            if (rolesList.length > 0) {
                const rawRole = rolesList[0]?.name?.toLowerCase() || "user";
                const userRole = rawRole === "doctor" ? "User" : (rawRole.charAt(0).toUpperCase() + rawRole.slice(1));
                setViewingUser(prev => prev ? ({ ...prev, system_role: userRole }) : null);
            }
        } catch (e) {
            setViewingUser(prev => prev ? ({ ...prev, system_role: "User" }) : null);
        }

        try {
            const regRes = await fetch(`/api/users/${user.id}/registration`).then(r => r.json()).catch(() => null);
            setViewingUser(prev => prev ? ({
                ...prev,
                registration_number: regRes?.registration_number || "Not Registered",
                council_name: regRes?.council_name || "N/A"
            }) : null);
        } catch (e) {
            setViewingUser(prev => prev ? ({
                ...prev,
                registration_number: "Not Registered",
                council_name: "N/A"
            }) : null);
        }
    };

    const handleSaveUser = async () => {
        if (!form.name.trim() || !form.email.trim()) {
            return alert("Name and Email are required.");
        }
        if (!form.id && !form.password.trim()) {
            return alert("Password is required for new user registration.");
        }

        setIsSaving(true);
        if (!form.id) setIsCreatingUser(true);

        try {
            const hospVal = form.hospital_id || form.location_id || undefined;
            const payload = {
                name: form.name.trim(),
                email: form.email.trim(),
                phone: form.phone.trim() || undefined,
                password: form.password ? form.password.trim() : undefined,
                status: form.status,
                department_id: form.department_id || undefined,
                hospital_id: hospVal,
                location_id: hospVal,
                specialization_id: form.specialization_id || undefined
            };

            let targetId = form.id;

            if (form.id) {
                // Update existing user
                await updateUserAction(form.id, {
                    name: payload.name,
                    email: payload.email,
                    phone: payload.phone,
                    status: payload.status
                });
                await updateDemographicsAction(form.id, {
                    department_id: form.department_id || null,
                    hospital_id: hospVal || null,
                    location_id: hospVal || null,
                    specialization_id: form.specialization_id || null
                });
            } else {
                // Create new user
                const savedUser = await createUserAction(payload);
                if (!savedUser || savedUser.error || savedUser.detail || !savedUser.id) {
                    const errMsg = savedUser?.detail || savedUser?.error || "User creation failed. Please check inputs.";
                    alert(`Registration Failed: ${errMsg}`);
                    return;
                }
                targetId = savedUser.id;

                // Explicitly save demographics for the new user
                await updateDemographicsAction(targetId, {
                    department_id: form.department_id || null,
                    hospital_id: hospVal || null,
                    location_id: hospVal || null,
                    specialization_id: form.specialization_id || null
                });

                // Update status if user picked active/suspended/inactive
                if (form.status && form.status !== 'pending') {
                    await updateUserAction(targetId, { status: form.status });
                }
            }

            if (targetId) {
                if (form.eid.trim() || !form.id) {
                    await assignEidAction(targetId, form.eid.trim() || "");
                }
                if (form.registration_number.trim() && form.council_name.trim()) {
                    await setRegistrationAction(targetId, {
                        registration_number: form.registration_number.trim(),
                        council_name: form.council_name.trim()
                    }, !!form.id);
                }
                if (form.supervisor_id) {
                    await assignSupervisorAction(targetId, form.supervisor_id, !!form.id);
                } else if (form.id) {
                    await removeSupervisorAction(targetId).catch(() => {});
                }
                if (form.system_role && form.system_role !== "Loading...") {
                    await assignRoleAction(targetId, form.system_role);
                }
            }

            setShowEditor(false);
            window.location.reload();
        } catch (e) {
            alert(`Error saving user: ${e.message || e}`);
        } finally {
            setIsSaving(false);
            setIsCreatingUser(false);
        }
    };

    const handleDelete = (user) => {
        setUserToDelete(user);
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        const userId = userToDelete.id;
        setDeletingId(userId);
        try {
            await deleteUserAction(userId);
            setUserToDelete(null);
            window.location.reload();
        } catch (e) {
            alert(`Delete Failed: ${e.message || e}`);
        } finally {
            setDeletingId(null);
        }
    };

    const generateEid = async () => {
        try {
            const res = await generateEidAction();
            if (res && res.eid) {
                setForm(prev => ({ ...prev, eid: res.eid }));
            }
        } catch (e) {
            alert("Failed to generate EID. Ensure backend configuration exists.");
        }
    };

    if (!mounted) {
        return (
            <div style={{ padding: "3rem 1rem", textAlign: "center", color: "var(--text-secondary)" }}>
                <h2 style={{ margin: 0, color: "var(--primary-color)" }}>User Management</h2>
                <p style={{ margin: "0.5rem 0 2rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    Manage practitioner profiles organized by hospital, departments, and role permissions
                </p>
                <div style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> Loading user directory...
                </div>
            </div>
        );
    }

    return (
        <>
            <style>{`
                .clickable-row:hover { background: rgba(102, 252, 241, 0.05); }
                .hover-underline:hover { text-decoration: underline; }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <div>
                    <h2 style={{ margin: 0, color: "var(--primary-color)" }}>User Management</h2>
                    <p style={{ margin: "0.25rem 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                        Manage practitioner profiles organized by hospital, departments, and role permissions
                    </p>
                </div>
                <button
                    id="btn-new-user"
                    className="btn-primary"
                    onClick={() => openNewUserForm()}
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                    <Plus size={18} /> New User
                </button>
            </div>

            {/* Summary Metrics Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
                <div className="glass-panel" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(102, 252, 241, 0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary-color)" }}>
                        <Users size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)" }}>{initialUsers.length}</div>
                        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Total Practitioners</div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(69, 162, 158, 0.18)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--secondary-color)" }}>
                        <Building2 size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)" }}>{localLocs.length}</div>
                        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Hospitals</div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(105, 240, 174, 0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--success)" }}>
                        <CheckCircle2 size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)" }}>{initialUsers.filter(u => u.status === "active").length}</div>
                        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Active Accounts</div>
                    </div>
                </div>

                <div className="glass-panel" style={{ padding: "1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(224, 64, 251, 0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "#e040fb" }}>
                        <Shield size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--text-primary)" }}>{initialUsers.filter(u => u.is_supervisor || (u.roles || []).includes("supervisor")).length}</div>
                        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Supervisors</div>
                    </div>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="glass-panel" style={{ padding: "1rem 1.25rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", flex: 1, minWidth: "280px" }}>
                    <div style={{ position: "relative", flex: 1, maxWidth: "400px" }}>
                        <Search size={16} color="var(--text-secondary)" style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)" }} />
                        <input
                            className="input-field"
                            placeholder="Search by name, email, EID, or phone..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ paddingLeft: "36px", height: "38px" }}
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <Building2 size={16} color="var(--secondary-color)" />
                        <select
                            className="input-field"
                            value={selectedHospitalFilter}
                            onChange={e => setSelectedHospitalFilter(e.target.value)}
                            style={{ height: "38px", width: "auto", minWidth: "170px" }}
                        >
                            <option value="all">All Hospitals ({initialUsers.length})</option>
                            {localLocs.map(l => {
                                const count = initialUsers.filter(u => (u.hospital_id === l.id || u.location_id === l.id)).length;
                                return (
                                    <option key={l.id} value={l.id}>{l.name} ({count})</option>
                                );
                            })}
                            <option value="unassigned">Unassigned ({initialUsers.filter(u => !u.hospital_id && !u.location_id).length})</option>
                        </select>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>View:</span>
                    <div style={{ display: "flex", background: "rgba(0,0,0,0.3)", borderRadius: "8px", padding: "3px", border: "1px solid var(--panel-border)" }}>
                        <button
                            onClick={() => setViewMode("grouped")}
                            style={{
                                display: "flex", alignItems: "center", gap: "0.35rem",
                                padding: "0.35rem 0.75rem", borderRadius: "6px", border: "none",
                                background: viewMode === "grouped" ? "var(--primary-color)" : "transparent",
                                color: viewMode === "grouped" ? "#000" : "var(--text-secondary)",
                                cursor: "pointer", fontWeight: 600, fontSize: "0.8rem", transition: "all 0.2s ease"
                            }}
                        >
                            <Building2 size={14} /> By Hospital
                        </button>
                        <button
                            onClick={() => setViewMode("flat")}
                            style={{
                                display: "flex", alignItems: "center", gap: "0.35rem",
                                padding: "0.35rem 0.75rem", borderRadius: "6px", border: "none",
                                background: viewMode === "flat" ? "var(--primary-color)" : "transparent",
                                color: viewMode === "flat" ? "#000" : "var(--text-secondary)",
                                cursor: "pointer", fontWeight: 600, fontSize: "0.8rem", transition: "all 0.2s ease"
                            }}
                        >
                            <List size={14} /> All Users
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Demographics Creation Modal */}
            {addingType && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", zIndex: 9999,
                    display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                    <div className="glass-panel slide-up" style={{ width: "420px", padding: "2rem", border: "1px solid var(--panel-border)", borderRadius: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                            <h3 style={{ margin: 0, textTransform: "capitalize", color: "var(--primary-color)" }}>
                                Add New {addingType === "location" ? "Hospital" : addingType}
                            </h3>
                            <button onClick={() => setAddingType(null)} disabled={isSubSubmitting} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div style={{ marginBottom: "1rem" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                                {addingType === "location" ? "Hospital Name *" : `${addingType} Name *`}
                            </label>
                            <input className="input-field" placeholder={addingType === "location" ? "e.g. City General Hospital" : "Name"} value={subForm.name || ""} onChange={e => setSubForm({ ...subForm, name: e.target.value })} />
                        </div>
                        {addingType === "department" && (
                            <>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Code (Optional)</label>
                                    <input className="input-field" value={subForm.code || ""} onChange={e => setSubForm({ ...subForm, code: e.target.value })} />
                                </div>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Description (Optional)</label>
                                    <textarea className="input-field" rows={2} value={subForm.description || ""} onChange={e => setSubForm({ ...subForm, description: e.target.value })} />
                                </div>
                            </>
                        )}
                        {addingType === "location" && (
                            <>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>City</label>
                                    <input className="input-field" placeholder="e.g. New York" value={subForm.city || ""} onChange={e => setSubForm({ ...subForm, city: e.target.value })} />
                                </div>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Address</label>
                                    <textarea className="input-field" rows={2} placeholder="Full facility address" value={subForm.address || ""} onChange={e => setSubForm({ ...subForm, address: e.target.value })} />
                                </div>
                            </>
                        )}
                        {addingType === "specialization" && (
                            <div style={{ marginBottom: "1rem" }}>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Category</label>
                                <input className="input-field" value={subForm.category || ""} onChange={e => setSubForm({ ...subForm, category: e.target.value })} />
                            </div>
                        )}
                        <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
                            <button className="btn-primary" onClick={handleSubSubmit} disabled={isSubSubmitting} style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}>
                                {isSubSubmitting ? (
                                    <>
                                        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Saving...
                                    </>
                                ) : "Save"}
                            </button>
                            <button className="btn-secondary" onClick={() => setAddingType(null)} disabled={isSubSubmitting} style={{ flex: 1 }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Profile Viewing Modal */}
            {viewingUser && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", zIndex: 9999,
                    display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                    <div className="glass-panel slide-up" style={{ width: "600px", maxHeight: "85vh", overflowY: "auto", padding: "2rem", border: "1px solid var(--panel-border)", borderRadius: "12px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem" }}>
                            <div>
                                <h3 style={{ margin: 0, color: "var(--text-primary)" }}>{viewingUser.name}</h3>
                                <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginTop: "0.2rem" }}>Practitioner Profile</div>
                            </div>
                            <button onClick={() => setViewingUser(null)} style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                            <div>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Email</label>
                                <div style={{ fontWeight: 500 }}>{viewingUser.email}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>System Role</label>
                                <div style={{ fontWeight: 600, color: "var(--primary-color)", textTransform: "capitalize" }}>{viewingUser.system_role || "User"}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Employee ID (EID)</label>
                                <div style={{ fontWeight: 500, fontFamily: "monospace", color: "var(--primary-color)" }}>{viewingUser.eid || "No EID Assigned"}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Status</label>
                                <div style={{ fontWeight: 500, textTransform: "capitalize", color: viewingUser.status === 'active' ? 'var(--success)' : '#ff9800' }}>{viewingUser.status || "Active"}</div>
                            </div>
                        </div>

                        <div style={{ background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
                            <h4 style={{ margin: "0 0 0.8rem 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>Hospital & Demographics</h4>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                                <div><strong style={{ color: "var(--primary-color)" }}>Hospital:</strong> {localLocs.find(l => l.id === (viewingUser.hospital_id || viewingUser.location_id))?.name || "Unassigned"}</div>
                                <div><strong style={{ color: "var(--primary-color)" }}>Dept:</strong> {localDepts.find(d => d.id === viewingUser.department_id)?.name || "N/A"}</div>
                                <div><strong style={{ color: "var(--primary-color)" }}>Spec:</strong> {localSpecs.find(s => s.id === viewingUser.specialization_id)?.name || "N/A"}</div>
                                <div><strong style={{ color: "var(--primary-color)" }}>Manager:</strong> {initialUsers.find(u => u.id === viewingUser.supervisor_id)?.name || "None"}</div>
                            </div>
                        </div>

                        <div style={{ background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px" }}>
                            <h4 style={{ margin: "0 0 0.8rem 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>Medical Registration</h4>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                                <div><strong style={{ color: "var(--primary-color)" }}>Reg #:</strong> {viewingUser.registration_number}</div>
                                <div><strong style={{ color: "var(--primary-color)" }}>Council:</strong> {viewingUser.council_name}</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Delete Confirmation Modal */}
            {userToDelete && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", zIndex: 10000,
                    display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                    <div className="glass-panel slide-up" style={{ width: "450px", padding: "2rem", border: "1px solid rgba(255, 82, 82, 0.3)", borderRadius: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.8rem", marginBottom: "1rem" }}>
                            <div style={{ width: "42px", height: "42px", borderRadius: "50%", background: "rgba(255, 82, 82, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <AlertTriangle size={24} color="var(--error)" />
                            </div>
                            <h3 style={{ margin: 0, color: "var(--text-primary)" }}>Delete User Account</h3>
                        </div>

                        <p style={{ color: "var(--text-secondary)", lineHeight: "1.5", fontSize: "0.95rem", marginBottom: "1.5rem" }}>
                            Are you sure you want to delete <strong style={{ color: "var(--text-primary)" }}>{userToDelete.name}</strong> (<span style={{ color: "var(--primary-color)" }}>{userToDelete.email}</span>)?
                            <br /><br />
                            <span style={{ fontSize: "0.85rem", color: "#ff9800", background: "rgba(255, 152, 0, 0.1)", padding: "0.4rem 0.6rem", borderRadius: "6px", display: "inline-block" }}>
                                ⚠️ Permanently removes account from Keycloak and database.
                            </span>
                        </p>

                        <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                            <button
                                className="btn-secondary"
                                onClick={() => setUserToDelete(null)}
                                disabled={deletingId === userToDelete.id}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteUser}
                                disabled={deletingId === userToDelete.id}
                                style={{
                                    background: "var(--error)",
                                    color: "#fff",
                                    border: "none",
                                    padding: "0.6rem 1.2rem",
                                    borderRadius: "8px",
                                    cursor: deletingId === userToDelete.id ? "not-allowed" : "pointer"
                                }}
                            >
                                {deletingId === userToDelete.id ? "Deleting..." : "Delete User"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Supervisor Modal (Admin Only) */}
            {assigningSupervisorUser && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.78)", backdropFilter: "blur(5px)", zIndex: 10000,
                    display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                    <div className="glass-panel slide-up" style={{ width: "520px", padding: "2rem", border: "1px solid var(--panel-border)", borderRadius: "14px", boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                                <div style={{
                                    width: "42px", height: "42px", borderRadius: "10px",
                                    background: "rgba(102, 252, 241, 0.12)", border: "1px solid rgba(102, 252, 241, 0.3)",
                                    display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary-color)"
                                }}>
                                    <Shield size={22} />
                                </div>
                                <div>
                                    <h3 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-primary)" }}>Assign Clinical Supervisor</h3>
                                    <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.15rem" }}>
                                        Administrative clinical governance assignment
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setAssigningSupervisorUser(null)}
                                disabled={isSavingSupervisor}
                                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: "4px" }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Target Practitioner Info Card */}
                        <div style={{
                            background: "rgba(0,0,0,0.3)",
                            padding: "1rem 1.25rem",
                            borderRadius: "10px",
                            border: "1px solid var(--panel-border)",
                            marginBottom: "1.5rem"
                        }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                                <div style={{ fontWeight: 600, color: "var(--primary-color)", fontSize: "1.05rem" }}>
                                    {assigningSupervisorUser.name}
                                </div>
                                <span style={{
                                    fontSize: "0.78rem",
                                    padding: "0.2rem 0.6rem",
                                    background: "rgba(102, 252, 241, 0.08)",
                                    color: "var(--primary-color)",
                                    borderRadius: "12px",
                                    border: "1px solid rgba(102, 252, 241, 0.2)"
                                }}>
                                    🏥 {getHospitalName(assigningSupervisorUser.hospital_id || assigningSupervisorUser.location_id)}
                                </span>
                            </div>
                            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                {assigningSupervisorUser.email}
                            </div>
                        </div>

                        {/* Supervisor Dropdown */}
                        <div style={{ marginBottom: "1.5rem" }}>
                            <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
                                Select Supervisor (Filtered by Hospital)
                            </label>
                            <select
                                id="admin-supervisor-select"
                                className="input-field"
                                value={selectedSupId}
                                onChange={e => setSelectedSupId(e.target.value)}
                                disabled={isSavingSupervisor}
                                style={{ width: "100%", padding: "0.7rem 1rem", fontSize: "0.92rem", background: "rgba(0,0,0,0.4)" }}
                            >
                                <option value="">— No Supervisor (Unassigned) —</option>
                                {(() => {
                                    const userHospId = assigningSupervisorUser.hospital_id || assigningSupervisorUser.location_id;
                                    return initialUsers
                                        .filter(s => {
                                            if (s.id === assigningSupervisorUser.id) return false;
                                            const isSuper = s.is_supervisor || (Array.isArray(s.roles) && s.roles.some(r => String(r).toLowerCase() === "supervisor"));
                                            if (!isSuper) return false;
                                            if (!userHospId) return true;
                                            const supHosp = s.hospital_id || s.location_id;
                                            return supHosp && String(supHosp).toLowerCase() === String(userHospId).toLowerCase();
                                        })
                                        .map(sup => (
                                            <option key={sup.id} value={sup.id}>
                                                {sup.name} ({sup.email})
                                            </option>
                                        ));
                                })()}
                            </select>

                            {(() => {
                                const userHospId = assigningSupervisorUser.hospital_id || assigningSupervisorUser.location_id;
                                const eligibleSupCount = initialUsers.filter(s => {
                                    if (s.id === assigningSupervisorUser.id) return false;
                                    const isSuper = s.is_supervisor || (Array.isArray(s.roles) && s.roles.some(r => String(r).toLowerCase() === "supervisor"));
                                    if (!isSuper) return false;
                                    if (!userHospId) return true;
                                    const supHosp = s.hospital_id || s.location_id;
                                    return supHosp && String(supHosp).toLowerCase() === String(userHospId).toLowerCase();
                                }).length;

                                if (!userHospId) {
                                    return (
                                        <div style={{ fontSize: "0.82rem", color: "#ff9800", marginTop: "0.6rem" }}>
                                            ⚠️ Practitioner is unassigned to any hospital. Assign a hospital first to restrict supervisors.
                                        </div>
                                    );
                                }
                                if (eligibleSupCount === 0) {
                                    return (
                                        <div style={{ fontSize: "0.82rem", color: "#ff9800", marginTop: "0.6rem" }}>
                                            ⚠️ No supervisors registered under {getHospitalName(userHospId)}. Assign the Supervisor role to a practitioner in this hospital first.
                                        </div>
                                    );
                                }
                                return (
                                    <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.6rem" }}>
                                        Showing {eligibleSupCount} supervisor(s) belonging to {getHospitalName(userHospId)}.
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Modal Action Buttons */}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                            <button
                                className="btn-secondary"
                                onClick={() => setAssigningSupervisorUser(null)}
                                disabled={isSavingSupervisor}
                            >
                                Cancel
                            </button>
                            <button
                                id="btn-confirm-save-supervisor"
                                className="btn-primary"
                                onClick={handleSaveSupervisor}
                                disabled={isSavingSupervisor}
                                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                            >
                                {isSavingSupervisor ? (
                                    <>
                                        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Saving...
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} /> Save Supervisor
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* User Creation Loading Spinner */}
            {isCreatingUser && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", zIndex: 11000,
                    display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                    <div className="glass-panel slide-up" style={{
                        width: "420px", padding: "2.5rem", borderRadius: "16px", textAlign: "center",
                        border: "1px solid rgba(102, 252, 241, 0.3)", boxShadow: "0 20px 50px rgba(0,0,0,0.8)"
                    }}>
                        <div style={{
                            width: "70px", height: "70px", borderRadius: "50%", background: "rgba(102, 252, 241, 0.12)",
                            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem",
                            border: "1px solid rgba(102, 252, 241, 0.3)"
                        }}>
                            <Loader2 size={36} color="var(--primary-color)" style={{ animation: "spin 1s linear infinite" }} />
                        </div>
                        <h3 style={{ margin: "0 0 0.75rem 0", color: "var(--text-primary)", fontSize: "1.3rem" }}>
                            Saving User Account...
                        </h3>
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.5", margin: "0" }}>
                            Registering <strong style={{ color: "var(--text-primary)" }}>{form.name}</strong> in Keycloak and database...
                        </p>
                    </div>
                </div>
            )}

            {/* Single-Step User Creation / Edit Form */}
            {showEditor ? (
                <div className="glass-panel slide-up" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <User size={20} color="var(--primary-color)" />
                            {isEditingExistingUser ? "Edit User Profile" : "New User Onboarding"}
                        </h3>
                        <button onClick={() => setShowEditor(false)} disabled={isSaving} style={{ color: "var(--text-secondary)", background: "none", cursor: "pointer", border: "none" }}>
                            <X size={24} />
                        </button>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        {/* Basic Info */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Full Name *</label>
                                <input id="input-full-name" className="input-field" placeholder="Dr. John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Email Address *</label>
                                <input id="input-email-address" className="input-field" type="email" placeholder="john.doe@arca.local" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Phone Number</label>
                                <input id="input-phone-number" className="input-field" placeholder="+1 555-0198" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                            </div>
                            {!form.id && (
                                <div>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Password *</label>
                                    <input id="input-password" className="input-field" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                                </div>
                            )}
                            <div>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Account Status</label>
                                <select id="select-account-status" className="input-field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                                    <option value="active">Active</option>
                                    <option value="pending">Pending</option>
                                    <option value="inactive">Inactive</option>
                                    <option value="suspended">Suspended</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}><Shield size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> System Role</label>
                                <select id="select-system-role" className="input-field" value={form.system_role} onChange={e => setForm({ ...form, system_role: e.target.value })} disabled={form.system_role === 'Loading...'}>
                                    <option value="">No Role...</option>
                                    <option value="user">User</option>
                                    <option value="supervisor">Supervisor</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>

                        {/* Hospital & Demographics */}
                        <div style={{ background: "rgba(0,0,0,0.2)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--panel-border)" }}>
                            <h4 style={{ margin: "0 0 1rem 0", color: "var(--primary-color)" }}>Hospital & Demographics</h4>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                <div style={{ gridColumn: "1 / -1" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Employee ID (EID)</label>
                                    <div style={{ display: "flex", gap: "1rem" }}>
                                        <input className="input-field" placeholder="Leave empty to auto-generate or enter EID" value={form.eid} onChange={e => setForm({ ...form, eid: e.target.value })} style={{ flex: 1 }} />
                                        {!form.id && (
                                            <button onClick={generateEid} type="button" className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                                <Key size={16} /> Auto-Generate
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Hospital Dropdown */}
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                        <label style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Hospital *</label>
                                        <button onClick={handleAddLoc} type="button" style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", fontSize: "0.85rem", padding: 0 }}>+ Add Hospital</button>
                                    </div>
                                    <select
                                        id="select-hospital"
                                        className="input-field"
                                        value={form.hospital_id || form.location_id || ""}
                                        onChange={e => {
                                            const newHosp = e.target.value;
                                            setForm(prev => {
                                                let newSupId = prev.supervisor_id;
                                                if (newSupId) {
                                                    const curSup = initialUsers.find(u => u.id === newSupId);
                                                    const supHosp = curSup?.hospital_id || curSup?.location_id;
                                                    if (supHosp !== newHosp) {
                                                        newSupId = "";
                                                    }
                                                }
                                                return {
                                                    ...prev,
                                                    hospital_id: newHosp,
                                                    location_id: newHosp,
                                                    supervisor_id: newSupId
                                                };
                                            });
                                        }}
                                    >
                                        <option value="">Select Hospital...</option>
                                        {localLocs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>

                                {/* Department Dropdown */}
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                        <label style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Department</label>
                                        <button onClick={handleAddDept} type="button" style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", fontSize: "0.85rem", padding: 0 }}>+ Add</button>
                                    </div>
                                    <select id="select-department" className="input-field" value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
                                        <option value="">Select Department...</option>
                                        {localDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>

                                {/* Specialization Dropdown */}
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                        <label style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Specialization</label>
                                        <button onClick={handleAddSpec} type="button" style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", fontSize: "0.85rem", padding: 0 }}>+ Add</button>
                                    </div>
                                    <select id="select-specialization" className="input-field" value={form.specialization_id} onChange={e => setForm({ ...form, specialization_id: e.target.value })}>
                                        <option value="">Select Specialization...</option>
                                        {localSpecs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>

                                {/* Reporting Supervisor */}
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                        <label style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Reporting Supervisor</label>
                                        {(form.hospital_id || form.location_id) && (
                                            <span style={{ fontSize: "0.78rem", color: "var(--primary-color)" }}>
                                                Filtered: {localLocs.find(l => l.id === (form.hospital_id || form.location_id))?.name || "Hospital"}
                                            </span>
                                        )}
                                    </div>
                                    <select
                                        id="select-supervisor"
                                        className="input-field"
                                        value={form.supervisor_id}
                                        onChange={e => setForm({ ...form, supervisor_id: e.target.value })}
                                        disabled={!form.hospital_id && !form.location_id}
                                    >
                                        <option value="">
                                            {(!form.hospital_id && !form.location_id)
                                                ? "Select a hospital first..."
                                                : "None"}
                                        </option>
                                        {initialUsers
                                            .filter(u => {
                                                if (form.id && u.id === form.id) return false;
                                                const isSuper = u.is_supervisor || (Array.isArray(u.roles) && u.roles.some(r => String(r).toLowerCase() === "supervisor"));
                                                if (!isSuper) return false;
                                                const curHosp = form.hospital_id || form.location_id;
                                                if (!curHosp) return false;
                                                const uHosp = u.hospital_id || u.location_id;
                                                return uHosp === curHosp;
                                            })
                                            .map(u => (
                                                <option key={u.id} value={u.id}>
                                                    {u.name} ({u.email || u.eid || 'Supervisor'})
                                                </option>
                                            ))
                                        }
                                    </select>
                                    {(!form.hospital_id && !form.location_id) && (
                                        <span style={{ fontSize: "0.75rem", color: "#ff9800", marginTop: "0.25rem", display: "block" }}>
                                            ⚠️ Select a hospital above to view supervisors in that hospital.
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Medical Registration */}
                        <div style={{ background: "rgba(0,0,0,0.2)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--panel-border)" }}>
                            <h4 style={{ margin: "0 0 1rem 0", color: "var(--primary-color)" }}>Medical Registration Details</h4>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                                <div>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Registration Number</label>
                                    <input className="input-field" placeholder="e.g. REG-123456" value={form.registration_number} onChange={e => setForm({ ...form, registration_number: e.target.value })} disabled={form.registration_number === "Loading..."} />
                                </div>
                                <div>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Medical Council Name</label>
                                    <input className="input-field" placeholder="e.g. National Medical Council" value={form.council_name} onChange={e => setForm({ ...form, council_name: e.target.value })} disabled={form.council_name === "Loading..."} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Form Footer */}
                    <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", justifyContent: "flex-end" }}>
                        <button className="btn-secondary" onClick={() => setShowEditor(false)} disabled={isSaving}>
                            Cancel
                        </button>
                        <button id="btn-save-user" className="btn-primary" onClick={handleSaveUser} disabled={isSaving} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {isSaving ? (
                                <>
                                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Saving...
                                </>
                            ) : (
                                <>
                                    <Check size={16} /> {isEditingExistingUser ? "Save User Changes" : "Create User"}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {filteredUsers.length === 0 ? (
                        <div className="glass-panel" style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
                            <Users size={40} color="var(--secondary-color)" style={{ margin: "0 auto 1rem", opacity: 0.5 }} />
                            <h4 style={{ color: "var(--text-primary)", marginBottom: "0.5rem" }}>No Practitioners Found</h4>
                            <p style={{ margin: 0, fontSize: "0.9rem" }}>
                                {searchTerm || selectedHospitalFilter !== "all"
                                    ? "No users match the search filter. Try clearing your filters."
                                    : "No users exist yet. Click 'New User' to register the first practitioner."}
                            </p>
                        </div>
                    ) : viewMode === "grouped" ? (
                        <>
                            {/* Hospital Groups */}
                            {hospitalSections.hospitals.map((hosp) => {
                                const isCollapsed = !!collapsedHospitals[hosp.id];
                                return (
                                    <section key={hosp.id} className="slide-up glass-panel" style={{ padding: 0, overflow: "hidden", border: "1px solid var(--panel-border)" }}>
                                        {/* Hospital Card Header Banner */}
                                        <div
                                            style={{
                                                padding: "1rem 1.5rem",
                                                background: "rgba(0,0,0,0.35)",
                                                borderBottom: isCollapsed ? "none" : "1px solid var(--panel-border)",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                cursor: "pointer",
                                                userSelect: "none"
                                            }}
                                            onClick={() => toggleCollapse(hosp.id)}
                                        >
                                            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                                <div style={{
                                                    width: "40px", height: "40px", borderRadius: "10px",
                                                    background: "rgba(102, 252, 241, 0.12)", border: "1px solid rgba(102, 252, 241, 0.25)",
                                                    display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary-color)"
                                                }}>
                                                    <Building2 size={20} />
                                                </div>
                                                <div>
                                                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                                                        <h3 style={{ margin: 0, fontSize: "1.15rem", color: "var(--text-primary)" }}>{hosp.name}</h3>
                                                        <span style={{
                                                            background: hosp.users.length > 0 ? "rgba(102, 252, 241, 0.1)" : "rgba(255,255,255,0.05)",
                                                            color: hosp.users.length > 0 ? "var(--primary-color)" : "var(--text-secondary)",
                                                            padding: "0.15rem 0.55rem", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600,
                                                            border: "1px solid rgba(255,255,255,0.08)"
                                                        }}>
                                                            {hosp.users.length} {hosp.users.length === 1 ? "Practitioner" : "Practitioners"}
                                                        </span>
                                                    </div>
                                                    {(hosp.city || hosp.address) && (
                                                        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: "var(--text-secondary)", fontSize: "0.82rem", marginTop: "0.2rem" }}>
                                                            <MapPin size={13} color="var(--secondary-color)" />
                                                            <span>{[hosp.address, hosp.city].filter(Boolean).join(", ")}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }} onClick={e => e.stopPropagation()}>
                                                <button
                                                    className="btn-secondary"
                                                    onClick={() => openNewUserForm(hosp.id)}
                                                    style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem", display: "flex", alignItems: "center", gap: "0.35rem" }}
                                                    title={`Add practitioner to ${hosp.name}`}
                                                >
                                                    <Plus size={14} /> Add User
                                                </button>
                                                <button
                                                    onClick={() => toggleCollapse(hosp.id)}
                                                    style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", padding: "0.25rem" }}
                                                    aria-label="Toggle section"
                                                >
                                                    {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Hospital Practitioners Table */}
                                        {!isCollapsed && (
                                            <div style={{ overflowX: "auto" }}>
                                                <table suppressHydrationWarning style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                                                    <thead suppressHydrationWarning>
                                                        <tr suppressHydrationWarning style={{ borderBottom: "1px solid var(--panel-border)", background: "rgba(0,0,0,0.18)" }}>
                                                            <th style={{ padding: "0.85rem 1.25rem", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>Practitioner</th>
                                                            <th style={{ padding: "0.85rem 1.25rem", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>Employee ID</th>
                                                            <th style={{ padding: "0.85rem 1.25rem", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>System Role</th>
                                                            <th style={{ padding: "0.85rem 1.25rem", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>Department / Spec</th>
                                                            <th style={{ padding: "0.85rem 1.25rem", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>Supervisor</th>
                                                            <th style={{ padding: "0.85rem 1.25rem", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>Email</th>
                                                            <th style={{ padding: "0.85rem 1.25rem", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>Status</th>
                                                            <th style={{ padding: "0.85rem 1.25rem", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "right" }}>Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {hosp.users.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={8} style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                                                                    No practitioners currently assigned to {hosp.name}.
                                                                    <button
                                                                        onClick={() => openNewUserForm(hosp.id)}
                                                                        style={{ marginLeft: "0.5rem", background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", textDecoration: "underline" }}
                                                                    >
                                                                        Add one now
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ) : (
                                                            hosp.users.map((u, i) => {
                                                                const roleInfo = getUserRoleInfo(u);
                                                                const dept = getDeptName(u.department_id);
                                                                const spec = getSpecName(u.specialization_id);
                                                                const supInfo = getSupervisorInfo(u);
                                                                const isUserSupervisor = u.is_supervisor || (Array.isArray(u.roles) && u.roles.some(r => String(r).toLowerCase() === "supervisor"));
                                                                return (
                                                                    <tr key={u.id || i} className="clickable-row" style={{ borderBottom: "1px solid var(--panel-border)", transition: "background 0.2s ease" }}>
                                                                        <td style={{ padding: "1rem 1.25rem" }}>
                                                                            <div onClick={() => openViewer(u)} style={{ fontWeight: 600, color: "var(--primary-color)", cursor: "pointer", transition: "all 0.2s ease", display: "inline-block" }} className="hover-underline">{u.name}</div>
                                                                            {u.phone && <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>{u.phone}</div>}
                                                                        </td>
                                                                        <td style={{ padding: "1rem 1.25rem", color: "var(--primary-color)", fontFamily: "monospace", fontSize: "0.9rem" }}>
                                                                            {u.eid ? (
                                                                                <span style={{ background: "rgba(102, 252, 241, 0.08)", padding: "0.2rem 0.5rem", borderRadius: "4px", border: "1px solid rgba(102, 252, 241, 0.2)" }}>
                                                                                    {u.eid}
                                                                                </span>
                                                                            ) : (
                                                                                <span style={{ color: "var(--text-secondary)", opacity: 0.5 }}>Unassigned</span>
                                                                            )}
                                                                        </td>
                                                                        <td style={{ padding: "1rem 1.25rem" }}>
                                                                            <span style={{
                                                                                padding: "0.25rem 0.65rem",
                                                                                background: roleInfo.bg,
                                                                                color: roleInfo.color,
                                                                                border: roleInfo.border,
                                                                                borderRadius: "12px",
                                                                                fontSize: "0.8rem",
                                                                                fontWeight: 600,
                                                                                display: "inline-flex",
                                                                                alignItems: "center",
                                                                                gap: "0.3rem"
                                                                            }}>
                                                                                <Shield size={12} /> {roleInfo.label}
                                                                            </span>
                                                                        </td>
                                                                        <td style={{ padding: "1rem 1.25rem" }}>
                                                                            <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                                                                                {dept && <span style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>{dept}</span>}
                                                                                {spec && <span style={{ fontSize: "0.75rem", color: "var(--secondary-color)" }}>{spec}</span>}
                                                                                {!dept && !spec && <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", opacity: 0.5 }}>—</span>}
                                                                            </div>
                                                                        </td>
                                                                        <td style={{ padding: "1rem 1.25rem" }}>
                                                                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                                                                                {supInfo ? (
                                                                                    <span style={{
                                                                                        fontSize: "0.85rem",
                                                                                        color: "var(--text-primary)",
                                                                                        fontWeight: 500,
                                                                                        display: "inline-flex",
                                                                                        alignItems: "center",
                                                                                        gap: "4px"
                                                                                    }}>
                                                                                        👤 {supInfo.name}
                                                                                    </span>
                                                                                ) : (
                                                                                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", opacity: 0.5 }}>
                                                                                        {isUserSupervisor ? "— (Supervisor)" : "Unassigned"}
                                                                                    </span>
                                                                                )}
                                                                                <button
                                                                                    onClick={() => openSupervisorModal(u)}
                                                                                    style={{
                                                                                        padding: "0.25rem 0.55rem",
                                                                                        borderRadius: "6px",
                                                                                        border: "1px solid rgba(102, 252, 241, 0.3)",
                                                                                        background: "rgba(102, 252, 241, 0.08)",
                                                                                        color: "var(--primary-color)",
                                                                                        fontSize: "0.75rem",
                                                                                        fontWeight: 600,
                                                                                        cursor: "pointer",
                                                                                        display: "inline-flex",
                                                                                        alignItems: "center",
                                                                                        gap: "3px",
                                                                                        transition: "all 0.2s ease"
                                                                                    }}
                                                                                    title="Assign or Change Supervisor"
                                                                                >
                                                                                    {supInfo ? "Change" : "+ Assign"}
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                        <td style={{ padding: "1rem 1.25rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>{u.email}</td>
                                                                        <td style={{ padding: "1rem 1.25rem" }}>
                                                                            <span style={{
                                                                                padding: "0.25rem 0.75rem",
                                                                                background: u.status === "active" ? "rgba(105, 240, 174, 0.1)" : "rgba(255, 152, 0, 0.1)",
                                                                                color: u.status === "active" ? "var(--success)" : "#ff9800",
                                                                                borderRadius: "12px",
                                                                                fontSize: "0.8rem",
                                                                                textTransform: "capitalize"
                                                                            }}>
                                                                                {u.status || "Active"}
                                                                            </span>
                                                                        </td>
                                                                        <td style={{ padding: "1rem 1.25rem", textAlign: "right" }}>
                                                                            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                                                                                <button onClick={() => openEditor(u)} disabled={isSaving || deletingId === u.id} style={{ color: "var(--primary-color)", background: "rgba(102, 252, 241, 0.1)", cursor: "pointer", padding: "0.5rem", borderRadius: "8px", border: "none", display: "flex" }} title="Edit User">
                                                                                    <Edit2 size={16} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => handleDelete(u)}
                                                                                    disabled={deletingId === u.id || isSaving}
                                                                                    style={{
                                                                                        color: "var(--error)",
                                                                                        background: "rgba(255, 82, 82, 0.1)",
                                                                                        cursor: deletingId === u.id ? "not-allowed" : "pointer",
                                                                                        padding: "0.5rem",
                                                                                        borderRadius: "8px",
                                                                                        border: "none",
                                                                                        display: "flex",
                                                                                        opacity: deletingId === u.id ? 0.6 : 1
                                                                                    }}
                                                                                    title="Delete User"
                                                                                >
                                                                                    {deletingId === u.id ? (
                                                                                        <Loader2 size={16} style={{ animation: "spin 1s linear infinite", color: "var(--error)" }} />
                                                                                    ) : (
                                                                                        <Trash2 size={16} />
                                                                                    )}
                                                                                </button>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </section>
                                );
                            })}

                            {/* Unassigned Hospital Section (if any) */}
                            {hospitalSections.unassigned.length > 0 && (
                                <section className="slide-up glass-panel" style={{ padding: 0, overflow: "hidden", border: "1px solid rgba(255, 152, 0, 0.3)" }}>
                                    <div
                                        style={{
                                            padding: "1rem 1.5rem",
                                            background: "rgba(255, 152, 0, 0.08)",
                                            borderBottom: collapsedHospitals["unassigned"] ? "none" : "1px solid rgba(255, 152, 0, 0.2)",
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            cursor: "pointer",
                                            userSelect: "none"
                                        }}
                                        onClick={() => toggleCollapse("unassigned")}
                                    >
                                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                                            <div style={{
                                                width: "40px", height: "40px", borderRadius: "10px",
                                                background: "rgba(255, 152, 0, 0.15)", border: "1px solid rgba(255, 152, 0, 0.4)",
                                                display: "flex", alignItems: "center", justifyContent: "center", color: "#ff9800"
                                            }}>
                                                <AlertTriangle size={20} />
                                            </div>
                                            <div>
                                                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                                    <h3 style={{ margin: 0, fontSize: "1.15rem", color: "#ff9800" }}>Unassigned Hospital</h3>
                                                    <span style={{
                                                        background: "rgba(255, 152, 0, 0.15)", color: "#ff9800",
                                                        padding: "0.15rem 0.55rem", borderRadius: "12px", fontSize: "0.75rem", fontWeight: 600,
                                                        border: "1px solid rgba(255, 152, 0, 0.3)"
                                                    }}>
                                                        {hospitalSections.unassigned.length} {hospitalSections.unassigned.length === 1 ? "Practitioner" : "Practitioners"}
                                                    </span>
                                                </div>
                                                <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                                                    Practitioners without an assigned hospital facility
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => toggleCollapse("unassigned")}
                                            style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", padding: "0.25rem" }}
                                            aria-label="Toggle section"
                                        >
                                            {collapsedHospitals["unassigned"] ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                                        </button>
                                    </div>

                                    {!collapsedHospitals["unassigned"] && (
                                        <div style={{ overflowX: "auto" }}>
                                            <table suppressHydrationWarning style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                                                <thead suppressHydrationWarning>
                                                    <tr suppressHydrationWarning style={{ borderBottom: "1px solid var(--panel-border)", background: "rgba(0,0,0,0.18)" }}>
                                                        <th style={{ padding: "0.85rem 1.25rem", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>Practitioner</th>
                                                        <th style={{ padding: "0.85rem 1.25rem", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>Employee ID</th>
                                                        <th style={{ padding: "0.85rem 1.25rem", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>System Role</th>
                                                        <th style={{ padding: "0.85rem 1.25rem", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>Department / Spec</th>
                                                        <th style={{ padding: "0.85rem 1.25rem", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>Supervisor</th>
                                                        <th style={{ padding: "0.85rem 1.25rem", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>Email</th>
                                                        <th style={{ padding: "0.85rem 1.25rem", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>Status</th>
                                                        <th style={{ padding: "0.85rem 1.25rem", fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)", textAlign: "right" }}>Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {hospitalSections.unassigned.map((u, i) => {
                                                        const roleInfo = getUserRoleInfo(u);
                                                        const dept = getDeptName(u.department_id);
                                                        const spec = getSpecName(u.specialization_id);
                                                        const supInfo = getSupervisorInfo(u);
                                                        const isUserSupervisor = u.is_supervisor || (Array.isArray(u.roles) && u.roles.some(r => String(r).toLowerCase() === "supervisor"));
                                                        return (
                                                            <tr key={u.id || i} className="clickable-row" style={{ borderBottom: "1px solid var(--panel-border)", transition: "background 0.2s ease" }}>
                                                                <td style={{ padding: "1rem 1.25rem" }}>
                                                                    <div onClick={() => openViewer(u)} style={{ fontWeight: 600, color: "var(--primary-color)", cursor: "pointer", transition: "all 0.2s ease", display: "inline-block" }} className="hover-underline">{u.name}</div>
                                                                    {u.phone && <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>{u.phone}</div>}
                                                                </td>
                                                                <td style={{ padding: "1rem 1.25rem", color: "var(--primary-color)", fontFamily: "monospace", fontSize: "0.9rem" }}>{u.eid || "Not Assigned"}</td>
                                                                <td style={{ padding: "1rem 1.25rem" }}>
                                                                    <span style={{
                                                                        padding: "0.25rem 0.65rem",
                                                                        background: roleInfo.bg,
                                                                        color: roleInfo.color,
                                                                        border: roleInfo.border,
                                                                        borderRadius: "12px",
                                                                        fontSize: "0.8rem",
                                                                        fontWeight: 600,
                                                                        display: "inline-flex",
                                                                        alignItems: "center",
                                                                        gap: "0.3rem"
                                                                    }}>
                                                                        <Shield size={12} /> {roleInfo.label}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: "1rem 1.25rem" }}>
                                                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                                                                        {dept && <span style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>{dept}</span>}
                                                                        {spec && <span style={{ fontSize: "0.75rem", color: "var(--secondary-color)" }}>{spec}</span>}
                                                                        {!dept && !spec && <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", opacity: 0.5 }}>—</span>}
                                                                    </div>
                                                                </td>
                                                                <td style={{ padding: "1rem 1.25rem" }}>
                                                                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                                                                        {supInfo ? (
                                                                            <span style={{
                                                                                fontSize: "0.85rem",
                                                                                color: "var(--text-primary)",
                                                                                fontWeight: 500,
                                                                                display: "inline-flex",
                                                                                alignItems: "center",
                                                                                gap: "4px"
                                                                            }}>
                                                                                👤 {supInfo.name}
                                                                            </span>
                                                                        ) : (
                                                                            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", opacity: 0.5 }}>
                                                                                {isUserSupervisor ? "— (Supervisor)" : "Unassigned"}
                                                                            </span>
                                                                        )}
                                                                        <button
                                                                            onClick={() => openSupervisorModal(u)}
                                                                            style={{
                                                                                padding: "0.25rem 0.55rem",
                                                                                borderRadius: "6px",
                                                                                border: "1px solid rgba(102, 252, 241, 0.3)",
                                                                                background: "rgba(102, 252, 241, 0.08)",
                                                                                color: "var(--primary-color)",
                                                                                fontSize: "0.75rem",
                                                                                fontWeight: 600,
                                                                                cursor: "pointer",
                                                                                display: "inline-flex",
                                                                                alignItems: "center",
                                                                                gap: "3px",
                                                                                transition: "all 0.2s ease"
                                                                            }}
                                                                            title="Assign or Change Supervisor"
                                                                        >
                                                                            {supInfo ? "Change" : "+ Assign"}
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                                <td style={{ padding: "1rem 1.25rem", color: "var(--text-secondary)", fontSize: "0.9rem" }}>{u.email}</td>
                                                                <td style={{ padding: "1rem 1.25rem" }}>
                                                                    <span style={{
                                                                        padding: "0.25rem 0.75rem",
                                                                        background: u.status === "active" ? "rgba(105, 240, 174, 0.1)" : "rgba(255, 152, 0, 0.1)",
                                                                        color: u.status === "active" ? "var(--success)" : "#ff9800",
                                                                        borderRadius: "12px",
                                                                        fontSize: "0.8rem",
                                                                        textTransform: "capitalize"
                                                                    }}>
                                                                        {u.status || "Active"}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: "1rem 1.25rem", textAlign: "right" }}>
                                                                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                                                                        <button onClick={() => openEditor(u)} disabled={isSaving || deletingId === u.id} style={{ color: "var(--primary-color)", background: "rgba(102, 252, 241, 0.1)", cursor: "pointer", padding: "0.5rem", borderRadius: "8px", border: "none", display: "flex" }} title="Edit User">
                                                                            <Edit2 size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleDelete(u)}
                                                                            disabled={deletingId === u.id || isSaving}
                                                                            style={{
                                                                                color: "var(--error)",
                                                                                background: "rgba(255, 82, 82, 0.1)",
                                                                                cursor: deletingId === u.id ? "not-allowed" : "pointer",
                                                                                padding: "0.5rem",
                                                                                borderRadius: "8px",
                                                                                border: "none",
                                                                                display: "flex",
                                                                                opacity: deletingId === u.id ? 0.6 : 1
                                                                            }}
                                                                            title="Delete User"
                                                                        >
                                                                            {deletingId === u.id ? (
                                                                                <Loader2 size={16} style={{ animation: "spin 1s linear infinite", color: "var(--error)" }} />
                                                                            ) : (
                                                                                <Trash2 size={16} />
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </section>
                            )}
                        </>
                    ) : (
                        /* Flat List View */
                        <section className="slide-up glass-panel" style={{ padding: 0, overflow: "hidden" }}>
                            <div style={{ overflowX: "auto" }}>
                                <table suppressHydrationWarning style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                                    <thead suppressHydrationWarning>
                                        <tr suppressHydrationWarning style={{ borderBottom: "1px solid var(--panel-border)", background: "rgba(0,0,0,0.2)" }}>
                                            <th style={{ padding: "1rem 1.25rem", fontWeight: 600 }}>Practitioner</th>
                                            <th style={{ padding: "1rem 1.25rem", fontWeight: 600 }}>Employee ID</th>
                                            <th style={{ padding: "1rem 1.25rem", fontWeight: 600 }}>System Role</th>
                                            <th style={{ padding: "1rem 1.25rem", fontWeight: 600 }}>Hospital</th>
                                            <th style={{ padding: "1rem 1.25rem", fontWeight: 600 }}>Department / Spec</th>
                                            <th style={{ padding: "1rem 1.25rem", fontWeight: 600 }}>Supervisor</th>
                                            <th style={{ padding: "1rem 1.25rem", fontWeight: 600 }}>Email</th>
                                            <th style={{ padding: "1rem 1.25rem", fontWeight: 600 }}>Status</th>
                                            <th style={{ padding: "1rem 1.25rem", fontWeight: 600, textAlign: "right" }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredUsers.map((u, i) => {
                                            const roleInfo = getUserRoleInfo(u);
                                            const dept = getDeptName(u.department_id);
                                            const spec = getSpecName(u.specialization_id);
                                            const hosp = getHospitalName(u.hospital_id || u.location_id);
                                            const supInfo = getSupervisorInfo(u);
                                            const isUserSupervisor = u.is_supervisor || (Array.isArray(u.roles) && u.roles.some(r => String(r).toLowerCase() === "supervisor"));
                                            return (
                                                <tr key={u.id || i} className="clickable-row" style={{ borderBottom: "1px solid var(--panel-border)", transition: "background 0.2s ease" }}>
                                                    <td style={{ padding: "1rem 1.25rem" }}>
                                                        <div onClick={() => openViewer(u)} style={{ fontWeight: 600, color: "var(--primary-color)", cursor: "pointer", transition: "all 0.2s ease", display: "inline-block" }} className="hover-underline">{u.name}</div>
                                                        {u.phone && <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>{u.phone}</div>}
                                                    </td>
                                                    <td style={{ padding: "1rem 1.25rem", color: "var(--primary-color)", fontFamily: "monospace" }}>{u.eid || "Not Assigned"}</td>
                                                    <td style={{ padding: "1rem 1.25rem" }}>
                                                        <span style={{
                                                            padding: "0.25rem 0.65rem",
                                                            background: roleInfo.bg,
                                                            color: roleInfo.color,
                                                            border: roleInfo.border,
                                                            borderRadius: "12px",
                                                            fontSize: "0.8rem",
                                                            fontWeight: 600,
                                                            display: "inline-flex",
                                                            alignItems: "center",
                                                            gap: "0.3rem"
                                                        }}>
                                                            <Shield size={12} /> {roleInfo.label}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: "1rem 1.25rem" }}>
                                                        <span style={{
                                                            padding: "0.2rem 0.6rem",
                                                            background: (u.hospital_id || u.location_id) ? "rgba(102, 252, 241, 0.08)" : "rgba(255,255,255,0.04)",
                                                            color: (u.hospital_id || u.location_id) ? "var(--primary-color)" : "var(--text-secondary)",
                                                            borderRadius: "6px",
                                                            fontSize: "0.82rem",
                                                            border: "1px solid rgba(255,255,255,0.08)"
                                                        }}>
                                                            🏥 {hosp}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: "1rem 1.25rem" }}>
                                                        <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                                                            {dept && <span style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>{dept}</span>}
                                                            {spec && <span style={{ fontSize: "0.75rem", color: "var(--secondary-color)" }}>{spec}</span>}
                                                            {!dept && !spec && <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", opacity: 0.5 }}>—</span>}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: "1rem 1.25rem" }}>
                                                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                                                            {supInfo ? (
                                                                <span style={{
                                                                    fontSize: "0.85rem",
                                                                    color: "var(--text-primary)",
                                                                    fontWeight: 500,
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    gap: "4px"
                                                                }}>
                                                                    👤 {supInfo.name}
                                                                </span>
                                                            ) : (
                                                                <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", opacity: 0.5 }}>
                                                                    {isUserSupervisor ? "— (Supervisor)" : "Unassigned"}
                                                                </span>
                                                            )}
                                                            <button
                                                                onClick={() => openSupervisorModal(u)}
                                                                style={{
                                                                    padding: "0.25rem 0.55rem",
                                                                    borderRadius: "6px",
                                                                    border: "1px solid rgba(102, 252, 241, 0.3)",
                                                                    background: "rgba(102, 252, 241, 0.08)",
                                                                    color: "var(--primary-color)",
                                                                    fontSize: "0.75rem",
                                                                    fontWeight: 600,
                                                                    cursor: "pointer",
                                                                    display: "inline-flex",
                                                                    alignItems: "center",
                                                                    gap: "3px",
                                                                    transition: "all 0.2s ease"
                                                                }}
                                                                title="Assign or Change Supervisor"
                                                            >
                                                                {supInfo ? "Change" : "+ Assign"}
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: "1rem 1.25rem", color: "var(--text-secondary)" }}>{u.email}</td>
                                                    <td style={{ padding: "1rem 1.25rem" }}>
                                                        <span style={{
                                                            padding: "0.25rem 0.75rem",
                                                            background: u.status === "active" ? "rgba(105, 240, 174, 0.1)" : "rgba(255, 152, 0, 0.1)",
                                                            color: u.status === "active" ? "var(--success)" : "#ff9800",
                                                            borderRadius: "12px",
                                                            fontSize: "0.85rem",
                                                            textTransform: "capitalize"
                                                        }}>
                                                            {u.status || "Active"}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: "1rem 1.25rem", textAlign: "right" }}>
                                                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                                                            <button onClick={() => openEditor(u)} disabled={isSaving || deletingId === u.id} style={{ color: "var(--primary-color)", background: "rgba(102, 252, 241, 0.1)", cursor: "pointer", padding: "0.5rem", borderRadius: "8px", border: "none", display: "flex" }}>
                                                                <Edit2 size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(u)}
                                                                disabled={deletingId === u.id || isSaving}
                                                                style={{
                                                                    color: "var(--error)",
                                                                    background: "rgba(255, 82, 82, 0.1)",
                                                                    cursor: deletingId === u.id ? "not-allowed" : "pointer",
                                                                    padding: "0.5rem",
                                                                    borderRadius: "8px",
                                                                    border: "none",
                                                                    display: "flex",
                                                                    opacity: deletingId === u.id ? 0.6 : 1
                                                                }}
                                                                title="Delete User"
                                                            >
                                                                {deletingId === u.id ? (
                                                                    <Loader2 size={16} style={{ animation: "spin 1s linear infinite", color: "var(--error)" }} />
                                                                ) : (
                                                                    <Trash2 size={16} />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </div>
            )}
        </>
    );
}
