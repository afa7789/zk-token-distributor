import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

interface FileUploadProps {
  onFileUpload: (file: File) => Promise<void>;
  accept?: string;
  maxSize?: number;
  isUploading?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileUpload,
  accept = '.json',
  maxSize = 1024 * 1024, // 1MB
  isUploading = false,
}) => {
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        try {
          await onFileUpload(acceptedFiles[0]);
        } catch (error) {
          console.error('File upload failed:', error);
        }
      }
    },
    [onFileUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
    },
    maxSize,
    multiple: false,
    disabled: isUploading,
  });

  return (
    <div
      {...getRootProps()}
      className={`
        border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'}
        ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400'}
      `}
    >
      <input {...getInputProps()} />
      <div className="space-y-2">
        <div className="text-gray-600">
          {isDragActive ? (
            <p>Drop the file here...</p>
          ) : (
            <p>Drag & drop a JSON file here, or click to select</p>
          )}
        </div>
        <p className="text-sm text-gray-500">
          Accepts JSON files up to {Math.round(maxSize / 1024)}KB
        </p>
        {isUploading && (
          <p className="text-sm text-blue-600">Uploading...</p>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
