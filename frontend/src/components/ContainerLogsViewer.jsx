"use client";
import React, { useState, useEffect, useRef } from "react";
import { RefreshCw, Terminal, Filter, Globe, Download, ArrowDown } from "lucide-react";
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
    const [logType, setLogType] = useState("service"); // 'service' | 'api'
    const [levelFilter, setLevelFilter] = useState(""); // '' | 'INFO' | 'WARNING' | 'ERROR'
    const [logs, setLogs] = useState({});
    const [loading, setLoading] = useState(false);
    const [isFullFile, setIsFullFile] = useState(false);
    const logsEndRef = useRef(null);

    const handleFetchLogs = async (fullFile = false) => {
        setLoading(true);
        setIsFullFile(fullFile);
        try {
            const data = await fetchContainerLogsAction(activeService, logType, levelFilter, fullFile);
            setLogs(prev => ({ ...prev, [activeService]: data }));
        } catch (error) {
            setLogs(prev => ({ ...prev, [activeService]: "Error fetching logs: " + error.message }));
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch on mount or when switching service/type
    useEffect(() => {
        handleFetchLogs(false);
    }, [activeService, logType]);

    const scrollToBottom = () => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
    };

    const rawLogText = logs[activeService] || "";
    const logLines = rawLogText ? rawLogText.split("\n") : [];

    const filteredLines = logLines.filter(line => {
        if (!levelFilter) return true;
        return line.toUpperCase().includes(levelFilter);
    });

    const getLineColor = (line) => {
        const upper = line.toUpperCase();
        if (upper.includes("ERROR") || upper.includes("FAIL") || upper.includes("CRITICAL") || upper.includes("EXCEPTION") || upper.includes(" 500 ") || upper.includes(" 403 ") || upper.includes(" 404 ")) {
            return "#ff5555"; // Red
        }
        if (upper.includes("WARN") || upper.includes("WARNING")) {
            return "#ffb86c"; // Orange / Yellow
        }
        if (upper.includes("INFO") || upper.includes("SUCCESS") || upper.includes(" 200 ") || upper.includes(" 201 ")) {
            return "#50fa7b"; // Green
        }
        return "#c9d1d9"; // Light Gray
    };

    return (
        <section className="slide-up glass-panel" style={{ animationDelay: '0.3s', padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {/* Service Tabs Header */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--panel-border)', background: 'rgba(0,0,0,0.2)', overflowX: 'auto' }}>
                {services.map(svc => (
                    <button
                        key={svc}
                        onClick={() => setActiveService(svc)}
                        style={{
                            padding: '1rem 1.25rem',
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
                            fontSize: '0.85rem',
                            whiteSpace: 'nowrap'
                        }}
                    >
                        <Terminal size={14} /> {svc}
                    </button>
                ))}
            </div>

            {/* Controls Bar: Type, Filter, Fetch Buttons */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', padding: '0.75rem 1.25rem', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    {/* Log Type Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Type:</span>
                        <select
                            value={logType}
                            onChange={(e) => setLogType(e.target.value)}
                            style={{
                                background: '#121212',
                                color: '#fff',
                                border: '1px solid var(--panel-border)',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontFamily: 'monospace'
                            }}
                        >
                            <option value="service">Service Logs</option>
                            <option value="api">API Logs</option>
                        </select>
                    </div>

                    {/* Level Filter Selector */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Filter size={14} color="var(--text-secondary)" />
                        <select
                            value={levelFilter}
                            onChange={(e) => setLevelFilter(e.target.value)}
                            style={{
                                background: '#121212',
                                color: '#fff',
                                border: '1px solid var(--panel-border)',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontFamily: 'monospace'
                            }}
                        >
                            <option value="">All Levels</option>
                            <option value="INFO">INFO</option>
                            <option value="WARNING">WARNING</option>
                            <option value="ERROR">ERROR</option>
                        </select>
                    </div>

                    {/* Backend Endpoint Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', background: 'rgba(102, 252, 241, 0.08)', padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid rgba(102, 252, 241, 0.2)', color: 'var(--primary-color)' }}>
                        <Globe size={12} /> spark-backend (ngrok)
                    </div>
                </div>

                {/* Fetch Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <button
                        onClick={() => handleFetchLogs(false)}
                        disabled={loading}
                        className="btn-primary"
                        style={{
                            padding: '0.4rem 1rem',
                            fontSize: '0.82rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                        }}
                    >
                        <RefreshCw size={14} className={loading && !isFullFile ? "spin" : ""} />
                        {loading && !isFullFile ? 'Fetching Logs...' : 'Fetch Logs'}
                    </button>

                    <button
                        onClick={() => handleFetchLogs(true)}
                        disabled={loading}
                        className="btn-secondary"
                        style={{
                            padding: '0.4rem 1rem',
                            fontSize: '0.82rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem'
                        }}
                    >
                        <Download size={14} className={loading && isFullFile ? "spin" : ""} />
                        {loading && isFullFile ? 'Downloading Full Log File...' : 'Fetch Full Log File'}
                    </button>
                </div>
            </div>

            {/* Terminal Window with Line Numbers & Custom Dark Scroller */}
            <div
                className="custom-terminal-scroller"
                style={{
                    background: '#0d1117',
                    padding: '1.25rem',
                    height: '500px',
                    maxHeight: '600px',
                    overflowY: 'auto',
                    fontFamily: 'SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace',
                    fontSize: '0.85rem',
                    lineHeight: 1.6,
                    position: 'relative'
                }}
            >
                {loading && filteredLines.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '1rem' }}>
                        <RefreshCw size={14} className="spin" /> Fetching logs from spark-backend for {activeService}...
                    </div>
                ) : filteredLines.length === 0 ? (
                    <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic', padding: '1rem' }}>
                        No logs loaded. Click &quot;Fetch Logs&quot; to load terminal output.
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                        <tbody>
                            {filteredLines.map((line, idx) => (
                                <tr key={idx} style={{ verticalAlign: 'top' }}>
                                    <td style={{ width: '45px', color: 'rgba(255,255,255,0.25)', userSelect: 'none', paddingRight: '0.75rem', textAlign: 'right', fontSize: '0.75rem' }}>
                                        {idx + 1}
                                    </td>
                                    <td style={{ color: getLineColor(line), whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                        {line}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
                <div ref={logsEndRef} />
            </div>

            {/* Log Stats Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 1.25rem', background: 'rgba(0,0,0,0.4)', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <div>
                    Lines Loaded: <strong style={{ color: 'var(--primary-color)' }}>{filteredLines.length}</strong> {isFullFile ? '(Full Historical Log File)' : '(Recent Log Stream)'}
                </div>
                <button
                    onClick={scrollToBottom}
                    style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}
                >
                    <ArrowDown size={12} /> Scroll to Bottom
                </button>
            </div>

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                .custom-terminal-scroller::-webkit-scrollbar {
                    width: 10px;
                    height: 10px;
                }
                .custom-terminal-scroller::-webkit-scrollbar-track {
                    background: #090d13;
                }
                .custom-terminal-scroller::-webkit-scrollbar-thumb {
                    background: #21262d;
                    border-radius: 5px;
                }
                .custom-terminal-scroller::-webkit-scrollbar-thumb:hover {
                    background: var(--primary-color);
                }
            `}</style>
        </section>
    );
}
