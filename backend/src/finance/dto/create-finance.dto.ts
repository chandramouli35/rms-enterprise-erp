export class CreateFinanceDto {
  plantId: string;
  transactionType: string;
  totalAmount: number;
  paidAmount?: number;
  partyName?: string;
  invoiceNo?: string;
  particulars?: string;
  category?: string;
  paymentStatus?: string;
  date?: string | Date;
}
