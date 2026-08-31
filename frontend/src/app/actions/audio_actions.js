"use server";
import { fetchApi } from "@/lib/api";
import { revalidatePath } from "next/cache";
import { Client as MinioClient } from "minio";

const EMBEDDING_SERVICE_URL = process.env.EMBEDDING_SERVICE_URL || "http://192.168.112.6:30681/embedding";
const EMBEDDING_API_KEY = process.env.EMBEDDING_API_KEY || "n1i2t3i4k5d6i7a8s";
const USER_SERVICE_PORT = 8005;

const MINIO_ENDPOINT = process.env.MINIO_ENDPOINT || "192.168.112.6";
const MINIO_PORT = parseInt(process.env.MINIO_PORT || "31380", 10);
const MINIO_ACCESS_KEY = process.env.MINIO_ACCESS_KEY || "minioadmin";
const MINIO_SECRET_KEY = process.env.MINIO_SECRET_KEY || "Password@123";
const MINIO_BUCKET_NAME = process.env.MINIO_BUCKET_NAME || "embeddings";

const minioClient = new MinioClient({
    endPoint: MINIO_ENDPOINT,
    port: MINIO_PORT,
    useSSL: false,
    accessKey: MINIO_ACCESS_KEY,
    secretKey: MINIO_SECRET_KEY,
});

function createNpyBuffer(float32Array, shapeArray) {
    let shapeStr = "";
    if (Array.isArray(shapeArray) && shapeArray.length > 0) {
        if (shapeArray.length === 1) {
            shapeStr = `(${shapeArray[0]},)`;
        } else {
            shapeStr = `(${shapeArray.join(", ")})`;
        }
    } else {
        shapeStr = `(${float32Array.length},)`;
    }

    const headerStr = `{'descr': '<f4', 'fortran_order': False, 'shape': ${shapeStr}, }`;
    const prefixLen = 10;
    let padLen = 64 - ((prefixLen + headerStr.length + 1) % 64);
    if (padLen === 64) padLen = 0;
    const fullHeaderStr = headerStr + " ".repeat(padLen) + "\n";

    const headerBytes = Buffer.from(fullHeaderStr, "ascii");
    const headerLen = headerBytes.length;

    const totalLen = 10 + headerLen + float32Array.byteLength;
    const buffer = Buffer.alloc(totalLen);

    buffer[0] = 0x93;
    buffer.write("NUMPY", 1, "ascii");
    buffer[6] = 1;
    buffer[7] = 0;
    buffer.writeUInt16LE(headerLen, 8);

    headerBytes.copy(buffer, 10);
    Buffer.from(float32Array.buffer, float32Array.byteOffset, float32Array.byteLength).copy(buffer, 10 + headerLen);

    return buffer;
}

/**
 * Sends a recorded WAV file to the Embedding microservice, retrieves the .npy embedding,
 * saves it under user_id in MinIO storage, and registers the audio sample in User Service.
 */
