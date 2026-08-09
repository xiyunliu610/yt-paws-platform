import type { ImageSourcePropType } from 'react-native';

export function authenticatedMediaSource(uri: string, token: string | null): ImageSourcePropType {
  return token && uri.includes('/media/files/')
    ? { uri, headers: { Authorization: `Bearer ${token}` } }
    : { uri };
}
