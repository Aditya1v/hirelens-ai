import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { formatSize } from "~/lib/utils";

interface FileUploaderProps {
  onFileSelect?: (file: File | null) => void;
}

export const FileUploader = ({ onFileSelect }: FileUploaderProps) => {
  // Bug fix: the original component derived the displayed file from
  // react-dropzone's own `acceptedFiles`, so clicking "remove" (which only
  // cleared the parent's state) never actually updated what was shown here.
  // Tracking selection locally and clearing it on remove fixes that.
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const selected = acceptedFiles[0] || null;
      setFile(selected);
      onFileSelect?.(selected);
    },
    [onFileSelect]
  );

  const maxFileSize = 20 * 1024 * 1024; // 20MB
  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    multiple: false,
    accept: { "application/pdf": [".pdf"] },
    maxSize: maxFileSize,
  });

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFile(null);
    onFileSelect?.(null);
  };

  return (
    <div className="w-full gradient-border !p-0">
      <div {...getRootProps()} className="uplader-drag-area">
        <input {...getInputProps()} aria-label="Upload resume PDF" />
        <div className="space-y-4 cursor-pointer">
          {file ? (
            <div className="uploader-selected-file" onClick={(e) => e.stopPropagation()}>
              <img src="/images/pdf.png" alt="" className="size-10" />
              <div className="flex items-center space-x-3">
                <div>
                  <p className="text-sm text-white/70 font-medium truncate max-w-xs">{file.name}</p>
                  <p className="text-sm text-white/50">{formatSize(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                aria-label={`Remove ${file.name}`}
                className="p-2 cursor-pointer rounded-full hover:bg-white/10 transition-colors"
                onClick={handleRemove}
              >
                <img src="/icons/cross.svg" alt="" className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div>
              <div className="mx-auto w-16 h-16 flex items-center justify-center mb-2">
                <img src="/icons/info.svg" alt="" className="size-20" />
              </div>
              <p className="text-lg text-white/50">
                <span className="font-semibold text-white/70">Click to upload</span> or drag and drop
              </p>
              <p className="text-sm text-white/40 mt-1">PDF (max {formatSize(maxFileSize)})</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
