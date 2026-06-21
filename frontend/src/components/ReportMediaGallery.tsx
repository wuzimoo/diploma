import { useEffect, useState } from "react";
import { FileText, ImageIcon, PlayCircle } from "lucide-react";

import { api, resolveApiUrl } from "../services/api";
import { ReportPhoto } from "../types/api";

function isImage(photo: ReportPhoto) {
  return Boolean(photo.content_type?.startsWith("image/")) || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(photo.file_name);
}

function isVideo(photo: ReportPhoto) {
  return Boolean(photo.content_type?.startsWith("video/")) || /\.(mp4|mov|avi|mkv|webm)$/i.test(photo.file_name);
}

function ReportMediaCard({ photo }: { photo: ReportPhoto }) {
  const [blobUrl, setBlobUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const requestUrl = resolveApiUrl(photo.file_url);

  useEffect(() => {
    let active = true;
    let nextBlobUrl = "";

    setIsLoading(true);
    setHasError(false);
    setBlobUrl("");

    api.get(requestUrl, { responseType: "blob" }).then((response) => {
      if (!active) return;
      nextBlobUrl = URL.createObjectURL(response.data);
      setBlobUrl(nextBlobUrl);
    }).catch(() => {
      if (!active) return;
      setHasError(true);
    }).finally(() => {
      if (active) {
        setIsLoading(false);
      }
    });

    return () => {
      active = false;
      if (nextBlobUrl) {
        URL.revokeObjectURL(nextBlobUrl);
      }
    };
  }, [requestUrl]);

  const previewPlaceholder = (
    <div className={`media-preview-placeholder${isLoading ? " is-loading" : ""}${hasError ? " has-error" : ""}`}>
      {hasError ? "Помилка завантаження" : "Завантаження..."}
    </div>
  );

  if (isImage(photo)) {
    return (
      <a className="photo-card media-card" href={blobUrl || undefined} rel="noreferrer" target="_blank">
        {blobUrl ? <img alt={photo.caption || photo.file_name} src={blobUrl} /> : previewPlaceholder}
        <div className="media-card-meta">
          <span className="media-card-label"><ImageIcon size={14} />Зображення</span>
          <strong>{photo.caption || photo.file_name}</strong>
        </div>
      </a>
    );
  }

  if (isVideo(photo)) {
    return (
      <a className="photo-card media-card" href={blobUrl || undefined} rel="noreferrer" target="_blank">
        {blobUrl ? <video controls preload="metadata" src={blobUrl} /> : previewPlaceholder}
        <div className="media-card-meta">
          <span className="media-card-label"><PlayCircle size={14} />Відео</span>
          <strong>{photo.caption || photo.file_name}</strong>
        </div>
      </a>
    );
  }

  return (
    <a className="photo-card media-card file-media-card" download={photo.file_name} href={blobUrl || undefined} rel="noreferrer" target="_blank">
      <div className="file-media-body">
        <span className="media-card-label"><FileText size={14} />Файл</span>
        <strong>{photo.caption || photo.file_name}</strong>
        <span className="text-muted">{photo.content_type || "Файл"}</span>
        {photo.size_bytes ? <small>{Math.max(1, Math.round(photo.size_bytes / 1024))} KB</small> : null}
        {isLoading ? <small className="text-muted">Завантаження...</small> : null}
        {hasError ? <small className="text-danger">Помилка завантаження</small> : null}
      </div>
    </a>
  );
}

export function ReportMediaGallery({ photos }: { photos: ReportPhoto[] }) {
  if (!photos.length) {
    return (
      <div className="photo-grid">
        <div className="photo-card empty-photo-card">Фото або відео не додано</div>
      </div>
    );
  }

  return (
    <div className="photo-grid">
      {photos.map((photo) => <ReportMediaCard key={photo.id} photo={photo} />)}
    </div>
  );
}
