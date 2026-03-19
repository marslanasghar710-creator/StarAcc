import { apiClient } from "@/lib/api/client";
import { sanitizeDecimalInput } from "@/lib/accounting/decimal";

import type { DocumentLink, Invoice, InvoiceAttachment, InvoiceHeaderUpdatePayload, InvoiceItem, InvoiceMutationPayload, RawInvoice, RawInvoiceItem, StoredFile } from "@/features/invoices/types";

function adaptInvoiceItem(raw: RawInvoiceItem, index: number): InvoiceItem {
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

function adaptInvoice(raw: RawInvoice): Invoice {
  return {
    id: raw.id,
    organizationId: raw.organization_id ?? raw.organizationId,
    customerId: raw.customer_id ?? raw.customerId ?? "",
    customerName: raw.customer_name ?? raw.customerName ?? null,
    customerEmail: raw.customer_email ?? raw.customerEmail ?? null,
    invoiceNumber: raw.invoice_number ?? raw.invoiceNumber ?? "Pending",
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
    customerPoNumber: raw.customer_po_number ?? raw.customerPoNumber ?? null,
    notes: raw.notes ?? null,
    terms: raw.terms ?? null,
    approvedAt: raw.approved_at ?? raw.approvedAt ?? null,
    sentAt: raw.sent_at ?? raw.sentAt ?? null,
    postedAt: raw.posted_at ?? raw.postedAt ?? null,
    postedJournalId: raw.posted_journal_id ?? raw.postedJournalId ?? null,
    createdAt: raw.created_at ?? raw.createdAt ?? null,
    updatedAt: raw.updated_at ?? raw.updatedAt ?? null,
    items: (raw.items ?? []).map(adaptInvoiceItem),
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
    entityType: String(raw.entity_type ?? raw.entityType ?? "invoice"),
    entityId: String(raw.entity_id ?? raw.entityId ?? ""),
    linkedAt: typeof raw.linked_at === "string" ? raw.linked_at : typeof raw.linkedAt === "string" ? raw.linkedAt : null,
    label: typeof raw.label === "string" ? raw.label : null,
  };
}

export async function listInvoices(organizationId: string) {
  const response = await apiClient<{ items: RawInvoice[] }>(`/organizations/${organizationId}/invoices`);
  return response.items.map(adaptInvoice);
}

export async function searchInvoices(organizationId: string, query: string) {
  const response = await apiClient<{ items: RawInvoice[] }>(`/organizations/${organizationId}/invoices/search?q=${encodeURIComponent(query)}`);
  return response.items.map(adaptInvoice);
}

export async function listOpenInvoices(organizationId: string) {
  const response = await apiClient<{ items: RawInvoice[] }>(`/organizations/${organizationId}/invoices/open`);
  return response.items.map(adaptInvoice);
}

export async function listOverdueInvoices(organizationId: string) {
  const response = await apiClient<{ items: RawInvoice[] }>(`/organizations/${organizationId}/invoices/overdue`);
  return response.items.map(adaptInvoice);
}

export async function getInvoice(organizationId: string, invoiceId: string) {
  const response = await apiClient<RawInvoice>(`/organizations/${organizationId}/invoices/${invoiceId}`);
  return adaptInvoice(response);
}

export async function createInvoice(organizationId: string, payload: InvoiceMutationPayload) {
  const response = await apiClient<RawInvoice>(`/organizations/${organizationId}/invoices`, {
    method: "POST",
    body: payload,
  });
  return adaptInvoice(response);
}

export async function updateInvoiceHeader(organizationId: string, invoiceId: string, payload: InvoiceHeaderUpdatePayload) {
  const response = await apiClient<RawInvoice>(`/organizations/${organizationId}/invoices/${invoiceId}`, {
    method: "PATCH",
    body: payload,
  });
  return adaptInvoice(response);
}

export async function deleteInvoice(organizationId: string, invoiceId: string) {
  return apiClient<{ message: string }>(`/organizations/${organizationId}/invoices/${invoiceId}`, { method: "DELETE" });
}

export async function approveInvoice(organizationId: string, invoiceId: string) {
  const response = await apiClient<RawInvoice>(`/organizations/${organizationId}/invoices/${invoiceId}/approve`, { method: "POST" });
  return adaptInvoice(response);
}

export async function sendInvoice(organizationId: string, invoiceId: string) {
  const response = await apiClient<RawInvoice>(`/organizations/${organizationId}/invoices/${invoiceId}/send`, { method: "POST" });
  return adaptInvoice(response);
}

export async function sendInvoiceEmail(organizationId: string, invoiceId: string) {
  return apiClient<Record<string, unknown>>(`/organizations/${organizationId}/invoices/${invoiceId}/send-email`, { method: "POST" });
}

export async function postInvoice(organizationId: string, invoiceId: string) {
  const response = await apiClient<RawInvoice>(`/organizations/${organizationId}/invoices/${invoiceId}/post`, { method: "POST" });
  return adaptInvoice(response);
}

export async function voidInvoice(organizationId: string, invoiceId: string, reason: string) {
  const response = await apiClient<RawInvoice>(`/organizations/${organizationId}/invoices/${invoiceId}/void`, {
    method: "POST",
    body: { reason },
  });
  return adaptInvoice(response);
}

export async function addInvoiceItem(organizationId: string, invoiceId: string, payload: Record<string, unknown>) {
  const response = await apiClient<RawInvoice>(`/organizations/${organizationId}/invoices/${invoiceId}/items`, {
    method: "POST",
    body: payload,
  });
  return adaptInvoice(response);
}

export async function updateInvoiceItem(organizationId: string, invoiceId: string, itemId: string, payload: Record<string, unknown>) {
  const response = await apiClient<RawInvoice>(`/organizations/${organizationId}/invoices/${invoiceId}/items/${itemId}`, {
    method: "PATCH",
    body: payload,
  });
  return adaptInvoice(response);
}

export async function deleteInvoiceItem(organizationId: string, invoiceId: string, itemId: string) {
  const response = await apiClient<RawInvoice>(`/organizations/${organizationId}/invoices/${invoiceId}/items/${itemId}`, {
    method: "DELETE",
  });
  return adaptInvoice(response);
}

export async function listInvoiceDocumentLinks(organizationId: string, invoiceId: string) {
  const response = await apiClient<{ items: Record<string, unknown>[] }>(`/organizations/${organizationId}/documents/entity/invoice/${invoiceId}`);
  return response.items.map(adaptDocumentLink);
}

export async function listStoredFiles(organizationId: string) {
  const response = await apiClient<{ items: Record<string, unknown>[] }>(`/organizations/${organizationId}/files`);
  return response.items.map(adaptStoredFile);
}

export async function linkInvoiceFile(organizationId: string, invoiceId: string, fileId: string, label?: string) {
  const response = await apiClient<Record<string, unknown>>(`/organizations/${organizationId}/documents/links`, {
    method: "POST",
    body: {
      file_id: fileId,
      entity_type: "invoice",
      entity_id: invoiceId,
      label: label || null,
    },
  });
  return adaptDocumentLink(response);
}

export async function getInvoiceAttachments(organizationId: string, invoiceId: string): Promise<InvoiceAttachment[]> {
  const [links, files] = await Promise.all([listInvoiceDocumentLinks(organizationId, invoiceId), listStoredFiles(organizationId)]);
  const fileMap = new Map(files.map((file) => [file.id, file]));
  return links.map((link) => ({ link, file: fileMap.get(link.fileId) ?? null }));
}
