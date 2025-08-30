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
  ): SiweMessage {
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

    return message;
  }

  static async signMessage(
    message: SiweMessage,
    signer: { signMessage: (message: string) => Promise<string> }
  ): Promise<string> {
    const messageString = message.prepareMessage();
    const signature = await signer.signMessage(messageString);
    return signature;
  }

  static async verifyMessage(
    message: SiweMessage,
    signature: string
  ): Promise<{ success: boolean; data?: SiweMessage }> {
    try {
      const result = await message.verify({ signature });
      return { success: result.success, data: result.data };
    } catch (error) {
      console.error('SIWE verification failed:', error);
      return { success: false };
    }
  }
}

export default SIWEUtils;
