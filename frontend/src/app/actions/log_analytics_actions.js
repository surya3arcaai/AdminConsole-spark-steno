"use server";

import { fetchContainerLogsAction } from "./log_actions.js";

export async function fetchTerminalLogsAnalyticsAction() {
    const services = [
        { id: "arca-spark-core", name: "Arca Spark Core EMR", port: 8000 },
        { id: "embeddings-api", name: "Embeddings & Triton API", port: 8002 },
        { id: "diarization-api", name: "Speaker Diarization API", port: 8006 },
        { id: "whisper-stt-api", name: "Whisper Speech-to-Text", port: 8007 },
        { id: "indic-stt-api", name: "Indic STT Service", port: 8008 },
        { id: "indictrans2-api", name: "IndicTrans2 Translation", port: 8009 }
    ];

    const serviceStats = [];
    const errorTraces = [];
    let totalErrors = 0;
    let totalWarnings = 0;
    let totalSuccess = 0;
    let totalLinesCount = 0;

    const errorBreakdown = {
        "500 Internal Error": 0,
        "404 Not Found": 0,
        "401/403 Unauthorized": 0,
        "Connection/Timeout": 0,
        "Model/Inference Error": 0,
        "Other Exceptions": 0
    };

    await Promise.all(
        services.map(async (svc) => {
            let raw = "";
            try {
                raw = await fetchContainerLogsAction(svc.id, "service", "", false);
            } catch (err) {
                raw = `[ERROR] Failed to fetch logs for ${svc.id}: ${err.message}`;
            }

            const lines = (raw || "").split("\n").map(l => l.trim()).filter(Boolean);
            totalLinesCount += lines.length;

            let svcErrors = 0;
            let svcWarnings = 0;
            let svcSuccess = 0;
            let lastTimestamp = null;

            lines.forEach((line) => {
                const upper = line.toUpperCase();
                const isError = upper.includes("ERROR") || upper.includes("FAIL") || upper.includes("CRITICAL") || upper.includes("EXCEPTION") || / 5\d\d /i.test(line) || / 4\d\d /i.test(line);
                const isWarning = upper.includes("WARN") || upper.includes("WARNING");
                const isSuccess = upper.includes("SUCCESS") || upper.includes(" 200 ") || upper.includes(" 201 ");

                // Extract timestamp if present (e.g. 2026-08-31 05:45:47)
                const tsMatch = line.match(/^(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2})/);
                if (tsMatch) {
                    lastTimestamp = tsMatch[1];
                }

                if (isError) {
                    svcErrors++;
                    totalErrors++;

                    // Categorize error
                    if (upper.includes("500") || upper.includes("INTERNAL SERVER ERROR")) {
                        errorBreakdown["500 Internal Error"]++;
                    } else if (upper.includes("404") || upper.includes("NOT FOUND")) {
                        errorBreakdown["404 Not Found"]++;
                    } else if (upper.includes("401") || upper.includes("403") || upper.includes("FORBIDDEN") || upper.includes("UNAUTHORIZED")) {
                        errorBreakdown["401/403 Unauthorized"]++;
                    } else if (upper.includes("TIMEOUT") || upper.includes("CONNECTION") || upper.includes("REFUSED")) {
                        errorBreakdown["Connection/Timeout"]++;
                    } else if (upper.includes("TRITON") || upper.includes("INFERENCE") || upper.includes("EMBEDDING")) {
                        errorBreakdown["Model/Inference Error"]++;
                    } else {
                        errorBreakdown["Other Exceptions"]++;
                    }

                    // Store trace item
                    errorTraces.push({
                        id: `${svc.id}-${errorTraces.length}`,
                        serviceId: svc.id,
                        serviceName: svc.name,
                        timestamp: lastTimestamp || "Recent",
                        rawLine: line,
                        type: upper.includes("CRITICAL") ? "CRITICAL" : "ERROR"
                    });
                } else if (isWarning) {
                    svcWarnings++;
                    totalWarnings++;
                } else if (isSuccess) {
                    svcSuccess++;
                    totalSuccess++;
                }
            });

            // Calculate health status
            let status = "Healthy";
            let statusColor = "#22c55e"; // Green
            if (svcErrors >= 5) {
                status = "Failing";
                statusColor = "#ef4444"; // Red
            } else if (svcErrors > 0 || svcWarnings > 0) {
                status = "Degraded";
                statusColor = "#eab308"; // Yellow
            }

            serviceStats.push({
                id: svc.id,
                name: svc.name,
                status,
                statusColor,
                errors: svcErrors,
                warnings: svcWarnings,
                totalLines: lines.length,
                lastTimestamp: lastTimestamp || "Live",
                failureRate: lines.length > 0 ? ((svcErrors / lines.length) * 100).toFixed(1) : "0.0"
            });
        })
    );

    // Sort services by error count (descending) so failing services appear first
    serviceStats.sort((a, b) => b.errors - a.errors);

    // Reverse error traces so latest appears first
    errorTraces.reverse();

    // Map stats by service id for fast lookup
    const statsMap = {};
    serviceStats.forEach(s => { statsMap[s.id] = s; });

    const getSampleErrorFor = (svcId) => {
        const found = errorTraces.find(t => t.serviceId === svcId);
        return found ? found.rawLine : null;
    };

    // -------------------------------------------------------------
    // -------------------------------------------------------------
    // Audio Processing Flow Definition & Fault Point Locator
    // -------------------------------------------------------------
    // Audio Processing Flow Definition & Fault Point Locator
    // Backend Pipeline Flow:
    // Core EMR -> Diarization -> Embeddings -> EITHER (Whisper STT) OR (Indic-Conformer STT -> IndicTrans2 Translation)
    // -------------------------------------------------------------
    const pipelineStages = [
        {
            stageKey: "core",
            stageNumber: "1",
            name: "Arca Spark Core EMR",
            serviceId: "arca-spark-core",
            role: "Backend Entry & Dispatch",
            description: "Session authentication, audio chunk queueing, and diarization trigger",
            errors: statsMap["arca-spark-core"]?.errors || 0,
            warnings: statsMap["arca-spark-core"]?.warnings || 0,
            status: statsMap["arca-spark-core"]?.status || "Healthy",
            statusColor: statsMap["arca-spark-core"]?.statusColor || "#22c55e",
            failureRate: statsMap["arca-spark-core"]?.failureRate || "0.0",
            totalLines: statsMap["arca-spark-core"]?.totalLines || 0,
            sampleError: getSampleErrorFor("arca-spark-core"),
            nextStages: ["diarization"]
        },
        {
            stageKey: "diarization",
            stageNumber: "2",
            name: "Speaker Diarization API",
            serviceId: "diarization-api",
            role: "Speaker Segmentation",
            description: "Separates Doctor vs Patient audio intervals and sends to Embeddings",
            errors: statsMap["diarization-api"]?.errors || 0,
            warnings: statsMap["diarization-api"]?.warnings || 0,
            status: statsMap["diarization-api"]?.status || "Healthy",
            statusColor: statsMap["diarization-api"]?.statusColor || "#22c55e",
            failureRate: statsMap["diarization-api"]?.failureRate || "0.0",
            totalLines: statsMap["diarization-api"]?.totalLines || 0,
            sampleError: getSampleErrorFor("diarization-api"),
            nextStages: ["embeddings"]
        },
        {
            stageKey: "embeddings",
            stageNumber: "3",
            name: "Embeddings & Triton API",
            serviceId: "embeddings-api",
            role: "Voice Vector Inference",
            description: "Generates speaker embedding vectors & Triton model execution, then routes to STT",
            errors: statsMap["embeddings-api"]?.errors || 0,
            warnings: statsMap["embeddings-api"]?.warnings || 0,
            status: statsMap["embeddings-api"]?.status || "Healthy",
            statusColor: statsMap["embeddings-api"]?.statusColor || "#22c55e",
            failureRate: statsMap["embeddings-api"]?.failureRate || "0.0",
            totalLines: statsMap["embeddings-api"]?.totalLines || 0,
            sampleError: getSampleErrorFor("embeddings-api"),
            nextStages: ["whisper", "indic-stt"]
        },
        {
            stageKey: "whisper",
            stageNumber: "4A",
            name: "Whisper Speech-to-Text",
            serviceId: "whisper-stt-api",
            role: "Speech Transcription (Global / English)",
            description: "Acoustic audio decoding and clinical conversation transcript generation",
            errors: statsMap["whisper-stt-api"]?.errors || 0,
            warnings: statsMap["whisper-stt-api"]?.warnings || 0,
            status: statsMap["whisper-stt-api"]?.status || "Healthy",
            statusColor: statsMap["whisper-stt-api"]?.statusColor || "#22c55e",
            failureRate: statsMap["whisper-stt-api"]?.failureRate || "0.0",
            totalLines: statsMap["whisper-stt-api"]?.totalLines || 0,
            sampleError: getSampleErrorFor("whisper-stt-api"),
            nextStages: []
        },
        {
            stageKey: "indic-stt",
            stageNumber: "4B",
            name: "Indic-Conformer STT",
            serviceId: "indic-stt-api",
            role: "Speech Transcription (Indic Regional)",
            description: "Conformer acoustic model for Hindi, Tamil, Telugu, and Indian languages",
            errors: statsMap["indic-stt-api"]?.errors || 0,
            warnings: statsMap["indic-stt-api"]?.warnings || 0,
            status: statsMap["indic-stt-api"]?.status || "Healthy",
            statusColor: statsMap["indic-stt-api"]?.statusColor || "#22c55e",
            failureRate: statsMap["indic-stt-api"]?.failureRate || "0.0",
            totalLines: statsMap["indic-stt-api"]?.totalLines || 0,
            sampleError: getSampleErrorFor("indic-stt-api"),
            nextStages: ["indictrans2"]
        },
        {
            stageKey: "indictrans2",
            stageNumber: "5",
            name: "IndicTrans2 Translation",
            serviceId: "indictrans2-api",
            role: "Regional Language Translation",
            description: "Translates Indic transcripts into standard English clinical notes",
            errors: statsMap["indictrans2-api"]?.errors || 0,
            warnings: statsMap["indictrans2-api"]?.warnings || 0,
            status: statsMap["indictrans2-api"]?.status || "Healthy",
            statusColor: statsMap["indictrans2-api"]?.statusColor || "#22c55e",
            failureRate: statsMap["indictrans2-api"]?.failureRate || "0.0",
            totalLines: statsMap["indictrans2-api"]?.totalLines || 0,
            sampleError: getSampleErrorFor("indictrans2-api"),
            nextStages: []
        }
    ];

    // Identify active pipeline bottlenecks and root-cause fault points
    const pipelineFaults = [];
    if (pipelineStages[0].errors > 0) {
        pipelineFaults.push({
            stageName: "Stage 1: Arca Spark Core EMR",
            serviceId: "arca-spark-core",
            severity: "CRITICAL",
            errors: pipelineStages[0].errors,
            impact: "Backend Core audio intake failure. Audio cannot be queued for processing.",
            sampleError: pipelineStages[0].sampleError || "Core queue error"
        });
    }
    if (pipelineStages[1].errors > 0) {
        pipelineFaults.push({
            stageName: "Stage 2: Speaker Diarization API",
            serviceId: "diarization-api",
            severity: "CRITICAL",
            errors: pipelineStages[1].errors,
            impact: "Audio segmentation failed. Audio cannot be sent to Embeddings.",
            sampleError: pipelineStages[1].sampleError || "Service error: [404] Model version not found"
        });
    }
    if (pipelineStages[2].errors > 0) {
        pipelineFaults.push({
            stageName: "Stage 3: Embeddings & Triton API",
            serviceId: "embeddings-api",
            severity: "CRITICAL",
            errors: pipelineStages[2].errors,
            impact: "Triton model inference exception during vector generation. Downstream STT models (Whisper / Indic-Conformer) receive blocked vectors.",
            sampleError: pipelineStages[2].sampleError || "InferenceServerException: [500] Failed to process request"
        });
    }
    if (pipelineStages[3].errors > 0) {
        pipelineFaults.push({
            stageName: "Stage 4A: Whisper Speech-to-Text",
            serviceId: "whisper-stt-api",
            severity: "CRITICAL",
            errors: pipelineStages[3].errors,
            impact: "Acoustic speech-to-text decoding failure on Whisper branch.",
            sampleError: pipelineStages[3].sampleError || "Whisper STT model failed"
        });
    }
    if (pipelineStages[4].errors > 0) {
        pipelineFaults.push({
            stageName: "Stage 4B: Indic-Conformer STT",
            serviceId: "indic-stt-api",
            severity: "CRITICAL",
            errors: pipelineStages[4].errors,
            impact: "Conformer regional speech transcription failure.",
            sampleError: pipelineStages[4].sampleError || "Indic STT model failed"
        });
    }
    if (pipelineStages[5].errors > 0) {
        pipelineFaults.push({
            stageName: "Stage 5: IndicTrans2 Translation",
            serviceId: "indictrans2-api",
            severity: "CRITICAL",
            errors: pipelineStages[5].errors,
            impact: "Translation service failed to translate Indic transcripts into English.",
            sampleError: pipelineStages[5].sampleError || "Translation failed"
        });
    }

    return {
        timestamp: new Date().toISOString(),
        totalLinesCount,
        totalErrors,
        totalWarnings,
        totalSuccess,
        failingServicesCount: serviceStats.filter(s => s.status === "Failing").length,
        degradedServicesCount: serviceStats.filter(s => s.status === "Degraded").length,
        healthyServicesCount: serviceStats.filter(s => s.status === "Healthy").length,
        serviceStats,
        pipelineStages,
        pipelineFaults,
        errorBreakdown,
        errorTraces: errorTraces.slice(0, 50)
    };
}
