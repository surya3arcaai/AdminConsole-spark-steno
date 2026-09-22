"use client";

import React, { useState, useEffect } from "react";
import {
  ExternalLink,
  Maximize2,
  Minimize2,
  RefreshCw,
  Activity,
  Layers,
  Terminal,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import ContainerLogsViewer from "./ContainerLogsViewer";
import ServiceLogsAnalyticsDashboard from "./ServiceLogsAnalyticsDashboard";
import { BarChart2 } from "lucide-react";

export default function GrafanaDashboardViewer() {
  const [activeTab, setActiveTab] = useState("analytics"); // 'analytics' | 'grafana' | 'explore' | 'terminal'
  const [selectedService, setSelectedService] = useState(null);
  const [isKiosk, setIsKiosk] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [grafanaStatus, setGrafanaStatus] = useState("checking"); // 'checking' | 'online' | 'offline'
  const [refreshKey, setRefreshKey] = useState(0);

  const grafanaBaseUrl = "http://localhost:3002";
  const defaultDashboardUrl = `${grafanaBaseUrl}/d/arca-spark-health/arca-spark-live-system-health?orgId=1${
    isKiosk ? "&kiosk=tv" : ""
  }`;
  const exploreUrl = `${grafanaBaseUrl}/explore?orgId=1`;

  // Ping Grafana health API
  const checkGrafanaHealth = async () => {
    try {
      setGrafanaStatus("checking");
      const res = await fetch(`${grafanaBaseUrl}/api/health`, {
        method: "GET",
        mode: "no-cors"
      });
      setGrafanaStatus("online");
    } catch (err) {
      console.warn("Grafana health check failed:", err);
      setGrafanaStatus("offline");
    }
  };

  // Background sync for speech AI terminal logs to Loki
  const syncLokiLogs = async () => {
    try {
      await fetch("/api/logs/ship-to-loki", { method: "POST" });
    } catch (e) {
      // non-blocking background sync
    }
  };

  useEffect(() => {
    checkGrafanaHealth();
    syncLokiLogs();
    const interval = setInterval(checkGrafanaHealth, 15000);
    const syncInterval = setInterval(syncLokiLogs, 25000);
    return () => {
      clearInterval(interval);
      clearInterval(syncInterval);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    checkGrafanaHealth();
    syncLokiLogs();
  };

  const handleSelectServiceFromAnalytics = (svcId) => {
    setSelectedService(svcId);
    setActiveTab("terminal");
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        ...(isFullscreen
          ? {
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              zIndex: 9999,
              backgroundColor: "#0b132b",
              padding: "1.5rem",
              boxSizing: "border-box",
              overflow: "auto"
            }
          : {})
      }}
    >
      {/* Top Header & Navigation Bar */}
      <div
        className="glass-panel"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          padding: "1rem 1.25rem"
        }}
      >
        {/* Left: View Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className={activeTab === "analytics" ? "btn-primary" : "btn-secondary"}
            onClick={() => setActiveTab("analytics")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              fontSize: "0.85rem",
              cursor: "pointer"
            }}
          >
            <BarChart2 size={16} />
            Terminal Errors & Service Status (Charts)
          </button>

          <button
            type="button"
            className={activeTab === "grafana" ? "btn-primary" : "btn-secondary"}
            onClick={() => setActiveTab("grafana")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              fontSize: "0.85rem",
              cursor: "pointer"
            }}
          >
            <Activity size={16} />
            Grafana Live Dashboard
          </button>

          <button
            type="button"
            className={activeTab === "explore" ? "btn-primary" : "btn-secondary"}
            onClick={() => setActiveTab("explore")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              fontSize: "0.85rem",
              cursor: "pointer"
            }}
          >
            <Layers size={16} />
            Grafana Explore
          </button>

          <button
            type="button"
            className={activeTab === "terminal" ? "btn-primary" : "btn-secondary"}
            onClick={() => setActiveTab("terminal")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              fontSize: "0.85rem",
              cursor: "pointer"
            }}
          >
            <Terminal size={16} />
            Raw Container Terminal Logs
          </button>
        </div>

        {/* Right: Controls & Utilities */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Health Status Indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              fontSize: "0.8rem",
              padding: "0.3rem 0.6rem",
              borderRadius: "20px",
              backgroundColor:
                grafanaStatus === "online"
                  ? "rgba(34, 197, 94, 0.15)"
                  : grafanaStatus === "checking"
                  ? "rgba(234, 179, 8, 0.15)"
                  : "rgba(239, 68, 68, 0.15)",
              color:
                grafanaStatus === "online"
                  ? "#4ade80"
                  : grafanaStatus === "checking"
                  ? "#facc15"
                  : "#f87171",
              border: `1px solid ${
                grafanaStatus === "online"
                  ? "rgba(34, 197, 94, 0.3)"
                  : grafanaStatus === "checking"
                  ? "rgba(234, 179, 8, 0.3)"
                  : "rgba(239, 68, 68, 0.3)"
              }`
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor:
                  grafanaStatus === "online"
                    ? "#22c55e"
                    : grafanaStatus === "checking"
                    ? "#eab308"
                    : "#ef4444"
              }}
            />
            {grafanaStatus === "online"
              ? "Grafana (Port 3002) Active"
              : grafanaStatus === "checking"
              ? "Connecting..."
              : "Grafana Offline"}
          </div>

          {activeTab !== "terminal" && (
            <>
              {/* Kiosk Mode Toggle */}
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsKiosk(!isKiosk)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.45rem 0.8rem",
                  fontSize: "0.8rem",
                  cursor: "pointer"
                }}
                title={isKiosk ? "Show Grafana Menu Headers" : "Clean TV Kiosk View"}
              >
                {isKiosk ? "TV Mode: ON" : "TV Mode: OFF"}
              </button>

              {/* Refresh Frame */}
              <button
                type="button"
                className="btn-secondary"
                onClick={handleRefresh}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.45rem 0.6rem",
                  fontSize: "0.8rem",
                  cursor: "pointer"
                }}
                title="Reload Dashboard"
              >
                <RefreshCw size={14} />
              </button>
            </>
          )}

          {/* Fullscreen Button */}
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setIsFullscreen(!isFullscreen)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.45rem 0.8rem",
              fontSize: "0.8rem",
              cursor: "pointer"
            }}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            {isFullscreen ? "Exit" : "Fullscreen"}
          </button>

          {/* Direct External Link */}
          <a
            href={activeTab === "explore" ? exploreUrl : defaultDashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.45rem 0.8rem",
              fontSize: "0.8rem",
              textDecoration: "none",
              cursor: "pointer"
            }}
          >
            <ExternalLink size={14} />
            Open in Grafana
          </a>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "analytics" ? (
        <ServiceLogsAnalyticsDashboard onSelectService={handleSelectServiceFromAnalytics} />
      ) : (
        <div
          className="glass-panel"
          style={{
            flex: 1,
            minHeight: isFullscreen ? "calc(100vh - 120px)" : "720px",
            display: "flex",
            flexDirection: "column",
            padding: 0,
            overflow: "hidden",
            position: "relative",
            borderRadius: "12px",
            border: "1px solid var(--panel-border)"
          }}
        >
          {activeTab === "terminal" ? (
            <div style={{ padding: "1.5rem", height: "100%", overflowY: "auto" }}>
              <ContainerLogsViewer />
            </div>
          ) : (
            <div style={{ width: "100%", height: "100%", position: "relative", flex: 1 }}>
              <iframe
                key={`${activeTab}-${isKiosk}-${refreshKey}`}
                src={activeTab === "explore" ? exploreUrl : defaultDashboardUrl}
                title="Grafana Dashboard"
                style={{
                  width: "100%",
                  height: isFullscreen ? "calc(100vh - 125px)" : "720px",
                  border: "none",
                  display: "block",
                  backgroundColor: "#111217"
                }}
                allow="fullscreen"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