export async function processAudioEmbeddingAction(formData) {
    try {
        const userId = formData.get("user_id");
        const audioFile = formData.get("audio_file");
        const sampleIndex = formData.get("sample_index") || "1";
        const speakerName = formData.get("speaker_name") || "Doctor";

        if (!userId) {
            return { error: "User ID is required" };
        }
        if (!audioFile) {
            return { error: "WAV Audio file is required" };
        }

        // Step 1: Send .wav audio file to Embedding Microservice (http://192.168.112.6:30681/embedding)
        const embedFormData = new FormData();
        embedFormData.append("audio_file", audioFile, `${userId}_sample_${sampleIndex}.wav`);
        embedFormData.append("user_id", userId);

        let npyBuffer = null;

        try {
            const embedRes = await fetch(EMBEDDING_SERVICE_URL, {
                method: "POST",
                headers: {
                    "X-API-KEY": EMBEDDING_API_KEY
                },
                body: embedFormData,
                signal: AbortSignal.timeout(15000)
            });

            if (!embedRes.ok) {
                const errText = await embedRes.text().catch(() => "");
                let errDetail = errText;
                try {
                    const parsed = JSON.parse(errText);
                    if (parsed.error) errDetail = parsed.error;
                } catch (e) { }
                return { error: `Embedding Service Failed (${embedRes.status}): ${errDetail || "Service error"}` };
            }

            const contentType = embedRes.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
                const jsonBody = await embedRes.json();
                if (jsonBody.error || jsonBody.success === false) {
                    return { error: `Embedding Service Error: ${jsonBody.error || "Generation failed"}` };
                }
                const embList = jsonBody.embedding || jsonBody.embeddings || jsonBody.vector;
                if (!embList || (Array.isArray(embList) && embList.length === 0)) {
                    return { error: "Embedding Service returned empty embedding data." };
                }

                // Recursively flatten nested 1D/2D vector arrays so no element is missed
                const flatValues = Array.isArray(embList) ? embList.flat(Infinity) : [embList];
                const floatArray = new Float32Array(flatValues);

                // Preserve exact vector shape returned by microservice
                const shapeArray = Array.isArray(jsonBody.shape) ? jsonBody.shape : [floatArray.length];

                npyBuffer = createNpyBuffer(floatArray, shapeArray);
            } else {
                const rawBuffer = await embedRes.arrayBuffer();
                if (!rawBuffer || rawBuffer.byteLength === 0) {
                    return { error: "Embedding Service returned empty data." };
                }
                npyBuffer = Buffer.from(rawBuffer);
            }
        } catch (e) {
            return { error: `Embedding Service Connection Error: ${e.message}` };
        }

        // Step 2: Save .npy embedding under user_id and speakerName (Doctor) in MinIO bucket (stenovault-embeddings)
        const minioObjectKey = `embeddings/${userId}/${speakerName}/sample_${sampleIndex}.npy`;
        const minioTargetUrl = `http://${MINIO_ENDPOINT}:${MINIO_PORT}/${MINIO_BUCKET_NAME}/${minioObjectKey}`;

        try {
            // Ensure bucket exists
            const bucketExists = await minioClient.bucketExists(MINIO_BUCKET_NAME).catch(() => false);
            if (!bucketExists) {
                await minioClient.makeBucket(MINIO_BUCKET_NAME, "").catch(() => { });
            }

            // Upload to MinIO bucket strictly under embeddings/{user_id}/{speakerName}/
            await minioClient.putObject(
                MINIO_BUCKET_NAME,
                minioObjectKey,
                npyBuffer,
                npyBuffer.length,
                {
                    "Content-Type": "application/x-numpy",
                    "user_id": String(userId),
                    "speaker_name": String(speakerName),
                    "sample_index": String(sampleIndex)
                }
            );

        } catch (e) {
            return { error: `MinIO Storage Upload Failed: ${e.message}` };
        }

        // Step 3: Register Audio Sample in user-onboarding-service (Port 8005)
        const userSvcFormData = new FormData();
        userSvcFormData.append("file", audioFile, `sample_${sampleIndex}.wav`);

        let sampleRecord = null;
        try {
            sampleRecord = await fetchApi(USER_SERVICE_PORT, `/${userId}/audio`, {
                method: "POST",
                body: userSvcFormData
            });
        } catch (e) {
            console.warn("[User Service Audio Register Notice]", e.message);
        }

        revalidatePath("/users");
        revalidatePath("/users/audio");

        return {
            success: true,
            sample: sampleRecord,
            embeddingSuccess: true,
            embeddingMessage: "Embedding .npy generated successfully",
            minioTargetUrl,
            minioSaved: true
        };
    } catch (err) {
        console.error("[Audio Processing Failed]", err);
        return { error: err.message || "Failed to process audio sample" };
    }
}

export async function getUserAudioSamplesAction(userId) {
    return await fetchApi(USER_SERVICE_PORT, `/${userId}/audio`);
}

export async function deleteUserAudioSampleAction(userId, sampleId) {
    const res = await fetchApi(USER_SERVICE_PORT, `/${userId}/audio/${sampleId}`, {
        method: "DELETE"
    });
    revalidatePath("/users/audio");
    return res;
}
