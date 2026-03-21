export type BillStatus = "draft" | "approved" | "posted" | "partially_paid" | "paid" | "overdue" | "voided" | "cancelled";

export type RawBillItem = {
  id?: string;
  line_number?: number;
  lineNumber?: number;
  description?: string;
  quantity?: string | number;
  unit_price?: string | number;
  unitPrice?: string | number;
  account_id?: string;
  accountId?: string;
  account_code?: string | null;
  accountCode?: string | null;
  account_name?: string | null;
  accountName?: string | null;
  item_code?: string | null;
  itemCode?: string | null;
  discount_percent?: string | number | null;
  discountPercent?: string | number | null;
  discount_amount?: string | number | null;
  discountAmount?: string | number | null;
  tax_code_id?: string | null;
  taxCodeId?: string | null;
  tax_code_name?: string | null;
  taxCodeName?: string | null;
  line_subtotal?: string | number;
  lineSubtotal?: string | number;
  line_tax_amount?: string | number;
  lineTaxAmount?: string | number;
  line_total?: string | number;
  lineTotal?: string | number;
};

export type BillItem = {
  id?: string;
  lineNumber: number;
  description: string;
  quantity: string;
  unitPrice: string;
  accountId: string;
  accountCode?: string | null;
  accountName?: string | null;
  itemCode?: string | null;
  discountPercent?: string | null;
  discountAmount?: string | null;
  taxCodeId?: string | null;
  taxCodeName?: string | null;
  lineSubtotal: string;
  lineTaxAmount: string;
  lineTotal: string;
};

export type RawBill = {
  id: string;
  organization_id?: string;
  organizationId?: string;
  supplier_id?: string;
  supplierId?: string;
  supplier_name?: string | null;
  supplierName?: string | null;
  supplier_email?: string | null;
  supplierEmail?: string | null;
  bill_number?: string;
  billNumber?: string;
  status: BillStatus;
  issue_date?: string;
  issueDate?: string;
  due_date?: string;
  dueDate?: string;
  currency_code?: string;
  currencyCode?: string;
  subtotal_amount?: string | number;
  subtotalAmount?: string | number;
  tax_amount?: string | number;
  taxAmount?: string | number;
  total_amount?: string | number;
  totalAmount?: string | number;
  amount_paid?: string | number;
  amountPaid?: string | number;
  amount_due?: string | number;
  amountDue?: string | number;
  prices_entered_are?: string | null;
  pricesEnteredAre?: string | null;
  reference?: string | null;
  supplier_invoice_number?: string | null;
  supplierInvoiceNumber?: string | null;
  notes?: string | null;
  terms?: string | null;
  approved_at?: string | null;
  approvedAt?: string | null;
  posted_at?: string | null;
  postedAt?: string | null;
  posted_journal_id?: string | null;
  postedJournalId?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
  updated_at?: string | null;
  updatedAt?: string | null;
  items?: RawBillItem[];
};

export type Bill = {
  id: string;
  organizationId?: string;
  supplierId: string;
  supplierName?: string | null;
  supplierEmail?: string | null;
  billNumber: string;
  status: BillStatus;
  issueDate: string;
  dueDate: string;
  currencyCode: string;
  subtotalAmount: string;
  taxAmount: string;
  totalAmount: string;
  amountPaid: string;
  amountDue: string;
  pricesEnteredAre?: string | null;
  reference?: string | null;
  supplierInvoiceNumber?: string | null;
  notes?: string | null;
  terms?: string | null;
  approvedAt?: string | null;
  postedAt?: string | null;
  postedJournalId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  items: BillItem[];
};

export type BillMutationLinePayload = {
  description: string;
  quantity: string;
  unit_price: string;
  account_id: string;
  item_code?: string | null;
  discount_percent?: string | null;
  discount_amount?: string | null;
  tax_code_id?: string | null;
};

export type BillMutationPayload = {
  supplier_id: string;
  issue_date: string;
  due_date: string;
  currency_code: string;
  reference?: string | null;
  supplier_invoice_number?: string | null;
  notes?: string | null;
  terms?: string | null;
  items: BillMutationLinePayload[];
};

export type BillHeaderUpdatePayload = {
  due_date?: string;
  reference?: string | null;
  supplier_invoice_number?: string | null;
  notes?: string | null;
  terms?: string | null;
};

export type StoredFile = {
  id: string;
  originalFileName: string;
  mimeType: string;
  fileSizeBytes: number;
};

export type DocumentLink = {
  id: string;
  fileId: string;
  entityType: string;
  entityId: string;
  linkedAt?: string | null;
  label?: string | null;
};

export type BillAttachment = {
  link: DocumentLink;
  file?: StoredFile | null;
};
