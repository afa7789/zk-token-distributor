import { SiweMessage } from 'siwe';

export interface SIWEMessage {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
  notBefore?: string;
  requestId?: string;
  resources?: string[];
}

export class SIWEUtils {
  static generateNonce(): string {
    return crypto.randomUUID();
  }

  static createMessage(
    address: string,
    chainId: number,
    nonce: string,
    domain: string = window.location.host,
    uri: string = window.location.origin
  ): string {
    const message = new SiweMessage({
      domain,
      address,
      statement: 'Sign in to ZK Token Distributor',
      uri,
      version: '1',
      chainId,
      nonce,
      issuedAt: new Date().toISOString(),
    });

    return message.prepareMessage();
  }

  static async signMessage(
    messageString: string,
    signer: { signMessage: (message: string) => Promise<string> }
  ): Promise<string> {
    const signature = await signer.signMessage(messageString);
    return signature;
  }

  static async verifyMessage(
    messageString: string,
    signature: string
  ): Promise<{ success: boolean; data?: SiweMessage | undefined }> {
    try {
      const resp = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: messageString, signature }),
      });

      const json = await resp.json();
      return json;
    } catch (error) {
      console.error('SIWE verification failed (client):', error);
      return { success: false };
    }
  }
}

export default SIWEUtils;
