"use client";
import React, { useState, useEffect, useRef } from "react";
import { Activity, RefreshCw, Terminal } from "lucide-react";
import { fetchContainerLogsAction } from "@/app/actions/log_actions";

export default function ContainerLogsViewer() {
    const services = [
        "arca-spark-core",
        "diarization-api",
        "embeddings-api",
        "whisper-stt-api",
        "indic-stt-api",
        "indictrans2-api"
    ];

    const [activeService, setActiveService] = useState(services[0]);
    const [logs, setLogs] = useState({});
    const [loading, setLoading] = useState(false);
    const logsEndRef = useRef(null);

    const loadLogs = async (serviceName, forceRefresh = false) => {
        if (!forceRefresh && logs[serviceName]) return;
        
        setLoading(true);
        try {
            const data = await fetchContainerLogsAction(serviceName);
            setLogs(prev => ({ ...prev, [serviceName]: data }));
        } catch (error) {
            setLogs(prev => ({ ...prev, [serviceName]: "Critical error running az CLI command: " + error.message }));
        } finally {
            setLoading(false);
        }
    };

    // Load initial logs on mount or tab change
    useEffect(() => {
        loadLogs(activeService);
    }, [activeService]);

    // Auto-scroll to bottom whenever logs change
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [logs[activeService]]);

    return (
        <section className="slide-up glass-panel" style={{ animationDelay: '0.3s', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Tabs Header */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.2)' }}>
                {services.map(svc => (
                    <button
                        key={svc}
                        onClick={() => setActiveService(svc)}
                        style={{
                            padding: '1rem 1.5rem',
                            background: activeService === svc ? 'rgba(102, 252, 241, 0.1)' : 'transparent',
                            color: activeService === svc ? 'var(--primary-color)' : 'var(--text-secondary)',
                            border: 'none',
                            borderBottom: activeService === svc ? '2px solid var(--primary-color)' : '2px solid transparent',
                            cursor: 'pointer',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            transition: 'all 0.2s ease',
                            fontFamily: 'monospace',
                            fontSize: '0.85rem'
                        }}
                    >
                        <Terminal size={14} /> {svc}
                    </button>
                ))}
            </div>

            {/* Viewer Action Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1.5rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Viewing production logs for resource group <strong>emr-lite</strong>
                </span>
                <button 
                    onClick={() => loadLogs(activeService, true)}
                    disabled={loading}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: loading ? 'var(--text-secondary)' : 'var(--primary-color)',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.8rem'
                    }}
                >
                    <RefreshCw size={14} className={loading ? "spin" : ""} /> {loading ? 'Fetching...' : 'Force Refresh'}
                </button>
            </div>

            {/* Terminal Window */}
            <div style={{
                background: '#0d1117',
                padding: '1.5rem',
                minHeight: '400px',
                maxHeight: '600px',
                overflowY: 'auto',
                fontFamily: 'SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace',
                fontSize: '0.85rem',
                color: '#c9d1d9',
                lineHeight: 1.5
            }}>
                {loading && !logs[activeService] ? (
                    <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <RefreshCw size={14} className="spin" /> Executing Azure CLI `az container logs` securely...
                    </div>
                ) : (
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                        {logs[activeService] || "No output captured yet."}
                    </pre>
                )}
                <div ref={logsEndRef} />
            </div>

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </section>
    );
}
