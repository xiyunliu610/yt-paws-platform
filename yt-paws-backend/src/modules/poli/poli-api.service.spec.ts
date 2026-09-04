import { ConfigService } from '@nestjs/config';
import { PoliApiService } from './poli-api.service';

function configuredService(
  baseUrl = 'https://poliapi.uat3.paywithpoli.com/api',
) {
  return new PoliApiService(
    new ConfigService({
      POLI_MERCHANT_CODE: 'merchant-test-placeholder',
      POLI_AUTH_CODE: 'auth-test-placeholder',
      POLI_API_BASE_URL: baseUrl,
    }),
  );
}

describe('PoliApiService configuration boundary', () => {
  it('reports every missing UAT setting without exposing values', () => {
    const configService = new ConfigService();
    jest.spyOn(configService, 'get').mockReturnValue(undefined);
    const service = new PoliApiService(configService);

    expect(service.getConfigurationStatus()).toEqual({
      configured: false,
      missing: ['POLI_MERCHANT_CODE', 'POLI_AUTH_CODE', 'POLI_API_BASE_URL'],
    });
  });

  it('accepts the official UAT base URL and rejects credential exfiltration hosts', () => {
    expect(configuredService().getConfigurationStatus()).toEqual({
      configured: true,
      missing: [],
    });
    expect(
      configuredService(
        'https://malicious.example/api',
      ).getConfigurationStatus(),
    ).toEqual({ configured: false, missing: [] });
  });
});
