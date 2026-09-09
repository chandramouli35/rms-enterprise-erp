import api from './axios';

export const junctionApi = {
  report: (params: {
    reportType: 'SALE' | 'PURCHASE';
    partyKey?: string;
    financeSodaId?: string;
  }) =>
    api.get('/finance/junction-report', {
      params: {
        reportType: params.reportType,
        ...(params.partyKey ? { partyKey: params.partyKey } : {}),
        ...(params.financeSodaId ? { financeSodaId: params.financeSodaId } : {}),
      },
    }),
};
