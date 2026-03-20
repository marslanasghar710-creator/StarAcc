import { apiClient } from "@/lib/api/client";
import { sanitizeDecimalInput } from "@/lib/accounting/decimal";

import type { Bill, BillAttachment, BillHeaderUpdatePayload, BillItem, BillMutationPayload, DocumentLink, RawBill, RawBillItem, StoredFile } from "@/features/bills/types";

function adaptBillItem(raw: RawBillItem, index: number): BillItem {
  return {
    id: raw.id,
    lineNumber: raw.line_number ?? raw.lineNumber ?? index + 1,
    description: raw.description ?? "",
    quantity: sanitizeDecimalInput(raw.quantity ?? 0),
    unitPrice: sanitizeDecimalInput(raw.unit_price ?? raw.unitPrice ?? 0),
    accountId: raw.account_id ?? raw.accountId ?? "",
    accountCode: raw.account_code ?? raw.accountCode ?? null,
    accountName: raw.account_name ?? raw.accountName ?? null,
    itemCode: raw.item_code ?? raw.itemCode ?? null,
    discountPercent: raw.discount_percent != null || raw.discountPercent != null ? sanitizeDecimalInput(raw.discount_percent ?? raw.discountPercent ?? 0) : null,
    discountAmount: raw.discount_amount != null || raw.discountAmount != null ? sanitizeDecimalInput(raw.discount_amount ?? raw.discountAmount ?? 0) : null,
    taxCodeId: raw.tax_code_id ?? raw.taxCodeId ?? null,
    taxCodeName: raw.tax_code_name ?? raw.taxCodeName ?? null,
    lineSubtotal: sanitizeDecimalInput(raw.line_subtotal ?? raw.lineSubtotal ?? 0),
    lineTaxAmount: sanitizeDecimalInput(raw.line_tax_amount ?? raw.lineTaxAmount ?? 0),
    lineTotal: sanitizeDecimalInput(raw.line_total ?? raw.lineTotal ?? 0),
  };
}

function adaptBill(raw: RawBill): Bill {
  return {
    id: raw.id,
    organizationId: raw.organization_id ?? raw.organizationId,
    supplierId: raw.supplier_id ?? raw.supplierId ?? "",
    supplierName: raw.supplier_name ?? raw.supplierName ?? null,
    supplierEmail: raw.supplier_email ?? raw.supplierEmail ?? null,
    billNumber: raw.bill_number ?? raw.billNumber ?? "Pending",
    status: raw.status,
    issueDate: raw.issue_date ?? raw.issueDate ?? "",
    dueDate: raw.due_date ?? raw.dueDate ?? "",
    currencyCode: raw.currency_code ?? raw.currencyCode ?? "USD",
    subtotalAmount: sanitizeDecimalInput(raw.subtotal_amount ?? raw.subtotalAmount ?? 0),
    taxAmount: sanitizeDecimalInput(raw.tax_amount ?? raw.taxAmount ?? 0),
    totalAmount: sanitizeDecimalInput(raw.total_amount ?? raw.totalAmount ?? 0),
    amountPaid: sanitizeDecimalInput(raw.amount_paid ?? raw.amountPaid ?? 0),
    amountDue: sanitizeDecimalInput(raw.amount_due ?? raw.amountDue ?? 0),
    pricesEnteredAre: raw.prices_entered_are ?? raw.pricesEnteredAre ?? null,
    reference: raw.reference ?? null,
    supplierInvoiceNumber: raw.supplier_invoice_number ?? raw.supplierInvoiceNumber ?? null,
    notes: raw.notes ?? null,
    terms: raw.terms ?? null,
    approvedAt: raw.approved_at ?? raw.approvedAt ?? null,
    postedAt: raw.posted_at ?? raw.postedAt ?? null,
    postedJournalId: raw.posted_journal_id ?? raw.postedJournalId ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? null,
    updatedAt: raw.updated_at ?? raw.updatedAt ?? null,
    items: (raw.items ?? []).map(adaptBillItem),
  };
}

function adaptStoredFile(raw: Record<string, unknown>): StoredFile {
  return {
    id: String(raw.id ?? ""),
    originalFileName: String(raw.original_file_name ?? raw.originalFileName ?? "Unnamed file"),
    mimeType: String(raw.mime_type ?? raw.mimeType ?? "application/octet-stream"),
    fileSizeBytes: Number(raw.file_size_bytes ?? raw.fileSizeBytes ?? 0),
  };
}

