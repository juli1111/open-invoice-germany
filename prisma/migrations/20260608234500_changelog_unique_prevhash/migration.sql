-- CreateIndex
CREATE UNIQUE INDEX "ChangeLog_orgId_prevHash_key" ON "ChangeLog"("orgId", "prevHash");
