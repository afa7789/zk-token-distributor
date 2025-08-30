import { create } from 'zustand';

interface CalldataFile {
  id: string;
  name: string;
  content: string;
  uploadedAt: Date;
  size: number;
}

interface FileState {
  files: CalldataFile[];
  selectedFile: CalldataFile | null;
  isUploading: boolean;
  uploadProgress: number;
  addFile: (file: Omit<CalldataFile, 'id' | 'uploadedAt'>) => void;
  removeFile: (id: string) => void;
  selectFile: (file: CalldataFile | null) => void;
  setUploading: (uploading: boolean) => void;
  setUploadProgress: (progress: number) => void;
  clearFiles: () => void;
}

export const useFileStore = create<FileState>((set) => ({
  files: [],
  selectedFile: null,
  isUploading: false,
  uploadProgress: 0,
  addFile: (fileData) =>
    set((state) => ({
      files: [
        ...state.files,
        {
          ...fileData,
          id: crypto.randomUUID(),
          uploadedAt: new Date(),
        },
      ],
    })),
  removeFile: (id) =>
    set((state) => ({
      files: state.files.filter((file) => file.id !== id),
      selectedFile: state.selectedFile?.id === id ? null : state.selectedFile,
    })),
  selectFile: (file) => set({ selectedFile: file }),
  setUploading: (uploading) => set({ isUploading: uploading }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  clearFiles: () => set({ files: [], selectedFile: null }),
}));
