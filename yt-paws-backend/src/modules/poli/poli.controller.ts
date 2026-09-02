import { Controller } from '@nestjs/common';
import { PoliService } from './poli.service';

// Route handlers are intentionally deferred. Adding an initiation or
// notification endpoint before POLi confirms its UAT contract would encode
// assumptions about request fields, authentication, and callback semantics.
@Controller('payments/poli')
export class PoliController {
  constructor(private readonly poliService: PoliService) {}
}
