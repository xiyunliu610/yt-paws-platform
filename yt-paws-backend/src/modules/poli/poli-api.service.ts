import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PoliGetTransactionResponse,
  PoliInitiateTransactionRequest,
  PoliInitiateTransactionResponse,
} from './poli-api.types';

export const POLI_CONFIGURATION_KEYS = [
  'POLI_MERCHANT_CODE',
  'POLI_AUTH_CODE',
  'POLI_API_BASE_URL',
] as const;

export type PoliConfigurationKey = (typeof POLI_CONFIGURATION_KEYS)[number];

export interface PoliConfigurationStatus {
  configured: boolean;
  missing: PoliConfigurationKey[];
}

const OFFICIAL_POLI_API_BASE_URLS = new Set([
  'https://poliapi.uat3.paywithpoli.com/api',
  'https://poliapi.apac.paywithpoli.com/api',
]);

export class PoliApiRequestError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
    readonly definitive = false,
  ) {
    super(message);
  }
}

@Injectable()
export class PoliApiService {
  constructor(private readonly configService: ConfigService) {}

  getConfigurationStatus(): PoliConfigurationStatus {
    const missing = POLI_CONFIGURATION_KEYS.filter(
      (key) => !this.configService.get<string>(key)?.trim(),
    );
    if (missing.length > 0) {
      return { configured: false, missing };
    }

    return {
      configured: this.isOfficialBaseUrl(
        this.configService.get<string>('POLI_API_BASE_URL')!,
      ),
      missing: [],
    };
  }

  async initiateTransaction(
    request: PoliInitiateTransactionRequest,
  ): Promise<PoliInitiateTransactionResponse> {
    return this.request('/v2/Transaction/Initiate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getTransaction(token: string): Promise<PoliGetTransactionResponse> {
    const query = new URLSearchParams({ token });
    return this.request(`/v2/Transaction/GetTransaction?${query.toString()}`, {
      method: 'GET',
    });
  }

  private isOfficialBaseUrl(value: string) {
    try {
      const url = new URL(value);
      const normalized = `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
      return (
        !url.username &&
        !url.password &&
        !url.search &&
        !url.hash &&
        OFFICIAL_POLI_API_BASE_URLS.has(normalized)
      );
    } catch {
      return false;
    }
  }

  private getConfiguration() {
    const status = this.getConfigurationStatus();
    if (!status.configured) {
      throw new ServiceUnavailableException(
        status.missing.length > 0
          ? `POLi is not configured: ${status.missing.join(', ')}`
          : 'POLI_API_BASE_URL is not an official POLi API endpoint',
      );
    }

    return {
      baseUrl: this.configService
        .get<string>('POLI_API_BASE_URL')!
        .replace(/\/+$/, ''),
      merchantCode: this.configService.get<string>('POLI_MERCHANT_CODE')!,
      authCode: this.configService.get<string>('POLI_AUTH_CODE')!,
    };
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    const { baseUrl, merchantCode, authCode } = this.getConfiguration();
    const authorization = Buffer.from(`${merchantCode}:${authCode}`).toString(
      'base64',
    );

    let response: Response;
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...init,
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
        headers: {
          Accept: 'application/json',
          Authorization: `Basic ${authorization}`,
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
      });
    } catch {
      throw new PoliApiRequestError('POLi is temporarily unreachable');
    }

    if (!response.ok) {
      throw new PoliApiRequestError(
        `POLi returned HTTP ${response.status}`,
        response.status,
        response.status >= 400 && response.status < 500,
      );
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new PoliApiRequestError('POLi returned an invalid JSON response');
    }
  }
}
