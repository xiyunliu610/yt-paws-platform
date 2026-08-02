// Shared shape check for the base64-data-URI-until-real-storage-exists
// fields (Pet.photoUrl, Business.wechatQrCodeUrl, DailyReport.mediaUrls) —
// accepts either a real hosted https:// URL or a data: URI of an image
// type actually produced by the app's image pickers (base64: true captures
// JPEG; png/webp included for anything sourced elsewhere).
// New writes must reference object storage. Legacy data: URIs remain readable
// and are migrated separately, but are no longer accepted by write DTOs.
export const MEDIA_URI_PATTERN = /^https:\/\//;
export const MAX_MEDIA_URI_LENGTH = 2_000_000;
