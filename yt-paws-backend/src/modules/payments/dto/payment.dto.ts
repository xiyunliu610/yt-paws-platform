import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

// Not @IsUrl(): this is an Expo Linking.createURL() deep link (exp://..., or
// the app's own custom scheme in a standalone build), which isURL()'s
// protocol whitelist would reject. This just requires it to be
// scheme-shaped (RFC 3986 scheme, "://") rather than accepting any string.
const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;

export class InitiateStripeDto {
  @IsString()
  @Matches(URL_SCHEME_PATTERN, { message: 'returnUrl must be a scheme-qualified URL' })
  @MaxLength(500)
  returnUrl: string;
}

export class RefundPaymentDto {
  // Required, not optional: refunds move real money back out and need an
  // auditable reason (see PRD's refund-flow requirements), not just a tap.
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason: string;
}
