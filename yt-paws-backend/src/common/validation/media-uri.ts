// Shared shape check for the base64-data-URI-until-real-storage-exists
// fields (Pet.photoUrl, Business.wechatQrCodeUrl, DailyReport.mediaUrls) —
// accepts either a real hosted https:// URL or a data: URI of an image
// type actually produced by the app's image pickers (base64: true captures
// JPEG; png/webp included for anything sourced elsewhere).
export const MEDIA_URI_PATTERN = /^(https:\/\/|data:image\/(jpeg|png|webp);base64,)/;
export const MAX_MEDIA_URI_LENGTH = 2_000_000;
