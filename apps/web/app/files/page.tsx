"use client";

import React, { useState, useEffect } from "react";
import { UploadCloud, FileText, Trash2, Search, CheckCircle2, Eye, Download } from "lucide-react";
import { api, FileItem, getApiUrl } from "@/lib/api";

export default function FilesPage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);

  const fetchFiles = async () => {
    try {
      const res = await api.get<FileItem[]>("/files");
      setFiles(res);
    } catch {
      // Fallback
      setFiles([
        {
          id: "f-1",
          organization_id: "org-1",
          filename: "2026_Fiyat_Listesi_ve_Iskontolar.pdf",
          mime_type: "application/pdf",
          size: 3450000,
          status: "ready",
          created_at: "Bugün 09:30"
        }
      ]);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      const orgId = localStorage.getItem("currentOrgId");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (orgId) headers["X-Organization-ID"] = orgId;

      const res = await fetch(`${getApiUrl()}/files/upload`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (res.ok) {
        fetchFiles();
      } else {
        alert("Dosya yükleme hatası: " + (await res.text()));
      }
    } catch (err: any) {
      alert("Hata: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: FileItem, preview: boolean) => {
    try {
      const token = localStorage.getItem("token");
      const orgId = localStorage.getItem("currentOrgId");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (orgId) headers["X-Organization-ID"] = orgId;
      
      const res = await fetch(`${getApiUrl()}/files/${file.id}/download`, {
        headers
      });
      if (!res.ok) throw new Error("Dosya indirilemedi");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      
      if (preview) {
        window.open(url, "_blank");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = file.filename;
        a.click();
      }
      
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (e: any) {
      alert("Hata: " + e.message);
    }
  };

  const filteredFiles = files.filter((f) =>
    f.filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl space-y-6 text-zinc-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-semibold text-zinc-100 tracking-tight">
              Dökümanlar
            </h1>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700/60">
              docs
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Kurumsal döküman havuzu ve ajan çalışma dosyaları.
          </p>
        </div>

        {/* Upload Button */}
        <label className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-xs font-medium transition-colors duration-75 shadow-subtle cursor-pointer shrink-0">
          <UploadCloud className="w-3.5 h-3.5" />
          <span>{uploading ? "İşleniyor..." : "Döküman Yükle"}</span>
          <input
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
            accept=".pdf,.docx,.txt,.csv,.xlsx,.pptx,.png,.jpg,.jpeg,.mp3,.mp4"
          />
        </label>
      </div>

      {/* Search Bar */}
      <div className="bg-zinc-900 p-2.5 rounded-lg border border-zinc-800 flex items-center gap-2.5">
        <Search className="w-3.5 h-3.5 text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Dökümanlarda ara..."
          className="w-full text-xs bg-zinc-950 border border-zinc-800 rounded-md px-2.5 py-1 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition-colors duration-75 font-mono"
        />
      </div>

      {/* Files List */}
      <div className="bg-zinc-900 rounded-lg border border-zinc-800 divide-y divide-zinc-800/80 overflow-hidden shadow-subtle">
        {filteredFiles.map((file) => (
          <div key={file.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-zinc-800/40 transition-colors duration-75">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded bg-zinc-800 border border-zinc-700/60 text-zinc-400 flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-medium text-zinc-200 truncate">{file.filename}</h4>
                <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 mt-0.5">
                  <span>
                    {file.size < 1024
                      ? `${file.size} B`
                      : file.size < 1024 * 1024
                      ? `${(file.size / 1024).toFixed(1)} KB`
                      : `${(file.size / (1024 * 1024)).toFixed(2)} MB`}
                  </span>
                  <span>·</span>
                  <span>{file.created_at}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-400 mr-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>ready</span>
              </span>

              <button
                onClick={() => handleDownload(file, true)}
                title="Önizle"
                className="p-1.5 text-zinc-400 hover:text-blue-400 rounded hover:bg-zinc-800 transition-colors duration-75"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleDownload(file, false)}
                title="İndir"
                className="p-1.5 text-zinc-400 hover:text-blue-400 rounded hover:bg-zinc-800 transition-colors duration-75"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => alert("Dosya silme yetkisi tenant yöneticisine aittir.")}
                title="Sil"
                className="p-1.5 text-zinc-500 hover:text-rose-400 rounded hover:bg-zinc-800 transition-colors duration-75"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
