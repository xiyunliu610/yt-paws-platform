import { IsString, Matches, MaxLength } from 'class-validator';

const URL_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//;

export class InitiatePoliDto {
  @IsString()
  @Matches(URL_SCHEME_PATTERN, {
    message: 'returnUrl must be a scheme-qualified URL',
  })
  @MaxLength(500)
  returnUrl: string;
}
