import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

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

@Injectable()
export class PoliService {
  constructor(private readonly configService: ConfigService) {}

  // This is deliberately the only POC behaviour until POLi supplies the
  // official UAT contract and credentials. It never returns secret values
  // and does not assume endpoint paths, authentication headers, or payloads.
  getConfigurationStatus(): PoliConfigurationStatus {
    const missing = POLI_CONFIGURATION_KEYS.filter(
      (key) => !this.configService.get<string>(key)?.trim(),
    );

    return { configured: missing.length === 0, missing };
  }
}
