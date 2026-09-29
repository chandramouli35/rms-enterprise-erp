import api from './axios';

export const cmsApi = {
  overview: () => api.get('/cms/basis-tracking'),
  basisTracking: () => api.get('/cms/basis-tracking'),
  paddyInward: (plantId?: string) =>
    api.get('/cms/paddy-inward', { params: plantId ? { plantId } : {} }),
  boliRecords: (plantId?: string) =>
    api.get('/cms/boli-records', { params: plantId ? { plantId } : {} }),
  gatePass: (plantId?: string) =>
    api.get('/cms/gate-pass', { params: plantId ? { plantId } : {} }),
  paddyStock: (plantId?: string) =>
    api.get('/cms/paddy-stock', { params: plantId ? { plantId } : {} }),
  production: (plantId?: string) =>
    api.get('/cms/production', { params: plantId ? { plantId } : {} }),
  stockLedger: (plantId?: string) =>
    api.get('/cms/stock-ledger', { params: plantId ? { plantId } : {} }),
  yield: (plantId?: string) =>
    api.get('/cms/yield', { params: plantId ? { plantId } : {} }),
  alerts: (plantId?: string) =>
    api.get('/cms/alerts', { params: plantId ? { plantId } : {} }),
  traceability: (plantId?: string) =>
    api.get('/cms/traceability', { params: plantId ? { plantId } : {} }),
  plantComparison: () => api.get('/cms/plant-comparison'),
  manualCorrections: (plantId?: string) =>
    api.get('/cms/manual-corrections', { params: plantId ? { plantId } : {} }),
  overprice: (plantId?: string) =>
    api.get('/cms/overprice', { params: plantId ? { plantId } : {} }),
  weighmentPatterns: (plantId?: string) =>
    api.get('/cms/weighment-patterns', { params: plantId ? { plantId } : {} }),
  correctionAudit: (plantId?: string) =>
    api.get('/cms/correction-audit', { params: plantId ? { plantId } : {} }),
  auditLogs: (plantId?: string) =>
    api.get('/cms/audit-logs', { params: plantId ? { plantId } : {} }),
  severity: (plantId?: string) =>
    api.get('/cms/severity', { params: plantId ? { plantId } : {} }),
  stockDispatch: (plantId?: string) =>
    api.get('/cms/stock-dispatch', { params: plantId ? { plantId } : {} }),
  receivables: () => api.get('/cms/receivables'),
  paddyCost: (plantId?: string) =>
    api.get('/cms/paddy-cost', { params: plantId ? { plantId } : {} }),
};
