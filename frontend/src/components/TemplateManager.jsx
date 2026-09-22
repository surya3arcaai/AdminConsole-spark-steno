"use client";
import React, { useState } from 'react';
import { createTemplateAction, updateTemplateAction, deleteTemplateAction } from '@/app/actions/template_actions';
import { Plus, X, ListOrdered, Trash2 } from 'lucide-react';

export default function TemplateManager({ initialClinical = [], initialDischarge = [], locations = [] }) {
    const [activeTab, setActiveTab] = useState('clinical');
    const [showEditor, setShowEditor] = useState(false);
    const [form, setForm] = useState({
        id: null,
        name: '',
        description: '',
        type: 'clinical',
        location_id: '',
        is_default: false,
        headers: []
    });

    const currentTemplates = activeTab === 'clinical' ? initialClinical : initialDischarge;

    const parseHeaders = (content) => {
        try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) return parsed;
        } catch (e) { }
        return [];
    };

    const handleAddHeader = () => {
        if (form.headers.length >= 10) {
            alert("Maximum of 10 headers allowed per template.");
            return;
        }
        setForm({ ...form, headers: [...form.headers, ""] });
    };

    const handleRemoveHeader = (index) => {
        const newHeaders = [...form.headers];
        newHeaders.splice(index, 1);
        setForm({ ...form, headers: newHeaders });
    };

    const openCreator = () => {
        setForm({
            id: null,
            name: `New ${activeTab === 'clinical' ? 'Clinical' : 'Discharge'} Template`,
            description: '',
            type: activeTab,
            location_id: '',
            is_default: false,
            headers: []
        });
        setShowEditor(true);
    };

    const openEditor = (t) => {
        setForm({
            id: t.id,
            name: t.name,
            description: t.description || '',
            type: t.type,
            location_id: t.location_id || '',
            is_default: !!t.is_default,
            headers: parseHeaders(t.content)
        });
        setShowEditor(true);
    };

    const changeTemplateType = (e) => {
        const typeVal = e.target.value;
        setForm({ ...form, type: typeVal, headers: [] });
    };

    const handleSave = async () => {
        if (!form.name.trim()) return alert("Template name is required.");
        const validHeaders = form.headers.map(h => h.trim()).filter(h => h !== '');
        if (validHeaders.length === 0) return alert("At least one header is required. Please specify headers.");

        const payload = {
            name: form.name.trim(),
            description: form.description || 'Configured Headers for Steno',
            content: JSON.stringify(validHeaders),
            variables_schema: { is_header_list: true },
            location_id: form.location_id || null,
            is_default: form.is_default
        };

        if (form.id && !form.id.startsWith('mock-')) {
            await updateTemplateAction(form.type, form.id, payload);
        } else {
            await createTemplateAction(form.type, payload);
        }

        setShowEditor(false);
    };

    const handleDelete = async (t) => {
        if (t.id.startsWith('mock-')) {
            alert("Cannot delete a mock view template. Please save a real template to your database.");
            return;
        }
        if (confirm(`Are you sure you want to delete the ${t.name} template?`)) {
            await deleteTemplateAction(t.type, t.id);
        }
    };

    return (
        <>
            <style>{`
        .clickable-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 252, 241, 0.15);
          border-color: rgba(102, 252, 241, 0.3);
        }
      `}</style>
            <header className="dashboard-header fade-in">
                <div>
                    <h1>Template Management</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Configure document headers and hospital scoping pulled by Arca Spark Steno</p>
                </div>
                <button className="btn-primary" onClick={openCreator}>+ Create Template Config</button>
            </header>

            {showEditor ? (
                <div className="glass-panel slide-up" style={{ animationDelay: '0.1s', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0 }}>{form.id ? 'Edit' : 'Create'} {form.type === 'clinical' ? 'Clinical' : 'Discharge'} Configuration</h3>
                        <button onClick={() => setShowEditor(false)} style={{ color: 'var(--text-secondary)', background: 'none', cursor: 'pointer', border: 'none' }}><X size={24} /></button>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <input className="input-field" placeholder="Template Name (e.g. Standard Consultation)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={{ flex: 2 }} />
                        <select className="input-field" value={form.type} onChange={changeTemplateType} style={{ flex: 1 }} disabled={!!form.id}>
                            <option value="clinical">Clinical Note</option>
                            <option value="discharge">Discharge Summary</option>
                        </select>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <select
                            className="input-field"
                            value={form.location_id}
                            onChange={(e) => setForm({ ...form, location_id: e.target.value })}
                            style={{ flex: 1 }}
                        >
                            <option value="">🌐 Common (All Hospitals / Facilities)</option>
                            {locations.map((loc) => (
                                <option key={loc.id} value={loc.id}>
                                    🏥 {loc.name} {loc.city ? `(${loc.city})` : ''}
                                </option>
                            ))}
                        </select>

                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.9rem', flex: 1 }}>
                            <input
                                type="checkbox"
                                checked={form.is_default}
                                onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
                                style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)' }}
                            />
                            ⭐ Common Default Template (Fallback if no custom template chosen)
                        </label>
                    </div>

                    <input className="input-field" placeholder="Brief Description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h4 style={{ margin: 0, color: 'var(--primary-color)' }}>Model Binding Headers ({form.headers.length}/10)</h4>
                            {form.headers.length < 10 && (
                                <button onClick={handleAddHeader} style={{ background: 'rgba(102, 252, 241, 0.15)', color: 'var(--primary-color)', padding: '0.4rem 0.8rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer', border: 'none' }}>
                                    <Plus size={16} /> Add Header
                                </button>
                            )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {form.headers.map((h, i) => (
                                <div key={i} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '0.4rem 0.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '8px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                                        <ListOrdered size={16} color="var(--text-secondary)" />
                                        <input
                                            type="text"
                                            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', outline: 'none', width: '100%', fontSize: '0.9rem' }}
                                            value={h}
                                            onChange={(e) => {
                                                const newHeaders = [...form.headers];
                                                newHeaders[i] = e.target.value;
                                                setForm({ ...form, headers: newHeaders });
                                            }}
                                        />
                                    </div>
                                    <button onClick={() => handleRemoveHeader(i)} style={{ color: 'var(--error)', background: 'none', padding: '0.2rem', cursor: 'pointer', border: 'none' }}>
                                        <X size={18} />
                                    </button>
                                </div>
                            ))}
                            {form.headers.length === 0 && (
                                <div style={{ color: 'rgba(255,82,82,0.8)', padding: '1rem', textAlign: 'center', background: 'rgba(255,82,82,0.1)', borderRadius: '8px' }}>
                                    You must specify at least one header.
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button className="btn-primary" onClick={handleSave}>Save Configuration</button>
                        <button className="btn-secondary" onClick={() => setShowEditor(false)}>Cancel</button>
                    </div>
                </div>
            ) : (
                <>
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }} className="fade-in">
                        <button className={activeTab === 'clinical' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('clinical')}>
                            Clinical Configurations
                        </button>
                        <button className={activeTab === 'discharge' ? 'btn-primary' : 'btn-secondary'} onClick={() => setActiveTab('discharge')}>
                            Discharge Configurations
                        </button>
                    </div>

                    <div className="grid-2 slide-up" style={{ animationDelay: '0.2s' }}>
                        {currentTemplates.map((t, i) => {
                            const headers = parseHeaders(t.content);
                            const locObj = locations.find(l => l.id === t.location_id);
                            return (
                                <article
                                    key={t.id || i}
                                    className="glass-panel clickable-card"
                                    style={{ display: 'flex', flexDirection: 'column', gap: '1rem', cursor: 'pointer', transition: 'all 0.2s ease', position: 'relative' }}
                                    onClick={() => openEditor(t)}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                                                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{t.name}</h3>
                                                <span style={{
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    padding: '0.2rem 0.5rem',
                                                    borderRadius: '4px',
                                                    background: t.location_id ? 'rgba(234, 179, 8, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                                                    color: t.location_id ? '#fbbf24' : '#818cf8',
                                                    border: `1px solid ${t.location_id ? 'rgba(234, 179, 8, 0.3)' : 'rgba(99, 102, 241, 0.3)'}`
                                                }}>
                                                    {locObj ? `🏥 ${locObj.name}` : '🌐 Common for All'}
                                                </span>
                                                {t.is_default && (
                                                    <span style={{
                                                        fontSize: '0.75rem',
                                                        fontWeight: '600',
                                                        padding: '0.2rem 0.5rem',
                                                        borderRadius: '4px',
                                                        background: 'rgba(34, 197, 94, 0.15)',
                                                        color: '#4ade80',
                                                        border: '1px solid rgba(34, 197, 94, 0.3)'
                                                    }}>
                                                        ⭐ Default Fallback
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ color: 'rgba(197, 198, 199, 0.5)', fontSize: '0.8rem' }}>
                                                Last updated: {new Date(t.updated_at || Date.now()).toLocaleDateString()}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <span style={{
                                                color: 'var(--primary-color)',
                                                background: 'rgba(102, 252, 241, 0.1)',
                                                padding: '0.25rem 0.5rem',
                                                borderRadius: '6px',
                                                fontSize: '0.8rem'
                                            }}>
                                                v{t.version || 1}
                                            </span>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(t); }}
                                                style={{ color: 'var(--error)', background: 'rgba(255,82,82,0.1)', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer', border: 'none', display: 'flex', transition: '0.2s' }}
                                                title="Delete Template"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div style={{ marginTop: '0.5rem', flex: 1 }}>
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                            Steno Headers ({headers.length}):
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                                            {headers.slice(0, 4).map((h, hi) => (
                                                <span key={hi} style={{
                                                    background: 'rgba(102, 252, 241, 0.05)', color: 'var(--text-primary)',
                                                    padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.82rem', border: '1px solid rgba(102, 252, 241, 0.2)'
                                                }}>
                                                    {hi + 1}. {h}
                                                </span>
                                            ))}
                                            {headers.length > 4 && (
                                                <span style={{ background: 'transparent', color: 'var(--text-secondary)', padding: '0.3rem', fontSize: '0.82rem' }}>
                                                    +{headers.length - 4} more
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div style={{ color: 'var(--primary-color)', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.5rem', opacity: 0.8 }}>
                                        Click to view full format and edit
                                    </div>
                                </article>
                            );
                        })}

                        {currentTemplates.length === 0 && (
                            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
                                No {activeTab} configurations found. Build one!
                            </div>
                        )}
                    </div>
                </>
            )}
        </>
    );
}
