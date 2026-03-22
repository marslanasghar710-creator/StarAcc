import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AssetCategory } from "@/features/assets/types";

export function AssetCategoryListTable({
  categories,
  accountNames,
  onEdit,
}: {
  categories: AssetCategory[];
  accountNames: Record<string, string>;
  onEdit?: (category: AssetCategory) => void;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Method</TableHead>
            <TableHead>Useful life</TableHead>
            <TableHead>Asset account</TableHead>
            <TableHead>Accum. dep. account</TableHead>
            <TableHead>Expense account</TableHead>
            <TableHead className="w-[88px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell className="capitalize">{category.depreciationMethod.replaceAll("_", " ")}</TableCell>
              <TableCell>{category.defaultUsefulLifeMonths ? `${category.defaultUsefulLifeMonths} months` : <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell className="break-all">{category.assetAccountId ? (accountNames[category.assetAccountId] ?? category.assetAccountId) : <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell className="break-all">{category.accumulatedDepreciationAccountId ? (accountNames[category.accumulatedDepreciationAccountId] ?? category.accumulatedDepreciationAccountId) : <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell className="break-all">{category.depreciationExpenseAccountId ? (accountNames[category.depreciationExpenseAccountId] ?? category.depreciationExpenseAccountId) : <span className="text-muted-foreground">—</span>}</TableCell>
              <TableCell className="text-right">
                <Button type="button" variant="ghost" size="icon" onClick={() => onEdit?.(category)}>
                  <Pencil className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
