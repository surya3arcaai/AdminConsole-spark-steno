"use client";
import React, { useState, useRef, useEffect } from "react";
import { Mic, Square, Play, Pause, Download, Upload, CheckCircle2, Loader2, RefreshCw, Cpu, Database, AlertCircle, FileAudio } from "lucide-react";
import { audioBufferToWav } from "@/lib/wavEncoder";
import { processAudioEmbeddingAction } from "@/app/actions/audio_actions";

export default function AudioRecorder({ userId = "", userName = "", onComplete }) {
    const [activeSampleIndex, setActiveSampleIndex] = useState(1);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    // Recorded files state for 10 sample slots
    const [samples, setSamples] = useState({
        1: { blob: null, url: null, filename: null, processed: false, details: null },
        2: { blob: null, url: null, filename: null, processed: false, details: null },
        3: { blob: null, url: null, filename: null, processed: false, details: null },
        4: { blob: null, url: null, filename: null, processed: false, details: null },
        5: { blob: null, url: null, filename: null, processed: false, details: null },
        6: { blob: null, url: null, filename: null, processed: false, details: null },
        7: { blob: null, url: null, filename: null, processed: false, details: null },
        8: { blob: null, url: null, filename: null, processed: false, details: null },
        9: { blob: null, url: null, filename: null, processed: false, details: null },
        10: { blob: null, url: null, filename: null, processed: false, details: null },
    });

    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStep, setProcessingStep] = useState(0); // 0 = idle, 1 = wav export, 2 = embedding service, 3 = MinIO save
    const [statusMessage, setStatusMessage] = useState("");

    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    const audioPlayerRef = useRef(null);

    // Clean up timer and media stream on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (mediaRecorderRef.current && mediaRecorderRef.current.stream) {
                mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunksRef.current = [];

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const rawBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType || "audio/webm" });

                // Convert raw microphone recording to standard 16-bit PCM WAV Blob
                let wavBlob = rawBlob;
                try {
                    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    const arrayBuffer = await rawBlob.arrayBuffer();
                    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
                    wavBlob = audioBufferToWav(audioBuffer);
                } catch (e) {
                    console.warn("WAV conversion fallback to raw blob:", e);
                }

                const sampleUrl = URL.createObjectURL(wavBlob);
                const filename = `${userId || 'user'}_sample_${activeSampleIndex}.wav`;

                setSamples(prev => ({
                    ...prev,
                    [activeSampleIndex]: {
                        blob: wavBlob,
                        url: sampleUrl,
                        filename: filename,
                        processed: false,
                        details: null
                    }
                }));

                setStatusMessage(`Sample ${activeSampleIndex} recorded in standard .wav format!`);
            };

            mediaRecorder.start(100);
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(t => t + 1);
            }, 1000);

        } catch (err) {
            alert(`Microphone access error: ${err.message}. Please check browser microphone permissions.`);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            if (mediaRecorderRef.current.stream) {
                mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            }
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const sampleUrl = URL.createObjectURL(file);
            setSamples(prev => ({
                ...prev,
                [activeSampleIndex]: {
                    blob: file,
                    url: sampleUrl,
                    filename: file.name,
                    processed: false,
                    details: null
                }
            }));
            setStatusMessage(`Uploaded file ${file.name} for Sample ${activeSampleIndex}`);
        }
    };

    const currentSample = samples[activeSampleIndex] || {};

    const togglePlayback = () => {
        if (!audioPlayerRef.current) return;
        if (isPlaying) {
            audioPlayerRef.current.pause();
            setIsPlaying(false);
        } else {
            audioPlayerRef.current.play();
            setIsPlaying(true);
        }
    };

    const processSample = async () => {
        if (!currentSample || !currentSample.blob) {
            return alert(`Please record or upload audio for Sample ${activeSampleIndex} first.`);
        }

        setIsProcessing(true);
        setProcessingStep(1);
        setStatusMessage("Converting audio to standard .wav format...");

        try {
            setProcessingStep(2);
            setStatusMessage("Sending .wav file to http://192.168.112.6:30681/embedding microservice...");

            const formData = new FormData();
            formData.append("user_id", userId || "user_profile");
            formData.append("audio_file", currentSample.blob, currentSample.filename || `sample_${activeSampleIndex}.wav`);
            formData.append("sample_index", String(activeSampleIndex));

            const res = await processAudioEmbeddingAction(formData);

            setProcessingStep(3);
            if (res.error) {
                setStatusMessage(`Processing Notice: ${res.error}`);
            } else {
                setStatusMessage(`Saved .npy embeddings to MinIO bucket embeddings under ${userId || 'user_id'}`);
                setSamples(prev => ({
                    ...prev,
                    [activeSampleIndex]: {
                        ...prev[activeSampleIndex],
                        processed: true,
                        details: res
                    }
                }));
            }
        } catch (err) {
            setStatusMessage(`Error: ${err.message}`);
        } finally {
            setIsProcessing(false);
            setProcessingStep(0);
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Config & Endpoints Badge Header */}
            <div style={{ background: "rgba(0,0,0,0.25)", padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--panel-border)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(102, 252, 241, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <FileAudio size={18} color="var(--primary-color)" />
                    </div>
                    <div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Audio Export Format</div>
                        <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--primary-color)" }}>.WAV (PCM 16-bit)</div>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(102, 252, 241, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Cpu size={18} color="var(--primary-color)" />
                    </div>
                    <div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Embedding Microservice</div>
                        <div style={{ fontSize: "0.8rem", fontFamily: "monospace", color: "var(--text-primary)" }}>http://192.168.112.6:30681</div>
                    </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(102, 252, 241, 0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Database size={18} color="var(--primary-color)" />
                    </div>
                    <div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>MinIO Storage Bucket</div>
                        <div style={{ fontSize: "0.8rem", fontFamily: "monospace", color: "var(--text-primary)" }}>stenovault-embeddings</div>
                    </div>
                </div>
            </div>

            {/* Sample Selector Grid (10 Samples) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem" }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(idx => {
                    const sampleState = samples[idx] || {};
                    const isActive = activeSampleIndex === idx;
                    return (
                        <div
                            key={idx}
                            onClick={() => setActiveSampleIndex(idx)}
                            style={{
                                padding: "0.8rem 0.6rem",
                                borderRadius: "10px",
                                cursor: "pointer",
                                border: isActive ? "2px solid var(--primary-color)" : "1px solid var(--panel-border)",
                                background: isActive ? "rgba(102, 252, 241, 0.08)" : "rgba(0,0,0,0.2)",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                transition: "all 0.2s ease"
                            }}
                        >
                            <div style={{
                                width: "28px", height: "28px", borderRadius: "50%", flexShrink: 0,
                                background: sampleState.processed ? "rgba(105, 240, 174, 0.2)" : sampleState.blob ? "rgba(102, 252, 241, 0.2)" : "rgba(255,255,255,0.05)",
                                color: sampleState.processed ? "var(--success)" : sampleState.blob ? "var(--primary-color)" : "var(--text-secondary)",
                                display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 600, fontSize: "0.8rem"
                            }}>
                                {sampleState.processed ? <CheckCircle2 size={15} /> : idx}
                            </div>
                            <div style={{ overflow: "hidden" }}>
                                <div style={{ fontWeight: 600, fontSize: "0.82rem", whiteSpace: "nowrap" }}>Sample {idx}</div>
                                <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {sampleState.processed ? "Saved" : sampleState.blob ? "Ready" : "Empty"}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Main Audio Recording & Processing Workspace */}
            <div style={{ background: "rgba(0,0,0,0.2)", padding: "2rem", borderRadius: "12px", border: "1px solid var(--panel-border)", textAlign: "center" }}>
                <h3 style={{ margin: "0 0 0.5rem 0", color: "var(--primary-color)" }}>
                    Configure Voice Sample {activeSampleIndex} {userId && <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>({userName || userId})</span>}
                </h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", maxWidth: "500px", margin: "0 auto 1.5rem" }}>
                    Record audio via microphone or upload a 16-bit PCM `.wav` file. The audio will be sent to the embedding microservice to generate `.npy` embeddings saved in MinIO.
                </p>

                {/* Recorder Control Bar */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", marginBottom: "1.5rem" }}>
                    {/* Live Recording Pulsing Circle */}
                    <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {isRecording && (
                            <div style={{
                                position: "absolute", width: "110px", height: "110px", borderRadius: "50%",
                                background: "rgba(255, 82, 82, 0.2)", animation: "pulse 1.5s infinite"
                            }} />
                        )}
                        <button
                            onClick={isRecording ? stopRecording : startRecording}
                            disabled={isProcessing}
                            style={{
                                width: "90px", height: "90px", borderRadius: "50%",
                                background: isRecording ? "var(--error)" : "var(--primary-color)",
                                border: "none", color: "var(--bg-primary)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                cursor: "pointer", boxShadow: isRecording ? "0 0 20px rgba(255, 82, 82, 0.6)" : "0 0 20px rgba(102, 252, 241, 0.4)",
                                transition: "all 0.3s ease", zIndex: 2
                            }}
                        >
                            {isRecording ? <Square size={36} fill="var(--bg-primary)" /> : <Mic size={40} />}
                        </button>
                    </div>

                    <div style={{ fontSize: "1.2rem", fontWeight: 700, fontFamily: "monospace", color: isRecording ? "var(--error)" : "var(--primary-color)" }}>
                        {isRecording ? `REC ${formatTime(recordingTime)}` : currentSample.blob ? "Audio Ready (.wav)" : "Click Microphone to Record"}
                    </div>

                    {/* Waveform Animation effect while recording */}
                    {isRecording && (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", height: "24px" }}>
                            {[40, 70, 30, 90, 60, 100, 50, 80, 40, 70].map((h, i) => (
                                <div key={i} style={{ width: "4px", height: `${h}%`, background: "var(--error)", borderRadius: "2px", animation: `wave 0.8s ease-in-out infinite alternate ${i * 0.1}s` }} />
                            ))}
                        </div>
                    )}
                </div>

                {/* File Upload Alternative */}
                <div style={{ display: "flex", justifyContent: "center", gap: "1rem", marginBottom: "1.5rem" }}>
                    <label className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.85rem" }}>
                        <Upload size={16} /> Upload .WAV File
                        <input type="file" accept="audio/wav,audio/*" onChange={handleFileUpload} style={{ display: "none" }} />
                    </label>

                    {currentSample.url && (
                        <a
                            href={currentSample.url}
                            download={currentSample.filename || `sample_${activeSampleIndex}.wav`}
                            className="btn-secondary"
                            style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", textDecoration: "none" }}
                        >
                            <Download size={16} /> Download .WAV
                        </a>
                    )}
                </div>

                {/* Audio Player Preview */}
                {currentSample.url && (
                    <div style={{ background: "rgba(0,0,0,0.3)", padding: "1rem", borderRadius: "10px", maxWidth: "450px", margin: "0 auto 1.5rem", border: "1px solid var(--panel-border)" }}>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                            Playback Preview ({currentSample.filename})
                        </div>
                        <audio
                            ref={audioPlayerRef}
                            src={currentSample.url}
                            onPlay={() => setIsPlaying(true)}
                            onEnded={() => setIsPlaying(false)}
                            onPause={() => setIsPlaying(false)}
                            controls
                            style={{ width: "100%", height: "40px" }}
                        />
                    </div>
                )}

                {/* Action Button: Extract Embedding & Save to MinIO */}
                {currentSample.blob && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
                        <button
                            className="btn-primary"
                            onClick={processSample}
                            disabled={isProcessing}
                            style={{
                                padding: "0.8rem 2rem", fontSize: "0.95rem", fontWeight: 600,
                                display: "flex", alignItems: "center", gap: "0.6rem"
                            }}
                        >
                            {isProcessing ? (
                                <>
                                    <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
                                    Extracting Embeddings & Saving to MinIO...
                                </>
                            ) : (
                                <>
                                    <Cpu size={18} /> Extract Embeddings & Save to MinIO
                                </>
                            )}
                        </button>

                        {/* Processing Status Log */}
                        {statusMessage && (
                            <div style={{
                                padding: "0.75rem 1.25rem", borderRadius: "8px", fontSize: "0.85rem",
                                background: currentSample.processed ? "rgba(105, 240, 174, 0.1)" : "rgba(102, 252, 241, 0.1)",
                                border: currentSample.processed ? "1px solid rgba(105, 240, 174, 0.3)" : "1px solid rgba(102, 252, 241, 0.3)",
                                color: currentSample.processed ? "var(--success)" : "var(--primary-color)",
                                fontFamily: "monospace", maxWidth: "600px", wordBreak: "break-all"
                            }}>
                                {statusMessage}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style>{`
                @keyframes wave {
                    0% { height: 20%; }
                    100% { height: 100%; }
                }
                @keyframes pulse {
                    0% { transform: scale(1); opacity: 0.8; }
                    50% { transform: scale(1.3); opacity: 0.2; }
                    100% { transform: scale(1); opacity: 0.8; }
                }
            `}</style>
        </div>
    );
}
