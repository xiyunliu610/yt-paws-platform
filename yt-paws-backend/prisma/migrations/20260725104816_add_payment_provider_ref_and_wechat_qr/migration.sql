-- AlterTable
ALTER TABLE "Business" ADD COLUMN     "wechatQrCodeUrl" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "providerRef" TEXT;
