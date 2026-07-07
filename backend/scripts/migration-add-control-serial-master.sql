BEGIN TRY

BEGIN TRAN;

-- AlterTable: add masterId FK column to existing ControlSerial table
ALTER TABLE [dbo].[ControlSerial] ADD [masterId] NVARCHAR(1000);

-- CreateTable: new ControlSerialMaster table
CREATE TABLE [dbo].[ControlSerialMaster] (
    [id] NVARCHAR(1000) NOT NULL,
    [productId] NVARCHAR(1000),
    [poNumber] NVARCHAR(1000),
    [supplierId] NVARCHAR(1000),
    [isSentToSupplier] BIT NOT NULL CONSTRAINT [ControlSerialMaster_isSentToSupplier_df] DEFAULT 0,
    [receivedStatus] NVARCHAR(1000) NOT NULL CONSTRAINT [ControlSerialMaster_receivedStatus_df] DEFAULT 'pending',
    [isArchived] BIT NOT NULL CONSTRAINT [ControlSerialMaster_isArchived_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ControlSerialMaster_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [ControlSerialMaster_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- DropForeignKey (old constraints, re-added below with NoAction)
ALTER TABLE [dbo].[ControlSerial] DROP CONSTRAINT [ControlSerial_ItemCode_fkey];
ALTER TABLE [dbo].[ControlSerial] DROP CONSTRAINT [ControlSerial_supplierId_fkey];

-- AddForeignKey: ControlSerialMaster -> TblItemCodes1S1Br
ALTER TABLE [dbo].[ControlSerialMaster] ADD CONSTRAINT [ControlSerialMaster_productId_fkey]
    FOREIGN KEY ([productId]) REFERENCES [dbo].[TblItemCodes1S1Br]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey: ControlSerialMaster -> Supplier
ALTER TABLE [dbo].[ControlSerialMaster] ADD CONSTRAINT [ControlSerialMaster_supplierId_fkey]
    FOREIGN KEY ([supplierId]) REFERENCES [dbo].[Supplier]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey: ControlSerial -> TblItemCodes1S1Br (NoAction)
ALTER TABLE [dbo].[ControlSerial] ADD CONSTRAINT [ControlSerial_ItemCode_fkey]
    FOREIGN KEY ([ItemCode]) REFERENCES [dbo].[TblItemCodes1S1Br]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey: ControlSerial -> ControlSerialMaster
ALTER TABLE [dbo].[ControlSerial] ADD CONSTRAINT [ControlSerial_masterId_fkey]
    FOREIGN KEY ([masterId]) REFERENCES [dbo].[ControlSerialMaster]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey: ControlSerial -> Supplier (NoAction)
ALTER TABLE [dbo].[ControlSerial] ADD CONSTRAINT [ControlSerial_supplierId_fkey]
    FOREIGN KEY ([supplierId]) REFERENCES [dbo].[Supplier]([id])
    ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
