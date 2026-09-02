async;
savePurchase(, data, any);
{
    try {
        return await this.procurementService.savePurchase(data);
    }
    catch (error) {
        console.error(error);
        throw new HttpException(`Failed to save: ${error.message || error}`, HttpStatus.BAD_REQUEST);
    }
}
getInwardDetails(, id, string);
{
    return this.procurementService.getInwardDetails(id);
}
getInwards(, plantId, string, , dateFrom ?  : string, , dateTo ?  : string, , mandi ?  : string, , supplierId ?  : string, , page ?  : string, , limit ?  : string);
{
    return this.procurementService.getInwards(plantId, dateFrom, dateTo, mandi, supplierId, page, limit);
}
getRecentPurchases(, plantId, string, , dateFrom ?  : string, , dateTo ?  : string, , page ?  : string, , limit ?  : string);
{
    return this.procurementService.getRecentPurchases(plantId, dateFrom, dateTo, page, limit);
}
getOccupiedStacks(, plantId, string);
{
    return this.procurementService.getOccupiedStacks(plantId);
}
getBatch(, batchId, string);
{
    return this.procurementService.getBatch(batchId);
}
updateQuality(, batchId, string, , data, any);
{
    return this.procurementService.updateQuality(batchId, data);
}
getSuppliers();
{
    return this.procurementService.getSuppliers();
}
createSupplier(, data, any);
{
    return this.procurementService.createSupplier(data);
}
getAnalytics(, plantId, string);
{
    return this.procurementService.getAnalytics(plantId);
}
getPurchaseRegister(, plantId, string, , filters, any);
{
    return this.procurementService.getPurchaseRegister(plantId, filters);
}
updateBoliRate(, batchId, string, , data, { newRate: number, arhtiaCorrection: number });
{
    try {
        return await this.procurementService.updateBoliRate(batchId, data.newRate, data.arhtiaCorrection);
    }
    catch (error) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
}
getSodaPending(, plantId, string, , dateFrom ?  : string, , dateTo ?  : string, , page ?  : string, , limit ?  : string);
{
    return this.procurementService.getSodaPending(plantId, dateFrom, dateTo, page, limit);
}
createSodaPending(, data, any);
{
    try {
        return await this.procurementService.createSodaPending(data);
    }
    catch (error) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
}
updateSodaPending(, id, string, , data, any);
{
    try {
        return await this.procurementService.updateSodaPending(id, data);
    }
    catch (error) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
}
settleHisab(, data, any);
{
    try {
        return await this.procurementService.settleHisab(data);
    }
    catch (error) {
        throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
    }
}
getPaddyStockReport(, plantId, string);
{
    return this.procurementService.getPaddyStockReport(plantId);
}
getShortageSummaryReport(, plantId, string, , mandiId ?  : string, , supplierId ?  : string, , dateFrom ?  : string, , dateTo ?  : string);
{
    return this.procurementService.getShortageSummaryReport(plantId, mandiId, supplierId, dateFrom, dateTo);
}
updateShortageRecovery(, id, string, , shortageRecoveryQtl, number);
{
    return this.procurementService.updateShortageRecovery(id, shortageRecoveryQtl);
}
transferStackToHoodi(, data, any);
{
    try {
        return await this.procurementService.transferStackToHoodi(data.plantId, data);
    }
    catch (error) {
        throw new HttpException(`Failed to transfer: ${error.message || error}`, HttpStatus.BAD_REQUEST);
    }
}
getHoodiReport(, plantId, string, , dateFrom ?  : string, , dateTo ?  : string);
{
    try {
        return await this.procurementService.getHoodiReport(plantId, dateFrom, dateTo);
    }
    catch (error) {
        throw new HttpException(`Failed to get report: ${error.message || error}`, HttpStatus.BAD_REQUEST);
    }
}
getStackLayout(, plantId, string);
{
    if (!plantId)
        throw new BadRequestException('plantId is required');
    return await this.procurementService.getStackLayout(plantId);
}
getStackHistory(, plantId, string, , stackNo, string);
{
    if (!plantId || !stackNo)
        throw new BadRequestException('plantId and stackNo required');
    return await this.procurementService.getStackHistory(plantId, stackNo);
}
markStackComplete(, stackNo, string, , plantId, string);
{
    if (!plantId)
        throw new BadRequestException('plantId is required');
    return await this.procurementService.markStackComplete(plantId, stackNo);
}
//# sourceMappingURL=procurement.controller.js.map