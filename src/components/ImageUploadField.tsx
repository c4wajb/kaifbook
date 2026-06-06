"use client";

import { ImageIcon, LinkIcon, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";

const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png,image/webp,image/avif";

type ImageUploadFieldProps = {
  restaurantId?: string;
  name: string;
  label: string;
  value?: string | null;
  hint?: string;
  compact?: boolean;
};

type ImageGalleryUploadFieldProps = {
  restaurantId?: string;
  name: string;
  label: string;
  values?: string[];
  hint?: string;
};

async function uploadImages(restaurantId: string, files: File[]) {
  const formData = new FormData();
  files.forEach((file) => formData.append("file", file));

  const response = await fetch(`/api/owner/restaurants/${restaurantId}/uploads/image`, {
    method: "POST",
    body: formData,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Не удалось загрузить изображение. Попробуйте ещё раз.");
  }

  return Array.isArray(data.urls) ? data.urls.map(String) : [String(data.url || "")].filter(Boolean);
}

function normalizeUrl(value: string) {
  return value.trim();
}

export function ImageUploadField({
  restaurantId,
  name,
  label,
  value,
  hint,
  compact,
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [imageUrl, setImageUrl] = useState(value || "");
  const [urlInput, setUrlInput] = useState(value || "");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setImageUrl(value || "");
    setUrlInput(value || "");
  }, [value]);

  async function handleFiles(files: FileList | File[]) {
    const selected = Array.from(files).filter(Boolean);
    if (selected.length === 0) return;
    if (!restaurantId) {
      setError("Сначала сохраните ресторан, затем загрузите файл.");
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const [uploadedUrl] = await uploadImages(restaurantId, [selected[0]]);
      setImageUrl(uploadedUrl || "");
      setUrlInput(uploadedUrl || "");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить изображение.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function applyUrl() {
    const nextUrl = normalizeUrl(urlInput);
    setImageUrl(nextUrl);
    setUrlInput(nextUrl);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    void handleFiles(event.dataTransfer.files);
  }

  return (
    <div className={`image-upload-field${compact ? " compact" : ""}`}>
      <input type="hidden" name={name} value={imageUrl} />
      <div className="image-upload-label">
        <span>{label}</span>
        {hint ? <small>{hint}</small> : null}
      </div>

      <div
        className={`image-upload-dropzone${isDragging ? " is-dragging" : ""}${imageUrl ? " has-image" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" />
        ) : (
          <div className="image-upload-placeholder">
            <ImageIcon size={24} aria-hidden />
            <strong>Перетащите фото сюда</strong>
            <span>или выберите файл на компьютере</span>
          </div>
        )}
      </div>

      <div className="image-upload-actions">
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            if (event.target.files) void handleFiles(event.target.files);
          }}
        />
        <button
          className="secondary-button icon-text"
          type="button"
          disabled={isUploading || !restaurantId}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? <Loader2 size={16} aria-hidden className="spin" /> : <Upload size={16} aria-hidden />}
          {isUploading ? "Загрузка..." : "Загрузить фото"}
        </button>
        {imageUrl ? (
          <button
            className="ghost icon-text"
            type="button"
            disabled={isUploading}
            onClick={() => {
              setImageUrl("");
              setUrlInput("");
              setError(null);
            }}
          >
            <Trash2 size={16} aria-hidden />
            Удалить фото
          </button>
        ) : null}
      </div>

      <div className="image-upload-url-row">
        <LinkIcon size={16} aria-hidden />
        <input
          type="text"
          value={urlInput}
          placeholder="или вставьте ссылку на изображение"
          onChange={(event) => setUrlInput(event.target.value)}
          onBlur={applyUrl}
        />
        <button className="secondary-button" type="button" onClick={applyUrl}>
          Применить
        </button>
      </div>

      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}

export function ImageGalleryUploadField({
  restaurantId,
  name,
  label,
  values,
  hint,
}: ImageGalleryUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [images, setImages] = useState<string[]>(values || []);
  const [urlInput, setUrlInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setImages(values || []);
  }, [values]);

  const hiddenValue = useMemo(() => JSON.stringify(images), [images]);

  async function handleFiles(files: FileList | File[]) {
    const selected = Array.from(files).filter(Boolean);
    if (selected.length === 0) return;
    if (!restaurantId) {
      setError("Сначала сохраните ресторан, затем загрузите файлы.");
      return;
    }

    setError(null);
    setIsUploading(true);
    try {
      const uploadedUrls = await uploadImages(restaurantId, selected);
      setImages((current) => [...current, ...uploadedUrls.filter(Boolean)]);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Не удалось загрузить изображения.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function addUrl() {
    const nextUrl = normalizeUrl(urlInput);
    if (!nextUrl) return;
    setImages((current) => [...current, nextUrl]);
    setUrlInput("");
    setError(null);
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    void handleFiles(event.dataTransfer.files);
  }

  return (
    <div className="image-gallery-upload-field">
      <input type="hidden" name={name} value={hiddenValue} />
      <div className="image-upload-label">
        <span>{label}</span>
        {hint ? <small>{hint}</small> : null}
      </div>

      <div
        className={`gallery-upload-dropzone${isDragging ? " is-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
      >
        <Upload size={18} aria-hidden />
        <strong>Загрузите несколько фото</strong>
        <span>JPG, PNG, WEBP или AVIF до 5 МБ</span>
        <button
          className="secondary-button icon-text"
          type="button"
          disabled={isUploading || !restaurantId}
          onClick={() => fileInputRef.current?.click()}
        >
          {isUploading ? <Loader2 size={16} aria-hidden className="spin" /> : <Plus size={16} aria-hidden />}
          {isUploading ? "Загрузка..." : "Выбрать файлы"}
        </button>
        <input
          ref={fileInputRef}
          className="sr-only"
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          multiple
          onChange={(event: ChangeEvent<HTMLInputElement>) => {
            if (event.target.files) void handleFiles(event.target.files);
          }}
        />
      </div>

      <div className="image-upload-url-row">
        <LinkIcon size={16} aria-hidden />
        <input
          type="text"
          value={urlInput}
          placeholder="Добавить ссылку на фото"
          onChange={(event) => setUrlInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addUrl();
            }
          }}
        />
        <button className="secondary-button" type="button" onClick={addUrl}>
          Добавить
        </button>
      </div>

      {images.length ? (
        <div className="gallery-upload-grid">
          {images.map((url, index) => (
            <div className="gallery-upload-card" key={`${url}-${index}`}>
              <img src={url} alt="" />
              <button
                type="button"
                aria-label="Удалить изображение"
                onClick={() => setImages((current) => current.filter((_, currentIndex) => currentIndex !== index))}
              >
                <Trash2 size={15} aria-hidden />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="image-upload-empty">Фотографии пока не добавлены.</p>
      )}

      {error ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
