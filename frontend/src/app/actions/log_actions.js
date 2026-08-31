"use server";

const SPARK_BACKEND_URL = process.env.SPARK_BACKEND_URL || "https://78c9-103-64-129-250.ngrok-free.app/spark-backend";
const EMBEDDING_API_KEY = process.env.EMBEDDING_API_KEY || "n1i2t3i4k5d6i7a8s";

export async function fetchContainerLogsAction(containerGroupName, logType = "service", levelFilter = "", fetchFullFile = false) {
    try {
        const lineCount = fetchFullFile ? "10000" : "300";
        const svcLower = (containerGroupName || "").toLowerCase();

        let url;
        if (svcLower.includes("diariz")) {
            url = `${SPARK_BACKEND_URL}/logs/diarize?lines=${lineCount}`;
        } else if (svcLower.includes("embed")) {
            url = `${SPARK_BACKEND_URL}/logs/embedding?lines=${lineCount}`;
        } else if (svcLower.includes("whisper")) {
            url = `${SPARK_BACKEND_URL}/logs/whisper?lines=${lineCount}`;
        } else {
            url = `${SPARK_BACKEND_URL}/logs?type=${logType}&service=${encodeURIComponent(containerGroupName)}&lines=${lineCount}`;
        }

        if (levelFilter) {
            url += `&level=${encodeURIComponent(levelFilter)}`;
        }

        const res = await fetch(url, {
            method: "GET",
            headers: {
                "X-API-Key": EMBEDDING_API_KEY,
                "ngrok-skip-browser-warning": "true",
                "Content-Type": "application/json"
            },
            cache: "no-store",
            signal: AbortSignal.timeout(12000)
        });

        if (!res.ok) {
            const errText = await res.text().catch(() => "");
            return `[Backend Status ${res.status}] ${errText || "Unable to fetch logs from Spark Backend (" + url + ")"}`;
        }

        const text = await res.text();
        try {
            const data = JSON.parse(text);
            if (data.success && Array.isArray(data.logs)) {
                return data.logs.join("\n");
            }
            if (Array.isArray(data.logs)) {
                return data.logs.join("\n");
            }
            if (data.logs && typeof data.logs === "string") {
                return data.logs;
            }
            if (Array.isArray(data.lines)) {
                return data.lines.join("\n");
            }
            if (data.content) {
                return data.content;
            }
            if (Array.isArray(data)) {
                return data.join("\n");
            }
            return JSON.stringify(data, null, 2);
        } catch {
            return text;
        }
    } catch (error) {
        return `Connection Info: Calling Spark Backend at ${SPARK_BACKEND_URL}\nTarget Service: ${containerGroupName}\nStatus Notice: ${error.message}`;
    }
}

