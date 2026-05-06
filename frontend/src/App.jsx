import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { ArrowLeft, Bot, Download, FileText, Sparkles, UploadCloud } from "lucide-react";
import "./index.css";

const API_URL = "http://localhost:5000/api/resume";

function App() {
  const [page, setPage] = useState("analyze");
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [improvedResume, setImprovedResume] = useState("");
  const [messages, setMessages] = useState([
    { role: "assistant", text: "Upload your resume first, then I can help improve it." }
  ]);

  const handleFile = (selectedFile) => {
    if (!selectedFile) return;
    setError("");
    setResult(null);
    setImprovedResume("");
    setFile(selectedFile);
  };

  const uploadResume = async () => {
    if (!file) {
      setError("Please select a resume first.");
      return;
    }

    const formData = new FormData();
    formData.append("resume", file);

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Upload failed");
      }

      setResult(data);
      setMessages([
        {
          role: "assistant",
          text: `Your resume scored ${data.score}/10. Ask why the score is low or click Generate Improved Resume.`
        }
      ]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (customMessage) => {
    const text = customMessage || chatInput;
    if (!text.trim()) return;

    const userMessage = { role: "user", text };
    setMessages((current) => [...current, userMessage]);
    setChatInput("");

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          resumeText: result?.resumeText || ""
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Chat failed");
      }

      if (text.toLowerCase().includes("improve resume")) {
        setImprovedResume(data.reply);
      }

      setMessages((current) => [...current, { role: "assistant", text: data.reply }]);
    } catch (err) {
      setMessages((current) => [...current, { role: "assistant", text: err.message }]);
    }
  };

  const downloadPDF = async () => {
    try {
      const response = await fetch(`${API_URL}/generate-pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ improvedResume })
      });

      if (!response.ok) {
        throw new Error("Could not generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "improved_resume.pdf";
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setMessages((current) => [...current, { role: "assistant", text: err.message }]);
    }
  };

  if (page === "chat") {
    return (
      <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-4 py-8 text-gray-900">
        <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col rounded-[28px] border border-white/70 bg-white/90 shadow-2xl shadow-indigo-100 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-5">
            <button
              onClick={() => setPage("analyze")}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <ArrowLeft size={18} />
              Back
            </button>
            <div className="text-center">
              <h1 className="text-2xl font-bold">AI Resume Improvement</h1>
              <p className="text-sm text-gray-500">Score: {result?.score || 0}/10</p>
            </div>
            <button
              onClick={() => sendMessage("improve resume")}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              <Sparkles size={18} />
              Generate Improved Resume
            </button>
          </div>

          <div className="grid flex-1 gap-0 lg:grid-cols-[1fr_320px]">
            <div className="flex min-h-[560px] flex-col">
              <div className="flex-1 space-y-4 overflow-y-auto p-5">
                {messages.map((message, index) => (
                  <div
                    key={`${message.role}-${index}`}
                    className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      message.role === "user"
                        ? "ml-auto bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {message.text}
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 p-4">
                <div className="flex gap-2">
                  <input
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && sendMessage()}
                    placeholder="Ask why my score is low..."
                    className="flex-1 rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={() => sendMessage()}
                    className="rounded-xl bg-gray-900 px-5 py-3 font-semibold text-white hover:bg-gray-800"
                  >
                    Send
                  </button>
                </div>
              </div>
            </div>

            <aside className="border-t border-gray-200 p-5 lg:border-l lg:border-t-0">
              <div className="rounded-2xl bg-gray-50 p-5">
                <div className="mb-4 flex items-center gap-2">
                  <Bot className="text-indigo-600" size={22} />
                  <h2 className="font-bold">Quick Actions</h2>
                </div>
                <div className="grid gap-3">
                  <button
                    onClick={() => sendMessage("why is my score low")}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium hover:border-indigo-300"
                  >
                    Why is my score low?
                  </button>
                  <button
                    onClick={() => sendMessage("what skills should I add")}
                    className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium hover:border-indigo-300"
                  >
                    What skills should I add?
                  </button>
                  <button
                    onClick={downloadPDF}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-bold text-white hover:bg-green-500"
                  >
                    <Download size={18} />
                    Download PDF
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 px-4 py-10 text-gray-900">
      <section className="mx-auto max-w-5xl">
        <div className="mb-8 text-center">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm">
            <Sparkles size={16} />
            ATS Resume Analyzer
          </p>
          <h1 className="text-4xl font-bold tracking-tight">Resume Analyzer AI</h1>
          <p className="mx-auto mt-3 max-w-2xl text-gray-600">
            Upload your resume, get a realistic ATS score, then improve it with a separate AI chat workflow.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-2xl shadow-indigo-100 backdrop-blur">
            <div
              className={`rounded-3xl border-2 border-dashed p-10 text-center transition ${
                isDragging ? "border-indigo-500 bg-indigo-50" : "border-gray-300 bg-gray-50"
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                handleFile(event.dataTransfer.files[0]);
              }}
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600">
                <UploadCloud size={32} />
              </div>
              <p className="text-lg font-bold">Drag and drop your resume</p>
              <p className="mt-1 text-sm text-gray-500">PDF or DOCX files supported</p>
              <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-500">
                <FileText size={18} />
                Choose Resume
                <input
                  type="file"
                  accept=".pdf,.docx"
                  className="hidden"
                  onChange={(event) => handleFile(event.target.files[0])}
                />
              </label>
            </div>

            {file && (
              <div className="mt-5 flex items-center justify-between rounded-2xl bg-gray-50 p-4">
                <div>
                  <p className="font-semibold">{file.name}</p>
                  <p className="text-sm text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <FileText className="text-indigo-600" />
              </div>
            )}

            {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            <button
              onClick={uploadResume}
              disabled={loading}
              className="mt-5 w-full rounded-2xl bg-gray-900 px-5 py-4 font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Analyzing Resume..." : "Upload Resume and Analyze"}
            </button>
          </section>

          <section className="rounded-[28px] border border-white/70 bg-white/90 p-6 shadow-2xl shadow-indigo-100 backdrop-blur">
            {!result ? (
              <div className="flex h-full min-h-[360px] flex-col items-center justify-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
                  <Bot size={30} />
                </div>
                <h2 className="text-2xl font-bold">Score page appears here</h2>
                <p className="mt-2 text-gray-500">Upload a resume to see the ATS score and detailed feedback.</p>
              </div>
            ) : (
              <div>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-wide text-indigo-600">ATS Score</p>
                    <h2 className="mt-1 text-4xl font-black">{result.score}/10</h2>
                  </div>
                  <div className="rounded-2xl bg-green-50 px-4 py-2 text-sm font-bold text-green-700">
                    Analyzed
                  </div>
                </div>

                <div className="mt-6 h-4 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-blue-500 transition-all duration-700"
                    style={{ width: `${result.score * 10}%` }}
                  />
                </div>

                <div className="mt-6 rounded-2xl bg-gray-50 p-5">
                  <h3 className="font-bold">Feedback</h3>
                  <p className="mt-2 leading-relaxed text-gray-700">{result.feedback}</p>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl bg-indigo-50 p-3">
                    <p className="text-xl font-black text-indigo-700">{result.details?.keywordMatches || 0}</p>
                    <p className="text-xs text-gray-500">Keywords</p>
                  </div>
                  <div className="rounded-2xl bg-blue-50 p-3">
                    <p className="text-xl font-black text-blue-700">{result.details?.sectionMatches || 0}</p>
                    <p className="text-xs text-gray-500">Sections</p>
                  </div>
                  <div className="rounded-2xl bg-green-50 p-3">
                    <p className="text-xl font-black text-green-700">{result.details?.actionVerbMatches || 0}</p>
                    <p className="text-xs text-gray-500">Verbs</p>
                  </div>
                </div>

                <button
                  onClick={() => setPage("chat")}
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-4 font-bold text-white hover:bg-indigo-500"
                >
                  <Sparkles size={20} />
                  Improve with AI
                </button>
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
