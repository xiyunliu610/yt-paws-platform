import { ConfigService } from '@nestjs/config';
import { PoliService } from './poli.service';

describe('PoliService configuration boundary', () => {
  it('reports every missing UAT setting without exposing values', () => {
    const configService = new ConfigService();
    jest.spyOn(configService, 'get').mockReturnValue(undefined);
    const service = new PoliService(configService);

    expect(service.getConfigurationStatus()).toEqual({
      configured: false,
      missing: ['POLI_MERCHANT_CODE', 'POLI_AUTH_CODE', 'POLI_API_BASE_URL'],
    });
  });

  it('reports configured only when all three official settings are present', () => {
    const configService = new ConfigService();
    jest.spyOn(configService, 'get').mockReturnValue('provided-by-poli');
    const service = new PoliService(configService);

    expect(service.getConfigurationStatus()).toEqual({
      configured: true,
      missing: [],
    });
  });
});
