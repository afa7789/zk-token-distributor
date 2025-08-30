import { APIResponse, GenerateCalldataRequest, ClaimRequest } from '@/types/api';

class APIClient {
  private baseURL: string;

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<APIResponse<T>> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Authentication endpoints
  async getNonce(): Promise<APIResponse<{ nonce: string }>> {
    return this.request('/auth/nonce');
  }

  async verifySignature(
    message: string,
    signature: string
  ): Promise<APIResponse<{ token: string }>> {
    return this.request('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ message, signature }),
    });
  }

  // Calldata endpoints
  async generateCalldata(
    request: GenerateCalldataRequest
  ): Promise<APIResponse<{ fileId: string; downloadUrl: string }>> {
    return this.request('/calldata/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async downloadCalldata(fileId: string): Promise<APIResponse<Blob>> {
    try {
      const response = await fetch(`${this.baseURL}/calldata/download/${fileId}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      return {
        success: true,
        data: blob,
      };
    } catch (error) {
      console.error('Download failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Download failed',
      };
    }
  }

  async getUserFiles(
    sessionToken: string
  ): Promise<APIResponse<{ files: { id: string; name: string; createdAt: string }[] }>> {
    return this.request('/user/files', {
      headers: {
        Authorization: `Bearer ${sessionToken}`,
      },
    });
  }

  // Claim endpoint
  async submitClaim(
    request: ClaimRequest
  ): Promise<APIResponse<{ txHash: string }>> {
    return this.request('/claim', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}

export const apiClient = new APIClient();
export default apiClient;
