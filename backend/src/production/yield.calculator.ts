export class YieldCalculator {
  static calculateYield(rawMaterialQty: number, totalProductionQty: number): number {
    if (!rawMaterialQty || rawMaterialQty <= 0) return 0;
    const yieldPercentage = (totalProductionQty / rawMaterialQty) * 100;
    return parseFloat(yieldPercentage.toFixed(2));
  }

  static calculateProcessLossPercentage(rawMaterialQty: number, totalProcessLossQty: number): number {
    if (!rawMaterialQty || rawMaterialQty <= 0) return 0;
    const lossPercentage = (totalProcessLossQty / rawMaterialQty) * 100;
    return parseFloat(lossPercentage.toFixed(2));
  }
}
