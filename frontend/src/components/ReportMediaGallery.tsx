import { ImageIcon, PlayCircle } from "lucide-react";

import { resolveApiUrl } from "../services/api";
import { ReportPhoto } from "../types/api";

function isImage(photo: ReportPhoto) {
  return Boolean(photo.content_type?.startsWith("image/")) || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(photo.file_name);
}

function isVideo(photo: ReportPhoto) {
  return Boolean(photo.content_type?.startsWith("video/")) || /\.(mp4|mov|avi|mkv|webm)$/i.test(photo.file_name);
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
      {photos.map((photo) => {
        const url = resolveApiUrl(photo.file_url);
        if (isImage(photo)) {
          return (
            <a className="photo-card media-card" href={url} key={photo.id} rel="noreferrer" target="_blank">
              <img alt={photo.caption || photo.file_name} src={url} />
              <div className="media-card-meta">
                <span className="media-card-label"><ImageIcon size={14} />Зображення</span>
                <strong>{photo.caption || photo.file_name}</strong>
              </div>
            </a>
          );
        }
        if (isVideo(photo)) {
          return (
            <a className="photo-card media-card" href={url} key={photo.id} rel="noreferrer" target="_blank">
              <video controls preload="metadata" src={url} />
              <div className="media-card-meta">
                <span className="media-card-label"><PlayCircle size={14} />Відео</span>
                <strong>{photo.caption || photo.file_name}</strong>
              </div>
            </a>
          );
        }
        return (
          <a className="photo-card media-card file-media-card" href={url} key={photo.id} rel="noreferrer" target="_blank">
            <div className="file-media-body">
              <strong>{photo.caption || photo.file_name}</strong>
              <span className="text-muted">{photo.content_type || "Файл"}</span>
              {photo.size_bytes ? <small>{Math.max(1, Math.round(photo.size_bytes / 1024))} KB</small> : null}
            </div>
          </a>
        );
      })}
    </div>
  );
}
