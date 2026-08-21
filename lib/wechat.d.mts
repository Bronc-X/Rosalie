export interface SignatureInput {
  jsapiTicket: string;
  nonceStr: string;
  timestamp: number;
  url: string;
}

export function normalizeShareUrl(value: string): string;
export function createWechatSignature(input: SignatureInput): Promise<string>;