function adaptDocumentLink(raw: Record<string, unknown>): DocumentLink {
  return {
    id: String(raw.id ?? ""),
    fileId: String(raw.file_id ?? raw.fileId ?? ""),
    entityType: String(raw.entity_type ?? raw.entityType ?? "bill"),
    entityId: String(raw.entity_id ?? raw.entityId ?? ""),
    linkedAt: typeof raw.linked_at === "string" ? raw.linked_at : typeof raw.linkedAt === "string" ? raw.linkedAt : null,
    label: typeof raw.label === "string" ? raw.label : null,
  };
}

export async function listBills(organizationId: string) {
  const response = await apiClient<{ items: RawBill[] }>(`/organizations/${organizationId}/bills`);
  return response.items.map(adaptBill);
}

export async function searchBills(organizationId: string, query: string) {
  const response = await apiClient<{ items: RawBill[] }>(`/organizations/${organizationId}/bills/search?q=${encodeURIComponent(query)}`);
  return response.items.map(adaptBill);
}

export async function listOpenBills(organizationId: string) {
  const response = await apiClient<{ items: RawBill[] }>(`/organizations/${organizationId}/bills/open`);
  return response.items.map(adaptBill);
}

export async function listOverdueBills(organizationId: string) {
  const response = await apiClient<{ items: RawBill[] }>(`/organizations/${organizationId}/bills/overdue`);
  return response.items.map(adaptBill);
}

export async function getBill(organizationId: string, billId: string) {
  const response = await apiClient<RawBill>(`/organizations/${organizationId}/bills/${billId}`);
  return adaptBill(response);
}

export async function createBill(organizationId: string, payload: BillMutationPayload) {
  const response = await apiClient<RawBill>(`/organizations/${organizationId}/bills`, { method: "POST", body: payload });
  return adaptBill(response);
}

export async function updateBillHeader(organizationId: string, billId: string, payload: BillHeaderUpdatePayload) {
  const response = await apiClient<RawBill>(`/organizations/${organizationId}/bills/${billId}`, { method: "PATCH", body: payload });
  return adaptBill(response);
}

export async function deleteBill(organizationId: string, billId: string) {
  return apiClient<{ message: string }>(`/organizations/${organizationId}/bills/${billId}`, { method: "DELETE" });
}

export async function approveBill(organizationId: string, billId: string) {
  const response = await apiClient<RawBill>(`/organizations/${organizationId}/bills/${billId}/approve`, { method: "POST" });
  return adaptBill(response);
}

export async function postBill(organizationId: string, billId: string) {
  const response = await apiClient<RawBill>(`/organizations/${organizationId}/bills/${billId}/post`, { method: "POST" });
  return adaptBill(response);
}

export async function voidBill(organizationId: string, billId: string, reason: string) {
  const response = await apiClient<RawBill>(`/organizations/${organizationId}/bills/${billId}/void`, { method: "POST", body: { reason } });
  return adaptBill(response);
}

export async function addBillItem(organizationId: string, billId: string, payload: Record<string, unknown>) {
  const response = await apiClient<RawBill>(`/organizations/${organizationId}/bills/${billId}/items`, { method: "POST", body: payload });
  return adaptBill(response);
}

export async function updateBillItem(organizationId: string, billId: string, itemId: string, payload: Record<string, unknown>) {
  const response = await apiClient<RawBill>(`/organizations/${organizationId}/bills/${billId}/items/${itemId}`, { method: "PATCH", body: payload });
  return adaptBill(response);
}

export async function deleteBillItem(organizationId: string, billId: string, itemId: string) {
  const response = await apiClient<RawBill>(`/organizations/${organizationId}/bills/${billId}/items/${itemId}`, { method: "DELETE" });
  return adaptBill(response);
}

export async function listBillDocumentLinks(organizationId: string, billId: string) {
  const response = await apiClient<{ items: Record<string, unknown>[] }>(`/organizations/${organizationId}/documents/entity/bill/${billId}`);
  return response.items.map(adaptDocumentLink);
}

export async function listStoredFiles(organizationId: string) {
  const response = await apiClient<{ items: Record<string, unknown>[] }>(`/organizations/${organizationId}/files`);
  return response.items.map(adaptStoredFile);
}

export async function linkBillFile(organizationId: string, billId: string, fileId: string, label?: string) {
  const response = await apiClient<Record<string, unknown>>(`/organizations/${organizationId}/documents/links`, {
    method: "POST",
    body: { file_id: fileId, entity_type: "bill", entity_id: billId, label: label || null },
  });
  return adaptDocumentLink(response);
}

export async function getBillAttachments(organizationId: string, billId: string): Promise<BillAttachment[]> {
  const [links, files] = await Promise.all([listBillDocumentLinks(organizationId, billId), listStoredFiles(organizationId)]);
  const fileMap = new Map(files.map((file) => [file.id, file]));
  return links.map((link) => ({ link, file: fileMap.get(link.fileId) ?? null }));
}
