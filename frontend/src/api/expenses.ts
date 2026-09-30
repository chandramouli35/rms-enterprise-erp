import api from './axios';

export const expensesApi = {
  listFunds: (plantId: string) =>
    api.get('/expenses/funds', { params: { plantId } }),
  createFund: (data: {
    plantId: string;
    date: string;
    amount: number;
    toName: string;
    notes?: string;
  }) => api.post('/expenses/funds', data),
  listExpenses: (plantId: string) =>
    api.get('/expenses/entries', { params: { plantId } }),
  partyOptions: () => api.get('/expenses/party-options'),
  createExpenses: (data: {
    plantId: string;
    date?: string;
    biometricData: string;
    lines: Array<{
      partyId?: string;
      partyNotApplicable?: boolean;
      itemsBought?: string;
      itemsNotApplicable?: boolean;
      amount: number;
      gpNo?: string;
      gpNotApplicable?: boolean;
      workOrderNo?: string;
      workOrderNotApplicable?: boolean;
    }>;
  }) => api.post('/expenses/entries', data),
  dayBook: (plantId: string, date: string) =>
    api.get('/expenses/day-book', { params: { plantId, date } }),
  dayBooks: (plantId: string, from: string, to: string) =>
    api.get('/expenses/day-books', { params: { plantId, from, to } }),
  compactSummary: (plantId: string, from?: string, to?: string) =>
    api.get('/expenses/compact-summary', {
      params: { plantId, ...(from ? { from } : {}), ...(to ? { to } : {}) },
    }),
  millWiseChart: (from?: string, to?: string) =>
    api.get('/expenses/mill-wise-chart', {
      params: { ...(from ? { from } : {}), ...(to ? { to } : {}) },
    }),
  listTickets: (plantId?: string) =>
    api.get('/expenses/tickets', { params: plantId ? { plantId } : {} }),
  listSupervisors: () => api.get('/expenses/supervisors'),
  createTicket: (data: {
    plantId: string;
    date: string;
    expenseEntryId?: string;
    expenseFundId?: string;
    section?: string;
    raisedToUserId: string;
    note?: string;
  }) => api.post('/expenses/tickets', data),
  updateTicket: (id: string, status: string) =>
    api.patch(`/expenses/tickets/${id}`, { status }),
};
