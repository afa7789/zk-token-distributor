import { useCallback, useState } from 'react';
import { useFileStore } from '@/store/fileStore';
import { apiClient } from '@/lib/api';

export const useFileManagement = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    files,
    selectedFile,
    addFile,
    selectFile,
    setUploading,
    setUploadProgress,
  } = useFileStore();

  const generateCalldata = useCallback(async (address: string, sessionToken: string) => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await apiClient.generateCalldata({ address, sessionToken });

      if (response.success && response.data) {
        // Add generated file to store
        addFile({
          name: `calldata_${Date.now()}.json`,
          content: JSON.stringify(response.data, null, 2),
          size: JSON.stringify(response.data).length,
        });

        return response.data;
      } else {
        throw new Error(response.error || 'Failed to generate calldata');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, [addFile]);

  const downloadFile = useCallback(async (fileId: string) => {
    try {
      setUploading(true);
      setUploadProgress(0);

      const response = await apiClient.downloadCalldata(fileId);

      if (response.success && response.data) {
        // Create download link
        const url = URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `calldata_${fileId}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        setUploadProgress(100);
      } else {
        throw new Error(response.error || 'Download failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Download failed';
      setError(errorMessage);
      throw err;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [setUploading, setUploadProgress]);

  const uploadProofFile = useCallback((file: File) => {
    return new Promise<void>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          
          // Validate JSON
          JSON.parse(content);

          addFile({
            name: file.name,
            content,
            size: file.size,
          });

          resolve();
        } catch {
          reject(new Error('Invalid JSON file'));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }, [addFile]);

  return {
    files,
    selectedFile,
    isGenerating,
    error,
    generateCalldata,
    downloadFile,
    uploadProofFile,
    selectFile,
    clearError: () => setError(null),
  };
};

export default useFileManagement;
