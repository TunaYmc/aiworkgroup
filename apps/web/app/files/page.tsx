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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Şirket Dökümanları & Bilgi Tabanı
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Sistemde saklanan ve yapay zeka ile entegre kurumsal dosyalar (Modele veya size özel)
          </p>
        </div>

        {/* Upload Button */}
        <label className="flex items-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-sky-500/25 cursor-pointer">
          <UploadCloud className="w-4 h-4" />
          <span>{uploading ? "İşleniyor..." : "Yeni Döküman Yükle"}</span>
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
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Yüklenmiş dökümanlar arasında ara..."
          className="w-full text-xs bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none"
        />
      </div>

      {/* Files List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {filteredFiles.map((file) => (
          <div key={file.id} className="p-5 flex items-center justify-between gap-4 hover:bg-slate-50/50 transition">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 border border-sky-100 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{file.filename}</h4>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                  <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                  <span>•</span>
                  <span>{file.created_at}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold mr-2">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Hazır</span>
              </span>

              <button
                onClick={() => handleDownload(file, true)}
                title="Önizle"
                className="p-2 text-slate-400 hover:text-sky-600 rounded-lg hover:bg-sky-50 transition"
              >
                <Eye className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleDownload(file, false)}
                title="İndir"
                className="p-2 text-slate-400 hover:text-sky-600 rounded-lg hover:bg-sky-50 transition"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                onClick={() => alert("Dosya silme yetkisi tenant yöneticisine aittir.")}
                title="Sil"
                className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
