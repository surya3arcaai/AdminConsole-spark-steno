"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    createUserAction, updateUserAction, deleteUserAction, generateEidAction,
    assignEidAction, getRegistrationAction, setRegistrationAction,
    getSupervisorAction, assignSupervisorAction,
    createDepartmentAction, createLocationAction, createSpecializationAction,
    updateDemographicsAction
} from "@/app/actions/user_actions";
import { assignRoleAction, getUserRolesAction } from "@/app/actions/role_actions";
import { assignUserTemplatesAction, getUserTemplatesAction } from "@/app/actions/template_actions";
import AudioRecorder from "@/components/AudioRecorder";
import { Loader2, Plus, X, User, Edit2, Trash2, Key, ChevronRight, ChevronLeft, Check, FileText, Mic, ExternalLink, Shield, AlertTriangle, CheckCircle2 } from "lucide-react";

const WIZARD_STORAGE_KEY = "arca_user_wizard_state";

export default function UserManager({ initialUsers = [], demographics = {}, templates = {}, activeStep = 1 }) {
    const router = useRouter();

    const defaultForm = {
        id: null,
        name: "", email: "", phone: "", password: "", status: "pending", system_role: "", eid: "",
        department_id: "", location_id: "", specialization_id: "",
        registration_number: "", council_name: "", supervisor_id: "",
        selected_clinical_templates: [],
        selected_discharge_templates: [],
    };

    const [showEditor, setShowEditor] = useState(activeStep > 1);
    const [wizardStep, setWizardStep] = useState(activeStep);
    const [viewingUser, setViewingUser] = useState(null);
    const [form, setForm] = useState(defaultForm);
    const [isEditingExistingUser, setIsEditingExistingUser] = useState(false);

    const [isSaving, setIsSaving] = useState(false);
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [userToDelete, setUserToDelete] = useState(null);
    const [isSubSubmitting, setIsSubSubmitting] = useState(false);

    const [localDepts, setLocalDepts] = useState(demographics.departments || []);
    const [localLocs, setLocalLocs] = useState(demographics.locations || []);
    const [localSpecs, setLocalSpecs] = useState(demographics.specializations || []);

    const [addingType, setAddingType] = useState(null);
    const [subForm, setSubForm] = useState({});

    const [localClinical, setLocalClinical] = useState(templates.clinical || []);
    const [localDischarge, setLocalDischarge] = useState(templates.discharge || []);

    // Restore wizard state from sessionStorage on mount
    useEffect(() => {
        try {
            const saved = sessionStorage.getItem(WIZARD_STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.form) setForm(parsed.form);
                if (parsed.isEditingExistingUser !== undefined) setIsEditingExistingUser(parsed.isEditingExistingUser);
                if (activeStep > 1) {
                    setWizardStep(activeStep);
                    setShowEditor(true);
                } else if (parsed.showEditor) {
                    setWizardStep(parsed.wizardStep || 1);
                    setShowEditor(true);
                }
            }
        } catch (e) { /* ignore parse errors */ }
    }, [activeStep]);

    // Update local templates when props change (after returning from /templates)
    useEffect(() => {
        setLocalClinical(templates.clinical || []);
        setLocalDischarge(templates.discharge || []);
    }, [JSON.stringify(templates)]);

    const saveWizardAndRedirect = () => {
        sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({
            form,
            wizardStep
        }));
        router.push("/templates");
    };

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
                    alert(`Failed to create department: ${res?.detail || res?.error || "Department might already exist or server error."}`);
                }
            } else if (addingType === "location") {
                if (!subForm.name || !subForm.name.trim()) return alert("Location Name is required");
                const res = await createLocationAction({
                    name: subForm.name.trim(),
                    city: subForm.city ? subForm.city.trim() : undefined,
                    address: subForm.address ? subForm.address.trim() : undefined
                });
                if (res?.id) {
                    setLocalLocs(prev => [...prev, res]);
                    setForm(f => ({ ...f, location_id: res.id }));
                    setAddingType(null);
                } else {
                    alert(`Failed to create location: ${res?.detail || res?.error || "Location might already exist or server error."}`);
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
                    alert(`Failed to create specialization: ${res?.detail || res?.error || "Specialization might already exist or server error."}`);
                }
            }
        } catch (e) {
            alert("Failed to add " + addingType);
        } finally {
            setIsSubSubmitting(false);
        }
    };

    const handleAddDept = () => openAddPanel("department");
    const handleAddLoc = () => openAddPanel("location");
    const handleAddSpec = () => openAddPanel("specialization");

    const openCreator = () => {
        setIsEditingExistingUser(false);
        setForm({
            id: null, name: "", email: "", phone: "", password: "", status: "pending", system_role: "", eid: "",
            department_id: "", location_id: "", specialization_id: "",
            registration_number: "", council_name: "", supervisor_id: "",
            selected_clinical_templates: [],
            selected_discharge_templates: [],
        });
        setWizardStep(1);
        setShowEditor(true);
    };

    const openEditor = async (user) => {
        setIsEditingExistingUser(true);
        setForm({
            id: user.id || null,
            name: user.name || "",
            email: user.email || "",
            phone: user.phone || "",
            status: user.status || "pending",
            system_role: "Loading...",
            eid: user.eid || "",
            department_id: user.department_id || "",
            location_id: user.location_id || "",
            specialization_id: user.specialization_id || "",
            registration_number: "Loading...",
            council_name: "Loading...",
            supervisor_id: "",
            selected_clinical_templates: [],
            selected_discharge_templates: [],
        });
        setWizardStep(1);
        setShowEditor(true);

        try {
            const regData = await getRegistrationAction(user.id);
            const supData = await getSupervisorAction(user.id);
            const rolesData = await getUserRolesAction(user.id);
            const activeRole = rolesData && rolesData.length > 0 ? rolesData[0].name.toLowerCase() : "";

            const userTemplates = await getUserTemplatesAction(user.id) || [];
            const clinicalIds = Array.isArray(userTemplates) ? userTemplates.filter(t => t.type === 'clinical').map(t => t.id) : [];
            const dischargeIds = Array.isArray(userTemplates) ? userTemplates.filter(t => t.type === 'discharge').map(t => t.id) : [];

            setForm(prev => ({
                ...prev,
                registration_number: regData?.registration_number || "",
                council_name: regData?.council_name || "",
                supervisor_id: supData?.supervisor_id || "",
                system_role: activeRole,
                selected_clinical_templates: clinicalIds,
                selected_discharge_templates: dischargeIds
            }));
        } catch (e) {
            setForm(prev => ({
                ...prev,
                registration_number: "",
                council_name: "",
                system_role: ""
            }));
        }
    };

    const openViewer = async (user) => {
        setViewingUser({ ...user, registration_number: "Loading...", council_name: "Loading...", supervisor_id: null, templates: null });
        try {
            const regData = await getRegistrationAction(user.id);
            const supData = await getSupervisorAction(user.id);
            const userTemplates = await getUserTemplatesAction(user.id) || [];
            setViewingUser(prev => ({
                ...prev,
                registration_number: regData?.registration_number || "None",
                council_name: regData?.council_name || "None",
                supervisor_id: supData?.supervisor_id || null,
                templates: Array.isArray(userTemplates) ? userTemplates : []
            }));
        } catch (e) {
            setViewingUser(prev => ({
                ...prev,
                registration_number: "None",
                council_name: "None",
                supervisor_id: null,
                templates: []
            }));
        }
    };

    const saveWizardState = (newForm, targetStep) => {
        try {
            sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify({
                form: newForm,
                wizardStep: targetStep,
                showEditor: true,
                isEditingExistingUser: isEditingExistingUser
            }));
        } catch (e) { }
    };

    const handleNextStep = async () => {
        if (wizardStep === 1) {
            if (!form.name.trim() || !form.email.trim()) {
                return alert("Name and Email are required.");
            }
            if (!form.id && !form.password.trim()) {
                return alert("Password is required for user registration.");
            }

            // Create user in DB/Keycloak immediately in Step 1 if creating new user
            if (!form.id) {
                setIsSaving(true);
                setIsCreatingUser(true);
                try {
                    const payload = {
                        name: form.name.trim(),
                        email: form.email.trim(),
                        password: form.password.trim(),
                        phone: form.phone.trim() || undefined,
                        status: form.status,
                        department_id: form.department_id || undefined,
                        location_id: form.location_id || undefined,
                        specialization_id: form.specialization_id || undefined
                    };
                    const savedUser = await createUserAction(payload);
                    if (!savedUser || savedUser.error || savedUser.detail || !savedUser.id) {
                        const errMsg = savedUser?.detail || savedUser?.error || "User creation failed. Please check inputs.";
                        alert(`Registration Failed: ${errMsg}`);
                        return;
                    }

                    const targetId = savedUser.id;

                    if (form.eid.trim()) {
                        await assignEidAction(targetId, form.eid.trim());
                    }
                    if (form.registration_number.trim() && form.council_name.trim()) {
                        await setRegistrationAction(targetId, {
                            registration_number: form.registration_number.trim(),
                            council_name: form.council_name.trim()
                        }, false);
                    }
                    if (form.supervisor_id) {
                        await assignSupervisorAction(targetId, form.supervisor_id, false);
                    }
                    if (form.system_role && form.system_role !== "Loading...") {
                        await assignRoleAction(targetId, form.system_role);
                    }

                    const updatedForm = { ...form, id: targetId };
                    setForm(updatedForm);
                    saveWizardState(updatedForm, 2);
                    setWizardStep(2);
                    setShowEditor(true);

                    setIsCreatingUser(false);
                    setIsSaving(false);

                    window.location.href = '/users/templates';
                    return;
                } catch (e) {
                    alert(`Error creating user account: ${e.message || e}`);
                    return;
                } finally {
                    setIsSaving(false);
                    setIsCreatingUser(false);
                }
            } else {
                saveWizardState(form, 2);
                router.push('/users/templates');
                return;
            }
        }
        if (wizardStep === 2) {
            if (form.id) {
                setIsSaving(true);
                try {
                    const selectedTemplates = [...form.selected_clinical_templates, ...form.selected_discharge_templates];
                    await assignUserTemplatesAction(form.id, selectedTemplates);
                } catch (e) {
                    console.error("Failed to save template assignments:", e);
                } finally {
                    setIsSaving(false);
                }
            }
            saveWizardState(form, 3);
            window.location.href = '/users/audio';
            return;
        }
    };

    const handlePrevStep = () => {
        if (wizardStep === 2) {
            saveWizardState(form, 1);
            window.location.href = '/users';
            return;
        }
        if (wizardStep === 3) {
            saveWizardState(form, 2);
            window.location.href = '/users/templates';
            return;
        }
    };

    const toggleTemplate = (type, templateId) => {
        const key = type === "clinical" ? "selected_clinical_templates" : "selected_discharge_templates";
        setForm(prev => {
            const current = prev[key];
            return {
                ...prev,
                [key]: current.includes(templateId)
                    ? current.filter(id => id !== templateId)
                    : [...current, templateId]
            };
        });
    };

    const handleFinalSave = async () => {
        setIsSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                email: form.email.trim(),
                phone: form.phone.trim() || undefined,
                password: form.password ? form.password.trim() : undefined,
                status: form.status,
                department_id: form.department_id || undefined,
                location_id: form.location_id || undefined,
                specialization_id: form.specialization_id || undefined
            };

            let savedUser = null;
            if (form.id) {
                savedUser = await updateUserAction(form.id, {
                    name: payload.name,
                    email: payload.email,
                    phone: payload.phone,
                    status: payload.status
                });
                await updateDemographicsAction(form.id, {
                    department_id: form.department_id || null,
                    location_id: form.location_id || null,
                    specialization_id: form.specialization_id || null
                });
            } else {
                savedUser = await createUserAction(payload);
                if (!savedUser || savedUser.error || savedUser.detail || !savedUser.id) {
                    const errMsg = savedUser?.detail || savedUser?.error || "User creation failed. Please check inputs or server connection.";
                    alert(`Registration Failed: ${errMsg}`);
                    setWizardStep(1);
                    return;
                }
            }

            const targetId = form.id || savedUser?.id;

            if (targetId) {
                if (form.eid.trim() || !form.id) {
                    const eidRes = await assignEidAction(targetId, form.eid.trim() || "");
                    if (eidRes?.detail || eidRes?.error) {
                        alert(`EID Assignment Failed: ${eidRes.detail || eidRes.error}`);
                        setWizardStep(1);
                        return;
                    }
                }
                if (form.registration_number.trim() && form.council_name.trim()) {
                    const regRes = await setRegistrationAction(targetId, {
                        registration_number: form.registration_number.trim(),
                        council_name: form.council_name.trim()
                    }, !!form.id);
                    if (regRes?.detail || regRes?.error) {
                        alert(`Medical Registration Failed: ${regRes.detail || regRes.error}`);
                        setWizardStep(1);
                        return;
                    }
                }
                if (form.supervisor_id) {
                    const supRes = await assignSupervisorAction(targetId, form.supervisor_id, !!form.id);
                    if (supRes?.detail || supRes?.error) {
                        alert(`Supervisor Assignment Failed: ${supRes.detail || supRes.error}`);
                        setWizardStep(1);
                        return;
                    }
                }
                if (form.system_role && form.system_role !== "Loading...") {
                    const roleRes = await assignRoleAction(targetId, form.system_role);
                    if (roleRes?.detail || roleRes?.error) {
                        alert(`Role Assignment Failed: ${roleRes.detail || roleRes.error}`);
                        setWizardStep(1);
                        return;
                    }
                }
                const selectedTemplates = [...form.selected_clinical_templates, ...form.selected_discharge_templates];
                await assignUserTemplatesAction(targetId, selectedTemplates);
            }

            sessionStorage.removeItem(WIZARD_STORAGE_KEY);
            setShowEditor(false);
            setWizardStep(1);
            window.location.href = '/users';
        } catch (e) {
            alert(`Error saving user: ${e.message || e}`);
        } finally {
            setIsSaving(false);
        }
    };

    const confirmDeleteUser = async () => {
        if (!userToDelete) return;
        const userId = userToDelete.id;
        setDeletingId(userId);
        try {
            await deleteUserAction(userId);
            setUserToDelete(null);
        } catch (e) {
            alert(`Delete Failed: ${e.message || e}`);
        } finally {
            setDeletingId(null);
        }
    };

    const handleDelete = (user) => {
        setUserToDelete(user);
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

    const stepLabels = ["User Details", "Template Selection", "Audio Samples"];
    const stepIcons = [<User size={16} key="s1" />, <FileText size={16} key="s2" />, <Mic size={16} key="s3" />];

    // =========== STEP RENDERERS ===========

    const renderStep1 = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Full Name *</label>
                    <input className="input-field" placeholder="Dr. John Doe" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Email Address *</label>
                    <input className="input-field" type="email" placeholder="john.doe@arca.local" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
                <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Phone Number</label>
                    <input className="input-field" placeholder="+1 555-0198" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                {!form.id && (
                    <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Password *</label>
                        <input className="input-field" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                    </div>
                )}
                <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Account Status</label>
                    <select className="input-field" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                    </select>
                </div>
                <div>
                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}><Shield size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }} /> System Role</label>
                    <select className="input-field" value={form.system_role} onChange={e => setForm({ ...form, system_role: e.target.value })} disabled={form.system_role === 'Loading...'}>
                        <option value="">No Role...</option>
                        <option value="doctor">Doctor</option>
                        <option value="admin">System Admin</option>
                        <option value="supervisor">Supervisor</option>
                    </select>
                </div>
            </div>

            <div style={{ background: "rgba(0,0,0,0.2)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--panel-border)" }}>
                <h4 style={{ margin: "0 0 1rem 0", color: "var(--primary-color)" }}>Employment & Demographics</h4>
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
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                            <label style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Department</label>
                            <button onClick={handleAddDept} type="button" style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", fontSize: "0.85rem", padding: 0 }}>+ Add</button>
                        </div>
                        <select className="input-field" value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
                            <option value="">Select Department...</option>
                            {localDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                            <label style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Location</label>
                            <button onClick={handleAddLoc} type="button" style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", fontSize: "0.85rem", padding: 0 }}>+ Add</button>
                        </div>
                        <select className="input-field" value={form.location_id} onChange={e => setForm({ ...form, location_id: e.target.value })}>
                            <option value="">Select Location...</option>
                            {localLocs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                            <label style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>Specialization</label>
                            <button onClick={handleAddSpec} type="button" style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", fontSize: "0.85rem", padding: 0 }}>+ Add</button>
                        </div>
                        <select className="input-field" value={form.specialization_id} onChange={e => setForm({ ...form, specialization_id: e.target.value })}>
                            <option value="">Select Specialization...</option>
                            {localSpecs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Reporting Supervisor</label>
                        <select className="input-field" value={form.supervisor_id} onChange={e => setForm({ ...form, supervisor_id: e.target.value })}>
                            <option value="">None</option>
                            {initialUsers.filter(u => u.id !== form.id).map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.eid || 'No EID'})</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

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
    );

    const renderStep2 = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
            <div style={{ background: "rgba(0,0,0,0.2)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--panel-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h4 style={{ margin: 0, color: "var(--primary-color)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <FileText size={18} /> Clinical Summary Templates
                    </h4>
                    <button onClick={saveWizardAndRedirect} type="button" style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", fontSize: "0.85rem", padding: 0, display: "flex", alignItems: "center", gap: "0.3rem" }}><ExternalLink size={13} /> Create in Templates</button>
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                    Select which clinical summary templates this user should have access to.
                </p>
                {localClinical.length === 0 ? (
                    <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-secondary)", background: "rgba(0,0,0,0.15)", borderRadius: "8px" }}>
                        No clinical templates available. Click &quot;+ Create Template&quot; to add one.
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                        {localClinical.map(t => {
                            const isSelected = form.selected_clinical_templates.includes(t.id);
                            return (
                                <div
                                    key={t.id}
                                    onClick={() => toggleTemplate("clinical", t.id)}
                                    style={{
                                        padding: "1rem",
                                        borderRadius: "10px",
                                        cursor: "pointer",
                                        border: isSelected ? "2px solid var(--primary-color)" : "1px solid var(--panel-border)",
                                        background: isSelected ? "rgba(102, 252, 241, 0.08)" : "rgba(0,0,0,0.15)",
                                        transition: "all 0.2s ease",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.75rem",
                                    }}
                                >
                                    <div style={{
                                        width: "24px", height: "24px", borderRadius: "6px",
                                        border: isSelected ? "2px solid var(--primary-color)" : "2px solid var(--panel-border)",
                                        background: isSelected ? "var(--primary-color)" : "transparent",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        flexShrink: 0, transition: "all 0.2s ease",
                                    }}>
                                        {isSelected && <Check size={14} color="var(--bg-primary)" />}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 500 }}>{t.name}</div>
                                        {t.description && <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>{t.description}</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div style={{ background: "rgba(0,0,0,0.2)", padding: "1.5rem", borderRadius: "12px", border: "1px solid var(--panel-border)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h4 style={{ margin: 0, color: "var(--primary-color)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <FileText size={18} /> Discharge Summary Templates
                    </h4>
                    <button onClick={saveWizardAndRedirect} type="button" style={{ background: "none", border: "none", color: "var(--primary-color)", cursor: "pointer", fontSize: "0.85rem", padding: 0, display: "flex", alignItems: "center", gap: "0.3rem" }}><ExternalLink size={13} /> Create in Templates</button>
                </div>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>
                    Select which discharge summary templates this user should have access to.
                </p>
                {localDischarge.length === 0 ? (
                    <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-secondary)", background: "rgba(0,0,0,0.15)", borderRadius: "8px" }}>
                        No discharge templates available. Click &quot;+ Create Template&quot; to add one.
                    </div>
                ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                        {localDischarge.map(t => {
                            const isSelected = form.selected_discharge_templates.includes(t.id);
                            return (
                                <div
                                    key={t.id}
                                    onClick={() => toggleTemplate("discharge", t.id)}
                                    style={{
                                        padding: "1rem",
                                        borderRadius: "10px",
                                        cursor: "pointer",
                                        border: isSelected ? "2px solid var(--primary-color)" : "1px solid var(--panel-border)",
                                        background: isSelected ? "rgba(102, 252, 241, 0.08)" : "rgba(0,0,0,0.15)",
                                        transition: "all 0.2s ease",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "0.75rem",
                                    }}
                                >
                                    <div style={{
                                        width: "24px", height: "24px", borderRadius: "6px",
                                        border: isSelected ? "2px solid var(--primary-color)" : "2px solid var(--panel-border)",
                                        background: isSelected ? "var(--primary-color)" : "transparent",
                                        display: "flex", alignItems: "center", justifyContent: "center",
                                        flexShrink: 0, transition: "all 0.2s ease",
                                    }}>
                                        {isSelected && <Check size={14} color="var(--bg-primary)" />}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 500 }}>{t.name}</div>
                                        {t.description && <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>{t.description}</div>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            <AudioRecorder userId={form.id} userName={form.name} />

            <div style={{ background: "rgba(102, 252, 241, 0.05)", padding: "1.5rem", borderRadius: "12px", border: "1px solid rgba(102, 252, 241, 0.2)" }}>
                <h4 style={{ margin: "0 0 1rem 0", color: "var(--primary-color)" }}>Summary</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", fontSize: "0.9rem" }}>
                    <div><strong>Name:</strong> {form.name}</div>
                    <div><strong>Email:</strong> {form.email}</div>
                    <div><strong>Status:</strong> <span style={{ textTransform: "capitalize" }}>{form.status}</span></div>
                    <div><strong>EID:</strong> {form.eid || "Auto-generate"}</div>
                    <div><strong>Clinical Templates:</strong> {form.selected_clinical_templates.length} selected</div>
                    <div><strong>Discharge Templates:</strong> {form.selected_discharge_templates.length} selected</div>
                </div>
            </div>
        </div>
    );

    return (
        <>
            <style>{`
                .clickable-row:hover { background: rgba(102, 252, 241, 0.05); }
                .hover-underline:hover { text-decoration: underline; }
                .step-dot { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.85rem; transition: all 0.3s ease; }
                .step-dot.active { background: var(--primary-color); color: var(--bg-primary); }
                .step-dot.completed { background: rgba(102,252,241,0.2); color: var(--primary-color); }
                .step-dot.inactive { background: rgba(255,255,255,0.05); color: var(--text-secondary); }
                .step-line { flex: 1; height: 2px; transition: background 0.3s ease; }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}</style>

            <header className="dashboard-header fade-in">
                <div>
                    <h1>User Onboarding</h1>
                    <p style={{ color: "var(--text-secondary)" }}>Manage medical staff profiles and registrations</p>
                </div>
                <button className="btn-primary" onClick={openCreator} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <Plus size={18} /> Add New User
                </button>
            </header>

            {/* Demographics Add Modal */}
            {addingType && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="glass-panel slide-up" style={{ width: "450px", padding: "2rem" }}>
                        <h3 style={{ marginTop: 0, textTransform: "capitalize", color: "var(--primary-color)" }}>Add New {addingType}</h3>
                        <div style={{ marginBottom: "1rem" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Name *</label>
                            <input className="input-field" autoFocus value={subForm.name || ""} onChange={e => setSubForm({ ...subForm, name: e.target.value })} />
                        </div>
                        {addingType === "department" && (
                            <>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Code (Optional)</label>
                                    <input className="input-field" placeholder="Auto-generated if empty" value={subForm.code || ""} onChange={e => setSubForm({ ...subForm, code: e.target.value })} />
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
                                    <input className="input-field" value={subForm.city || ""} onChange={e => setSubForm({ ...subForm, city: e.target.value })} />
                                </div>
                                <div style={{ marginBottom: "1rem" }}>
                                    <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.9rem", color: "var(--text-secondary)" }}>Address</label>
                                    <textarea className="input-field" rows={2} value={subForm.address || ""} onChange={e => setSubForm({ ...subForm, address: e.target.value })} />
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
                                ) : (
                                    "Save To Database"
                                )}
                            </button>
                            <button className="btn-secondary" onClick={() => setAddingType(null)} disabled={isSubSubmitting} style={{ flex: 1 }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* User Viewer Modal */}
            {viewingUser && (
                <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <div className="glass-panel slide-up" style={{ width: "500px", padding: "2rem", position: "relative" }}>
                        <button onClick={() => setViewingUser(null)} style={{ position: "absolute", top: "1rem", right: "1rem", background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer" }}>
                            <X size={24} />
                        </button>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                            <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: "rgba(102, 252, 241, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                <User size={30} color="var(--primary-color)" />
                            </div>
                            <div>
                                <h2 style={{ margin: 0, color: "var(--text-primary)" }}>{viewingUser.name}</h2>
                                <span style={{ color: "var(--primary-color)", fontFamily: "monospace", fontSize: "0.9rem" }}>{viewingUser.eid || "No EID Assigned"}</span>
                            </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
                            <div>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Email</label>
                                <div style={{ fontWeight: 500 }}>{viewingUser.email}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Phone</label>
                                <div style={{ fontWeight: 500 }}>{viewingUser.phone || "N/A"}</div>
                            </div>
                            <div>
                                <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Status</label>
                                <div style={{ fontWeight: 500, textTransform: "capitalize", color: viewingUser.status === 'active' ? 'var(--success)' : '#ff9800' }}>{viewingUser.status || "Active"}</div>
                            </div>
                        </div>
                        <div style={{ background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
                            <h4 style={{ margin: "0 0 0.8rem 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>Demographics</h4>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.8rem" }}>
                                <div><strong style={{ color: "var(--primary-color)" }}>Dept:</strong> {localDepts.find(d => d.id === viewingUser.department_id)?.name || "N/A"}</div>
                                <div><strong style={{ color: "var(--primary-color)" }}>Loc:</strong> {localLocs.find(l => l.id === viewingUser.location_id)?.name || "N/A"}</div>
                                <div><strong style={{ color: "var(--primary-color)" }}>Spec:</strong> {localSpecs.find(s => s.id === viewingUser.specialization_id)?.name || "N/A"}</div>
                                <div><strong style={{ color: "var(--primary-color)" }}>Manager:</strong> {initialUsers.find(u => u.id === viewingUser.supervisor_id)?.name || "None"}</div>
                            </div>
                        </div>
                        <div style={{ background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem" }}>
                            <h4 style={{ margin: "0 0 0.8rem 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>Medical Registration</h4>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "0.8rem" }}>
                                <div><strong style={{ color: "var(--primary-color)" }}>Reg #:</strong> {viewingUser.registration_number}</div>
                                <div><strong style={{ color: "var(--primary-color)" }}>Council:</strong> {viewingUser.council_name}</div>
                            </div>
                        </div>
                        <div style={{ background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px" }}>
                            <h4 style={{ margin: "0 0 0.8rem 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>Selected Templates</h4>
                            {viewingUser.templates === null ? (
                                <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem" }}>Loading templates...</div>
                            ) : viewingUser.templates && viewingUser.templates.length > 0 ? (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                                    {viewingUser.templates.map(t => (
                                        <span key={t.id || t.name} style={{ background: "rgba(102, 252, 241, 0.1)", color: "var(--primary-color)", padding: "0.25rem 0.6rem", borderRadius: "6px", fontSize: "0.85rem", border: "1px solid rgba(102, 252, 241, 0.3)", textTransform: "capitalize" }}>
                                            {t.name} ({t.type})
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontStyle: "italic" }}>No templates selected for this user.</div>
                            )}
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
                                ⚠️ Permanently removes account from Keycloak and PostgreSQL database.
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
                                    fontWeight: 600,
                                    cursor: deletingId === userToDelete.id ? "not-allowed" : "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    opacity: deletingId === userToDelete.id ? 0.7 : 1
                                }}
                            >
                                {deletingId === userToDelete.id ? (
                                    <>
                                        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Deleting...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={16} /> Delete Account
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Creating User Loading Modal */}
            {isCreatingUser && (
                <div style={{
                    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
                    background: "rgba(0,0,0,0.8)", backdropFilter: "blur(6px)", zIndex: 20000,
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
                            Creating User Account...
                        </h3>

                        <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", lineHeight: "1.5", margin: "0 0 1.5rem 0" }}>
                            Please wait while <strong style={{ color: "var(--text-primary)" }}>{form.name}</strong> is registered in Keycloak & PostgreSQL database...
                        </p>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", fontSize: "0.8rem", color: "var(--primary-color)" }}>
                            <CheckCircle2 size={16} /> Generating Employee ID & Database Record
                        </div>
                    </div>
                </div>
            )}

            {/* ========= WIZARD / EDITOR ========= */}
            {showEditor ? (
                <div className="glass-panel slide-up" style={{ animationDelay: "0.1s", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <User size={20} color="var(--primary-color)" />
                            {isEditingExistingUser ? "Edit User Profile" : "New User Onboarding"}
                        </h3>
                        <button onClick={() => { setShowEditor(false); setWizardStep(1); }} disabled={isSaving} style={{ color: "var(--text-secondary)", background: "none", cursor: "pointer", border: "none" }}>
                            <X size={24} />
                        </button>
                    </div>

                    {/* Stepper / Tabs (Available in both Edit and Create mode) */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0 1rem" }}>
                        {stepLabels.map((label, i) => {
                            const stepNum = i + 1;
                            const isActive = wizardStep === stepNum;
                            const isCompleted = wizardStep > stepNum;
                            return (
                                <React.Fragment key={i}>
                                    <div
                                        onClick={() => setWizardStep(stepNum)}
                                        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", cursor: "pointer" }}
                                    >
                                        <div className={`step-dot ${isActive ? 'active' : isCompleted ? 'completed' : 'inactive'}`}>
                                            {isCompleted ? <Check size={16} /> : stepIcons[i]}
                                        </div>
                                        <span style={{ fontSize: "0.75rem", color: isActive ? "var(--primary-color)" : "var(--text-secondary)", fontWeight: isActive ? 600 : 400, whiteSpace: "nowrap" }}>
                                            {label}
                                        </span>
                                    </div>
                                    {i < stepLabels.length - 1 && (
                                        <div className="step-line" style={{ background: isCompleted ? "var(--primary-color)" : "rgba(255,255,255,0.1)", marginBottom: "1.2rem" }} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {/* Step Content */}
                    {wizardStep === 1 && renderStep1()}
                    {wizardStep === 2 && renderStep2()}
                    {wizardStep === 3 && renderStep3()}

                    {/* Navigation Footer */}
                    <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", justifyContent: "space-between" }}>
                        <div>
                            {wizardStep > 1 && (
                                <button className="btn-secondary" onClick={() => setWizardStep(prev => prev - 1)} disabled={isSaving} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <ChevronLeft size={16} /> Back
                                </button>
                            )}
                        </div>
                        <div style={{ display: "flex", gap: "1rem" }}>
                            <button className="btn-secondary" onClick={() => { setShowEditor(false); setWizardStep(1); }} disabled={isSaving}>Cancel</button>
                            {wizardStep < 3 && (
                                <button className="btn-secondary" onClick={() => setWizardStep(prev => prev + 1)} disabled={isSaving} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    Next Step <ChevronRight size={16} />
                                </button>
                            )}
                            <button className="btn-primary" onClick={handleFinalSave} disabled={isSaving} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                {isSaving ? (
                                    <>
                                        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Saving Changes...
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} /> {isEditingExistingUser ? "Save User Changes" : "Create User & Save All"}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <section className="slide-up glass-panel" style={{ animationDelay: "0.2s", padding: 0, overflow: "hidden" }}>
                    {initialUsers.length === 0 ? (
                        <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
                            No users found. Create the first user profile!
                        </div>
                    ) : (
                        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                            <thead>
                                <tr style={{ borderBottom: "1px solid var(--panel-border)", background: "rgba(0,0,0,0.2)" }}>
                                    <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Name</th>
                                    <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Employee ID</th>
                                    <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Email</th>
                                    <th style={{ padding: "1rem 1.5rem", fontWeight: 600 }}>Status</th>
                                    <th style={{ padding: "1rem 1.5rem", fontWeight: 600, textAlign: "right" }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {initialUsers.map((u, i) => (
                                    <tr key={u.id || i} className="clickable-row" style={{ borderBottom: "1px solid var(--panel-border)", transition: "background 0.2s ease" }}>
                                        <td style={{ padding: "1rem 1.5rem" }}>
                                            <div onClick={() => openViewer(u)} style={{ fontWeight: 600, color: "var(--primary-color)", cursor: "pointer", transition: "all 0.2s ease", display: "inline-block" }} className="hover-underline">{u.name}</div>
                                            {u.phone && <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>{u.phone}</div>}
                                        </td>
                                        <td style={{ padding: "1rem 1.5rem", color: "var(--primary-color)", fontFamily: "monospace" }}>{u.eid || "Not Assigned"}</td>
                                        <td style={{ padding: "1rem 1.5rem", color: "var(--text-secondary)" }}>{u.email}</td>
                                        <td style={{ padding: "1rem 1.5rem" }}>
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
                                        <td style={{ padding: "1rem 1.5rem", textAlign: "right" }}>
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
                                ))}
                            </tbody>
                        </table>
                    )}
                </section>
            )}
        </>
    );
}
