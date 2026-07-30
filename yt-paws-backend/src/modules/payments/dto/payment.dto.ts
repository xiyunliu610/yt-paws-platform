import { IsString, Matches, MaxLength } from 'class-validator';

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
