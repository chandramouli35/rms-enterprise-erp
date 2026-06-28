"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.YieldCalculator = void 0;
class YieldCalculator {
    static calculateYield(rawMaterialQty, totalProductionQty) {
        if (!rawMaterialQty || rawMaterialQty <= 0)
            return 0;
        const yieldPercentage = (totalProductionQty / rawMaterialQty) * 100;
        return parseFloat(yieldPercentage.toFixed(2));
    }
    static calculateProcessLossPercentage(rawMaterialQty, totalProcessLossQty) {
        if (!rawMaterialQty || rawMaterialQty <= 0)
            return 0;
        const lossPercentage = (totalProcessLossQty / rawMaterialQty) * 100;
        return parseFloat(lossPercentage.toFixed(2));
    }
}
exports.YieldCalculator = YieldCalculator;
//# sourceMappingURL=yield.calculator.js.map