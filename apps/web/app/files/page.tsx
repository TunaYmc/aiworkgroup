"use client";

import React, { useState, useEffect, useRef, DragEvent } from "react";
import { UploadCloud, FileText, Folder, Trash2, Search, CheckCircle2, Eye, Download, ChevronRight, FolderPlus } from "lucide-react";
import { SkeletonRow } from "@/components/Skeleton";
import { api, getApiUrl } from "@/lib/api";

export interface FileSystemNode {
  id: string;
  organization_id: string;
  filename: string;
  mime_type: string;
  size: number;
  status: string;
  created_at: string;
  path: string;
  type: "file" | "folder";
}

export default function FilesPage() {
  const [nodes, setNodes] = useState<FileSystemNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async (path: string = currentPath) => {
    try {
      setLoading(true);
      const queryParam = path ? `?path=${encodeURIComponent(path)}` : "";
      const res = await api.get<FileSystemNode[]>(`/files${queryParam}`);
      setNodes(res);
    } catch {
      setNodes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles(currentPath);
  }, [currentPath]);

  const handleFileUpload = async (filesToUpload: FileList | File[]) => {
    if (!filesToUpload || filesToUpload.length === 0) return;

    setUploading(true);
    try {
      const token = localStorage.getItem("token");
      const orgId = localStorage.getItem("currentOrgId");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (orgId) headers["X-Organization-ID"] = orgId;

      for (let i = 0; i < filesToUpload.length; i++) {
        const formData = new FormData();
        formData.append("file", filesToUpload[i]);
        formData.append("path", currentPath);

        const res = await fetch(`${getApiUrl()}/files/upload`, {
          method: "POST",
          headers,
          body: formData,
        });

        if (!res.ok) {
          console.error("Yükleme hatası:", await res.text());
        }
      }
      fetchFiles(currentPath);
    } catch (err: any) {
      alert("Hata: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    const folderName = prompt("Yeni klasör adını girin:");
    if (!folderName?.trim()) return;

    try {
      await api.post("/files/folder", {
        path: currentPath,
        folder_name: folderName.trim()
      });
      fetchFiles(currentPath);
    } catch (e: any) {
      alert("Klasör oluşturulamadı: " + e.message);
    }
  };

  const handleDownload = async (node: FileSystemNode, preview: boolean) => {
    if (node.type === "folder") return; // Cannot download folders yet
    try {
      const token = localStorage.getItem("token");
      const orgId = localStorage.getItem("currentOrgId");
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (orgId) headers["X-Organization-ID"] = orgId;
      
      const queryParam = `?path=${encodeURIComponent(node.path)}`;
      const res = await fetch(`${getApiUrl()}/files/${node.id}/download${queryParam}`, { headers });
      if (!res.ok) throw new Error("Dosya indirilemedi");
      
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      
      if (preview) {
        window.open(url, "_blank");
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = node.filename;
        a.click();
      }
      
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (node: FileSystemNode) => {
    if (!confirm(`"${node.filename}" ${node.type === 'folder' ? 'klasörünü ve içindeki her şeyi' : 'dosyasını'} silmek istediğinize emin misiniz?`)) return;
    try {
      await api.delete(`/files/${node.id}?path=${encodeURIComponent(node.path)}`);
      fetchFiles(currentPath);
    } catch (e: any) {
      alert("Silme hatası: " + e.message);
    }
  };

  const navigateToPath = (index: number) => {
    if (index === -1) {
      setCurrentPath("");
      return;
    }
    const parts = currentPath.split("/").filter(Boolean);
    const newPath = parts.slice(0, index + 1).join("/");
    setCurrentPath(newPath);
  };

  // Drag and Drop Handlers
  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const filteredNodes = nodes.filter(n => n.filename.toLowerCase().includes(search.toLowerCase()));
  const pathParts = currentPath.split("/").filter(Boolean);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
            Dokümanlar
            <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20 uppercase tracking-wider">
              Shared Workspace
            </span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Yapay zeka ajanlarıyla ortak eriştiğiniz çalışma klasörleriniz
          </p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleCreateFolder}
            className="flex-1 sm:flex-none px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 border border-zinc-700"
          >
            <FolderPlus className="w-4 h-4" />
            Yeni Klasör
          </button>
          
          <label className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-medium cursor-pointer transition-colors flex items-center justify-center gap-2">
            <input type="file" className="hidden" onChange={(e) => handleFileUpload(e.target.files!)} multiple />
            {uploading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <UploadCloud className="w-4 h-4" />}
            {uploading ? "Yükleniyor..." : "Dosya Yükle"}
          </label>
        </div>
      </div>

      {/* Breadcrumb & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-900 p-3 rounded-lg border border-zinc-800">
        <div className="flex items-center text-sm font-medium text-zinc-400 flex-wrap gap-1">
          <button onClick={() => navigateToPath(-1)} className="hover:text-blue-400 transition-colors">Ana Dizin</button>
          {pathParts.map((part, idx) => (
            <React.Fragment key={idx}>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-600" />
              <button 
                onClick={() => navigateToPath(idx)} 
                className={`transition-colors ${idx === pathParts.length - 1 ? 'text-zinc-100' : 'hover:text-blue-400'}`}
              >
                {part}
              </button>
            </React.Fragment>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Klasörde ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-md text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Dropzone & Files List */}
      <div 
        className={`bg-zinc-900 rounded-lg border overflow-hidden shadow-subtle relative min-h-[300px] transition-colors duration-200 ${isDragging ? 'border-blue-500 bg-blue-900/10' : 'border-zinc-800'}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {isDragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/80 rounded-lg backdrop-blur-sm">
            <div className="text-center">
              <UploadCloud className="w-12 h-12 text-blue-400 mx-auto mb-3 animate-bounce" />
              <p className="text-lg font-medium text-white">Dosyaları buraya bırakın</p>
              <p className="text-sm text-zinc-400 mt-1">Doğrudan "{pathParts[pathParts.length-1] || 'Ana Dizin'}" içine yüklenecek</p>
            </div>
          </div>
        )}

        <div className="divide-y divide-zinc-800/80">
          {loading ? (
            <><SkeletonRow /><SkeletonRow /><SkeletonRow /></>
          ) : (
            <>
              {filteredNodes.map((node) => (
                <div key={node.id} className="p-3.5 flex items-center justify-between gap-4 hover-row">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded bg-zinc-800/80 border border-zinc-700/50 text-zinc-400 flex items-center justify-center shrink-0">
                      {node.type === "folder" ? <Folder className="w-4 h-4 text-blue-400 fill-blue-400/20" /> : <FileText className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      {node.type === "folder" ? (
                        <button onClick={() => setCurrentPath(node.path)} className="text-sm font-medium text-zinc-200 truncate hover:text-blue-400 transition-colors">
                          {node.filename}
                        </button>
                      ) : (
                        <h4 className="text-sm font-medium text-zinc-200 truncate">{node.filename}</h4>
                      )}
                      
                      <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-500 mt-1">
                        {node.type === "file" && (
                          <>
                            <span>
                              {node.size < 1024
                                ? `${node.size} B`
                                : node.size < 1024 * 1024
                                ? `${(node.size / 1024).toFixed(1)} KB`
                                : `${(node.size / (1024 * 1024)).toFixed(2)} MB`}
                            </span>
                            <span>·</span>
                          </>
                        )}
                        <span>{new Date(node.created_at).toLocaleString('tr-TR')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {node.type === "file" && (
                      <>
                        <button
                          onClick={() => handleDownload(node, true)}
                          title="Önizle"
                          className="p-1.5 text-zinc-400 hover:text-blue-400 rounded hover:bg-zinc-800 transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownload(node, false)}
                          title="İndir"
                          className="p-1.5 text-zinc-400 hover:text-blue-400 rounded hover:bg-zinc-800 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(node)}
                      title="Sil"
                      className="p-1.5 text-zinc-500 hover:text-rose-400 rounded hover:bg-zinc-800 transition-colors ml-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {filteredNodes.length === 0 && !loading && (
                <div className="p-12 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                    <Folder className="w-8 h-8 text-zinc-500" />
                  </div>
                  <h3 className="text-sm font-medium text-zinc-300">Bu klasör boş</h3>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs">
                    Dosya yüklemek için buraya sürükleyip bırakabilir veya üstteki butonları kullanabilirsiniz.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
