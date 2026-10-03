-- Kuryer ariza formasi kengaytirildi: ism/familiya, transport rangi va davlat raqami
ALTER TABLE "CourierApplication" ADD COLUMN "firstName" TEXT;
ALTER TABLE "CourierApplication" ADD COLUMN "lastName" TEXT;
ALTER TABLE "CourierApplication" ADD COLUMN "vehicleColor" TEXT;
ALTER TABLE "CourierApplication" ADD COLUMN "vehicleNumber" TEXT;
