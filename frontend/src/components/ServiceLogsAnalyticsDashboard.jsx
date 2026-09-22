"use client";

import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  RefreshCw,
  Server,
  Zap,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  PieChart,
  BarChart3,
  ArrowRight,
  GitFork,
  Radio,
  Cpu,
  Mic,
  FileText,
  Workflow,
  Languages
} from "lucide-react";
import { fetchTerminalLogsAnalyticsAction } from "@/app/actions/log_analytics_actions.js";

export default function ServiceLogsAnalyticsDashboard({ onSelectService }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterService, setFilterService] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTraceId, setExpandedTraceId] = useState(null);
  const [selectedStageKey, setSelectedStageKey] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchTerminalLogsAnalyticsAction();
      setData(res);
    } catch (err) {
      console.error("Error loading analytics:", err);
      setError(err.message || "Failed to load terminal logs analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 12000); // live polling every 12s
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
        <RefreshCw className="animate-spin" size={28} style={{ margin: "0 auto 1rem auto", color: "var(--primary-color)" }} />
        <p>Analyzing live terminal logs and pipeline flow across microservices...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ padding: "2rem", backgroundColor: "rgba(239,68,68,0.1)", borderRadius: "10px", color: "#f87171" }}>
        <p>⚠️ Error analyzing terminal logs: {error}</p>
        <button className="btn-secondary" onClick={loadData} style={{ marginTop: "1rem" }}>Retry</button>
      </div>
    );
  }

  const {
    totalLinesCount = 0,
    totalErrors = 0,
    totalWarnings = 0,
    failingServicesCount = 0,
    healthyServicesCount = 0,
    serviceStats = [],
    pipelineStages = [],
    pipelineFaults = [],
    errorBreakdown = {},
    errorTraces = []
  } = data || {};

  // Filter error traces by dropdown or by clicking pipeline stage
  const activeServiceFilter = selectedStageKey ? (
    selectedStageKey === "core" ? "arca-spark-core" :
    selectedStageKey === "diarization" ? "diarization-api" :
    selectedStageKey === "embeddings" ? "embeddings-api" :
    selectedStageKey === "whisper" ? "whisper-stt-api" :
    selectedStageKey === "indic-stt" ? "indic-stt-api" :
    selectedStageKey === "indictrans2" ? "indictrans2-api" : filterService
  ) : filterService;

  const filteredTraces = errorTraces.filter((t) => {
    const matchesService = activeServiceFilter === "all" || t.serviceId === activeServiceFilter;
    const matchesSearch = !searchQuery || t.rawLine.toLowerCase().includes(searchQuery.toLowerCase()) || t.serviceName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesService && matchesSearch;
  });

  const maxErrors = Math.max(...serviceStats.map(s => s.errors), 1);

  // Helper icons for pipeline stages
  const getStageIcon = (key) => {
    switch (key) {
      case "core": return <Server size={20} />;
      case "diarization": return <Radio size={20} />;
      case "embeddings": return <Cpu size={20} />;
      case "whisper": return <FileText size={20} />;
      case "indic-stt": return <Mic size={20} />;
      case "indictrans2": return <Languages size={20} />;
      default: return <Workflow size={20} />;
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
      
      {/* 1. TOP STAT CARDS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem" }}>
        {/* Service Fleet Health */}
        <div className="glass-panel" style={{ padding: "1.25rem", borderLeft: failingServicesCount > 0 ? "4px solid #ef4444" : "4px solid #22c55e" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Backend Pipeline Health</span>
            <Server size={18} color={failingServicesCount > 0 ? "#ef4444" : "#22c55e"} />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: "700", color: failingServicesCount > 0 ? "#f87171" : "#4ade80" }}>
            {failingServicesCount > 0 ? `${failingServicesCount} Bottlenecks` : "100% Flowing"}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
            {healthyServicesCount} Healthy / {serviceStats.length} Monitored
          </div>
        </div>

        {/* Failed Requests / Errors */}
        <div className="glass-panel" style={{ padding: "1.25rem", borderLeft: "4px solid #f97316" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Pipeline Failures</span>
            <AlertTriangle size={18} color="#f97316" />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: "700", color: "#fb923c" }}>
            {totalErrors}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
            Total dropouts in audio processing chain
          </div>
        </div>

        {/* Primary Fault Location */}
        <div className="glass-panel" style={{ padding: "1.25rem", borderLeft: "4px solid #a855f7" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Primary Fault Location</span>
            <Flame size={18} color="#a855f7" />
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: "700", color: "#c084fc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {pipelineFaults[0]?.stageName || "No Faults (Healthy)"}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
            {pipelineFaults.length > 0 ? `${pipelineFaults.length} active bottleneck point(s) detected` : "All pipeline stages clear"}
          </div>
        </div>

        {/* Parsed Terminal Lines */}
        <div className="glass-panel" style={{ padding: "1.25rem", borderLeft: "4px solid #06b6d4" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Terminal Buffer</span>
            <Activity size={18} color="#06b6d4" />
          </div>
          <div style={{ fontSize: "1.6rem", fontWeight: "700", color: "#22d3ee" }}>
            {totalLinesCount}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.3rem" }}>
            Raw terminal lines continuously analyzed
          </div>
        </div>
      </div>

      {/* 2. PROMINENT PIPELINE FAULT LOCATOR BANNER */}
      {pipelineFaults.length > 0 && (
        <div
          className="glass-panel slide-up"
          style={{
            padding: "1.25rem 1.5rem",
            backgroundColor: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderLeft: "6px solid #ef4444",
            borderRadius: "10px"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
              <div style={{ padding: "0.4rem", backgroundColor: "rgba(239, 68, 68, 0.2)", borderRadius: "8px", color: "#ef4444" }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "1rem", color: "#fca5a5", fontWeight: "700" }}>
                  Backend Pipeline Fault: {pipelineFaults.length} Stage{pipelineFaults.length > 1 ? "s" : ""} Dropping Requests
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.5rem" }}>
                  {pipelineFaults.map((fault, idx) => (
                    <div key={idx} style={{ fontSize: "0.82rem", color: "#f87171", display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: "700", backgroundColor: "#ef4444", color: "#fff", padding: "0.1rem 0.4rem", borderRadius: "4px", fontSize: "0.7rem" }}>
                        FAULT #{idx + 1}
                      </span>
                      <strong>{fault.stageName}:</strong> {fault.errors} failures. {fault.impact}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button
              onClick={loadData}
              className="btn-secondary"
              style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.8rem", padding: "0.4rem 0.75rem" }}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Pipeline State
            </button>
          </div>
        </div>
      )}

      {/* 3. PIPELINE ARCHITECTURE FLOW MAP (INTERACTIVE DIAGRAM) */}
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.15rem", display: "flex", alignItems: "center", gap: "0.6rem", color: "var(--text-primary)" }}>
              <Workflow size={20} color="var(--primary-color)" />
              Backend Audio Pipeline Flow & Fault Points
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
              Execution chain: <strong>Stage 1: Core EMR ➔ Stage 2: Diarization ➔ (Stage 3A: Embeddings & Stage 3B: Whisper)</strong>. Click any stage to inspect failures.
            </p>
          </div>

          {selectedStageKey && (
            <button
              onClick={() => setSelectedStageKey(null)}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#e2e8f0",
                padding: "0.3rem 0.7rem",
                borderRadius: "6px",
                fontSize: "0.75rem",
                cursor: "pointer"
              }}
            >
              ✕ Clear Stage Filter
            </button>
          )}
        </div>

        {/* Visual Flow Diagram */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", overflowX: "auto", padding: "0.5rem 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", minWidth: "1150px" }}>
            
            {/* 1. Linear Upstream Chain: Stage 1 (Core EMR) -> Stage 2 (Diarization) -> Stage 3 (Embeddings) */}
            {pipelineStages.slice(0, 3).map((stage) => {
              const hasErrors = stage.errors > 0;
              const isSelected = selectedStageKey === stage.stageKey;

              return (
                <React.Fragment key={stage.stageKey}>
                  <div
                    onClick={() => setSelectedStageKey(isSelected ? null : stage.stageKey)}
                    style={{
                      flex: 1,
                      minWidth: "210px",
                      padding: "1.1rem",
                      borderRadius: "10px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      backgroundColor: isSelected ? "rgba(102, 252, 241, 0.12)" : hasErrors ? "rgba(239, 68, 68, 0.08)" : "rgba(255, 255, 255, 0.03)",
                      border: isSelected ? "2px solid var(--primary-color)" : hasErrors ? "2px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.1)",
                      boxShadow: hasErrors ? "0 0 16px rgba(239, 68, 68, 0.2)" : "none",
                      position: "relative"
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <div style={{ color: hasErrors ? "#ef4444" : "var(--primary-color)" }}>
                          {getStageIcon(stage.stageKey)}
                        </div>
                        <span style={{ fontSize: "0.72rem", fontWeight: "700", color: "var(--text-secondary)", textTransform: "uppercase" }}>
                          Stage {stage.stageNumber}
                        </span>
                      </div>

                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: "700",
                          padding: "0.15rem 0.45rem",
                          borderRadius: "10px",
                          backgroundColor: hasErrors ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)",
                          color: hasErrors ? "#ef4444" : "#22c55e",
                          border: `1px solid ${hasErrors ? "rgba(239, 68, 68, 0.4)" : "rgba(34, 197, 94, 0.4)"}`
                        }}
                      >
                        {hasErrors ? `💥 ${stage.errors} FAULTS` : "✓ PASSING"}
                      </span>
                    </div>

                    <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "0.9rem", color: "var(--text-primary)" }}>
                      {stage.name}
                    </h4>

                    <div style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginBottom: "0.6rem", lineHeight: "1.3" }}>
                      {stage.description}
                    </div>

                    {/* Metric Bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "0.5rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>Failure Rate:</span>
                      <strong style={{ color: hasErrors ? "#ef4444" : "#22c55e" }}>
                        {stage.errors} errors ({stage.failureRate}%)
                      </strong>
                    </div>

                    {hasErrors && (
                      <div style={{ marginTop: "0.4rem", padding: "0.35rem 0.5rem", backgroundColor: "rgba(239,68,68,0.15)", borderRadius: "4px", fontSize: "0.68rem", color: "#fca5a5" }}>
                        ⚠️ {stage.stageKey === "diarization" ? "Model 404: Audio dropped before embeddings!" : "Inference exception: [500]"}
                      </div>
                    )}
                  </div>

                  {/* Flow Arrow */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem", padding: "0 0.2rem" }}>
                    <div style={{ fontSize: "0.6rem", fontWeight: "700", color: hasErrors ? "#ef4444" : "#22c55e" }}>
                      {hasErrors ? "BLOCKED" : "100% OK"}
                    </div>
                    <ArrowRight size={20} color={hasErrors ? "#ef4444" : "#22c55e"} style={{ animation: hasErrors ? "none" : "pulse 1.5s infinite" }} />
                  </div>
                </React.Fragment>
              );
            })}

            {/* 2. Downstream Branching Fork from Embeddings: (Whisper) OR (Indic-Conformer -> IndicTrans2) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem", flex: 1.6, minWidth: "420px" }}>
              
              {/* Branch 1: Whisper STT (Global / English) */}
              {pipelineStages[3] && (() => {
                const stage = pipelineStages[3];
                const hasErrors = stage.errors > 0;
                const isSelected = selectedStageKey === stage.stageKey;

                return (
                  <div
                    key={stage.stageKey}
                    onClick={() => setSelectedStageKey(isSelected ? null : stage.stageKey)}
                    style={{
                      padding: "0.9rem 1.1rem",
                      borderRadius: "10px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      backgroundColor: isSelected ? "rgba(102, 252, 241, 0.12)" : hasErrors ? "rgba(239, 68, 68, 0.08)" : "rgba(255, 255, 255, 0.03)",
                      border: isSelected ? "2px solid var(--primary-color)" : hasErrors ? "2px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.1)",
                      boxShadow: hasErrors ? "0 0 16px rgba(239, 68, 68, 0.2)" : "none"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <div style={{ color: hasErrors ? "#ef4444" : "var(--primary-color)" }}>
                          {getStageIcon(stage.stageKey)}
                        </div>
                        <span style={{ fontSize: "0.68rem", fontWeight: "700", color: "#38bdf8", backgroundColor: "rgba(56,189,248,0.1)", padding: "0.1rem 0.35rem", borderRadius: "4px" }}>
                          BRANCH A • STAGE {stage.stageNumber}
                        </span>
                        <h4 style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                          {stage.name}
                        </h4>
                      </div>

                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: "700",
                          padding: "0.15rem 0.45rem",
                          borderRadius: "8px",
                          backgroundColor: hasErrors ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)",
                          color: hasErrors ? "#ef4444" : "#22c55e"
                        }}
                      >
                        {hasErrors ? `💥 ${stage.errors} FAULTS` : "✓ 0 ERRORS"}
                      </span>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.73rem" }}>
                      <span style={{ color: "var(--text-secondary)" }}>{stage.role}</span>
                      <strong style={{ color: hasErrors ? "#ef4444" : "#22c55e" }}>
                        {stage.errors} errors ({stage.failureRate}%)
                      </strong>
                    </div>
                  </div>
                );
              })()}

              {/* Branch 2: Indic-Conformer STT -> IndicTrans2 Translation */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {/* Stage 4B: Indic-Conformer STT */}
                {pipelineStages[4] && (() => {
                  const stage = pipelineStages[4];
                  const hasErrors = stage.errors > 0;
                  const isSelected = selectedStageKey === stage.stageKey;

                  return (
                    <div
                      key={stage.stageKey}
                      onClick={() => setSelectedStageKey(isSelected ? null : stage.stageKey)}
                      style={{
                        flex: 1,
                        padding: "0.9rem 1.1rem",
                        borderRadius: "10px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        backgroundColor: isSelected ? "rgba(102, 252, 241, 0.12)" : hasErrors ? "rgba(239, 68, 68, 0.08)" : "rgba(255, 255, 255, 0.03)",
                        border: isSelected ? "2px solid var(--primary-color)" : hasErrors ? "2px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.1)",
                        boxShadow: hasErrors ? "0 0 16px rgba(239, 68, 68, 0.2)" : "none"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <div style={{ color: hasErrors ? "#ef4444" : "var(--primary-color)" }}>
                            {getStageIcon(stage.stageKey)}
                          </div>
                          <span style={{ fontSize: "0.68rem", fontWeight: "700", color: "#f59e0b", backgroundColor: "rgba(245,158,11,0.1)", padding: "0.1rem 0.35rem", borderRadius: "4px" }}>
                            BRANCH B • STAGE {stage.stageNumber}
                          </span>
                        </div>

                        <span
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: "700",
                            padding: "0.1rem 0.4rem",
                            borderRadius: "8px",
                            backgroundColor: hasErrors ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)",
                            color: hasErrors ? "#ef4444" : "#22c55e"
                          }}
                        >
                          {hasErrors ? `💥 ${stage.errors}` : "✓ 0 ERR"}
                        </span>
                      </div>

                      <h4 style={{ margin: "0 0 0.2rem 0", fontSize: "0.85rem", color: "var(--text-primary)" }}>
                        {stage.name}
                      </h4>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                        {stage.errors} errors ({stage.failureRate}%)
                      </div>
                    </div>
                  );
                })()}

                {/* Sub-arrow to Translation */}
                <ArrowRight size={18} color="#22c55e" />

                {/* Stage 5: IndicTrans2 Translation */}
                {pipelineStages[5] && (() => {
                  const stage = pipelineStages[5];
                  const hasErrors = stage.errors > 0;
                  const isSelected = selectedStageKey === stage.stageKey;

                  return (
                    <div
                      key={stage.stageKey}
                      onClick={() => setSelectedStageKey(isSelected ? null : stage.stageKey)}
                      style={{
                        flex: 1,
                        padding: "0.9rem 1.1rem",
                        borderRadius: "10px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        backgroundColor: isSelected ? "rgba(102, 252, 241, 0.12)" : hasErrors ? "rgba(239, 68, 68, 0.08)" : "rgba(255, 255, 255, 0.03)",
                        border: isSelected ? "2px solid var(--primary-color)" : hasErrors ? "2px solid #ef4444" : "1px solid rgba(255, 255, 255, 0.1)",
                        boxShadow: hasErrors ? "0 0 16px rgba(239, 68, 68, 0.2)" : "none"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <div style={{ color: hasErrors ? "#ef4444" : "var(--primary-color)" }}>
                            {getStageIcon(stage.stageKey)}
                          </div>
                          <span style={{ fontSize: "0.68rem", fontWeight: "700", color: "#a855f7", backgroundColor: "rgba(168,85,247,0.1)", padding: "0.1rem 0.35rem", borderRadius: "4px" }}>
                            STAGE {stage.stageNumber}
                          </span>
                        </div>

                        <span
                          style={{
                            fontSize: "0.65rem",
                            fontWeight: "700",
                            padding: "0.1rem 0.4rem",
                            borderRadius: "8px",
                            backgroundColor: hasErrors ? "rgba(239, 68, 68, 0.2)" : "rgba(34, 197, 94, 0.2)",
                            color: hasErrors ? "#ef4444" : "#22c55e"
                          }}
                        >
                          {hasErrors ? `💥 ${stage.errors}` : "✓ 0 ERR"}
                        </span>
                      </div>

                      <h4 style={{ margin: "0 0 0.2rem 0", fontSize: "0.85rem", color: "var(--text-primary)" }}>
                        {stage.name}
                      </h4>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>
                        {stage.errors} errors ({stage.failureRate}%)
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* 4. CHARTS: EXACT POINT OF FAILURE BREAKDOWN */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: "1.5rem" }}>
        
        {/* Chart A: Stage-by-Stage Failures (Point of Fault) */}
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-primary)" }}>
                <BarChart3 size={18} color="#ef4444" />
                Failures by Pipeline Stage Point
              </h3>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                Shows exactly at what stage of the flow audio/requests failed
              </p>
            </div>
            <button
              onClick={loadData}
              style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.75rem" }}
              title="Refresh Pipeline Analytics"
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
            {pipelineStages.map((s) => {
              const barPercent = maxErrors > 0 ? (s.errors / maxErrors) * 100 : 0;
              const hasErrors = s.errors > 0;
              return (
                <div key={s.stageKey} style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem" }}>
                    <span style={{ fontWeight: "600", color: hasErrors ? "#f87171" : "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>Stage {s.stageNumber}:</span>
                      {s.name}
                    </span>
                    <span style={{ fontWeight: "700", color: hasErrors ? "#ef4444" : "#22c55e", fontSize: "0.85rem" }}>
                      {s.errors} failures ({s.failureRate}%)
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div style={{ width: "100%", height: "10px", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: "6px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${Math.max(barPercent, hasErrors ? 6 : 0)}%`,
                        height: "100%",
                        backgroundColor: hasErrors ? "#ef4444" : "#22c55e",
                        borderRadius: "6px",
                        transition: "width 0.4s ease"
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart B: Root Cause Error Category Breakdown */}
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <div style={{ marginBottom: "1.25rem" }}>
            <h3 style={{ margin: 0, fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--text-primary)" }}>
              <PieChart size={18} color="#f59e0b" />
              Pipeline Error Category Breakdown
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Root cause categorization of terminal error lines
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            {Object.entries(errorBreakdown).map(([category, count]) => {
              const percentage = totalErrors > 0 ? ((count / totalErrors) * 100).toFixed(0) : "0";
              let catColor = "#94a3b8";
              if (category.includes("500")) catColor = "#ef4444";
              else if (category.includes("404")) catColor = "#f97316";
              else if (category.includes("401")) catColor = "#eab308";
              else if (category.includes("Model")) catColor = "#a855f7";
              else if (category.includes("Connection")) catColor = "#06b6d4";

              return (
                <div key={category} style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem" }}>
                    <span style={{ color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                      <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: catColor }} />
                      {category}
                    </span>
                    <span style={{ fontWeight: "700", color: catColor }}>
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div style={{ width: "100%", height: "8px", backgroundColor: "rgba(255,255,255,0.06)", borderRadius: "4px", overflow: "hidden" }}>
                    <div
                      style={{
                        width: `${percentage}%`,
                        height: "100%",
                        backgroundColor: catColor,
                        borderRadius: "4px",
                        transition: "width 0.4s ease"
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. LIVE ERROR TRACES & FAILED REQUESTS STREAM */}
      <div className="glass-panel" style={{ padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <AlertTriangle size={18} color="#ef4444" />
              Failed Requests & Error Traces Stream
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {selectedStageKey ? `Showing errors for Stage: ${selectedStageKey}` : `All terminal failure events (${filteredTraces.length} matched)`}
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            {/* Filter by Service */}
            <select
              value={filterService}
              onChange={(e) => {
                setFilterService(e.target.value);
                setSelectedStageKey(null);
              }}
              className="input-field"
              style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
            >
              <option value="all">All Microservices</option>
              {serviceStats.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.errors} err)
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
              <input
                type="text"
                placeholder="Search error text..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={{ paddingLeft: "30px", fontSize: "0.8rem", width: "180px" }}
              />
            </div>
          </div>
        </div>

        {filteredTraces.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
            ✓ No error traces found matching current filters.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "420px", overflowY: "auto" }}>
            {filteredTraces.map((trace) => {
              const isExpanded = expandedTraceId === trace.id;
              return (
                <div
                  key={trace.id}
                  onClick={() => setExpandedTraceId(isExpanded ? null : trace.id)}
                  style={{
                    backgroundColor: "rgba(239,68,68,0.06)",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: "6px",
                    padding: "0.6rem 0.85rem",
                    cursor: "pointer",
                    transition: "all 0.15s ease"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", overflow: "hidden" }}>
                      <span
                        style={{
                          fontSize: "0.7rem",
                          fontWeight: "700",
                          padding: "0.15rem 0.4rem",
                          borderRadius: "4px",
                          backgroundColor: "#ef4444",
                          color: "#ffffff"
                        }}
                      >
                        {trace.type}
                      </span>
                      <span style={{ fontSize: "0.75rem", fontWeight: "600", color: "#fca5a5" }}>
                        [{trace.serviceName}]
                      </span>
                      <span style={{ fontSize: "0.8rem", color: "#e2e8f0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {trace.rawLine}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.7rem", color: "var(--text-secondary)", flexShrink: 0 }}>
                      <Clock size={12} />
                      <span>{trace.timestamp}</span>
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div
                      style={{
                        marginTop: "0.6rem",
                        padding: "0.75rem",
                        backgroundColor: "#0d1117",
                        borderRadius: "4px",
                        fontFamily: "monospace",
                        fontSize: "0.78rem",
                        color: "#ff7b72",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-all"
                      }}
                    >
                      {trace.rawLine}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
