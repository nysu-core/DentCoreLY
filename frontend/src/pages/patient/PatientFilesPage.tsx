import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../api/client";
import { ClinicalFile, Patient, FileCategory, FILE_CATEGORIES, CATEGORY_LABELS } from "../../types";
import { FileUploadZone } from "../../components/files/FileUploadZone";
import { FileThumbnailCard } from "../../components/files/FileThumbnailCard";
import { ImageLightbox } from "../../components/files/ImageLightbox";

export function PatientFilesPage() {
  const { id: patientId } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [activeCategory, setActiveCategory] = useState<FileCategory | "ALL">("ALL");
  const [lightboxFiles, setLightboxFiles] = useState<ClinicalFile[]>([]);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [showUpload, setShowUpload] = useState(false);

  const { data: patient } = useQuery({
    queryKey: ["patient", patientId],
    queryFn: async () => (await api.get<Patient>(`/patients/${patientId}`)).data,
  });

  const { data: files = [], isLoading } = useQuery({
    queryKey: ["files", patientId],
    queryFn: async () => (await api.get<ClinicalFile[]>(`/patients/${patientId}/files`)).data,
  });

  function refresh() {
    qc.invalidateQueries({ queryKey: ["files", patientId] });
  }

  const displayed =
    activeCategory === "ALL" ? files : files.filter((f) => f.category === activeCategory);

  function openLightbox(file: ClinicalFile) {
    // Only image/pdf files in the lightbox; others download directly
    const viewable = displayed.filter((f) => f.mimeType.startsWith("image/") || f.mimeType === "application/pdf");
    const idx = viewable.findIndex((f) => f.id === file.id);
    if (idx === -1) { window.open(file.url, "_blank"); return; }
    setLightboxFiles(viewable);
    setLightboxIdx(idx);
  }

  // Count per category for tabs
  const counts = FILE_CATEGORIES.reduce<Record<string, number>>((acc, cat) => {
    acc[cat] = files.filter((f) => f.category === cat).length;
    return acc;
  }, {});

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to={`/patients/${patientId}`} className="text-sm text-brand-600 hover:underline">
            ← {patient?.fullName}
          </Link>
          <h1 className="text-xl font-bold mt-1">Clinical Files & Images</h1>
          <p className="text-sm text-slate-500">{files.length} file{files.length !== 1 ? "s" : ""} total</p>
        </div>
        <button
          onClick={() => setShowUpload((v) => !v)}
          className="bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          {showUpload ? "Hide Upload" : "↑ Upload Files"}
        </button>
      </div>

      {/* Upload zone */}
      {showUpload && patientId && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 mb-6">
          <FileUploadZone
            patientId={patientId}
            onUploaded={() => { refresh(); setShowUpload(false); }}
          />
        </div>
      )}

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveCategory("ALL")}
          className={`px-3 py-1.5 rounded-md text-sm font-medium ${
            activeCategory === "ALL" ? "bg-brand-500 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          All ({files.length})
        </button>
        {FILE_CATEGORIES.filter((c) => counts[c] > 0 || activeCategory === c).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              activeCategory === cat ? "bg-brand-500 text-white" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {CATEGORY_LABELS[cat]}
            {counts[cat] > 0 && (
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                activeCategory === cat ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
              }`}>
                {counts[cat]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Gallery grid */}
      {isLoading && <div className="text-slate-400 text-sm">Loading files…</div>}

      {!isLoading && displayed.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <div className="text-5xl mb-3">🗂️</div>
          <p className="text-sm">No files in this category yet.</p>
          <button onClick={() => setShowUpload(true)} className="mt-3 text-sm text-brand-500 hover:underline">
            Upload files
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {displayed.map((file) => (
          <FileThumbnailCard
            key={file.id}
            file={file}
            onClick={() => openLightbox(file)}
            onDeleted={refresh}
          />
        ))}
      </div>

      {/* Lightbox */}
      {lightboxFiles.length > 0 && (
        <ImageLightbox
          files={lightboxFiles}
          activeIndex={lightboxIdx}
          onClose={() => setLightboxFiles([])}
          onNavigate={setLightboxIdx}
        />
      )}
    </div>
  );
}
