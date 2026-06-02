import { PrismaBackupSnapshotRepository } from "./repositories/PrismaBackupSnapshotRepository";
import { BackupService } from "./services/BackupService";

const backupRepo = new PrismaBackupSnapshotRepository();
export const backupService = new BackupService(backupRepo);
