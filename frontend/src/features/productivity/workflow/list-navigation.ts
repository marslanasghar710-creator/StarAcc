"use client";

import * as React from "react";

import { useShortcuts } from "@/features/productivity/shortcuts/use-shortcuts";

export function useListNavigation<T extends { id: string }>({
  rows,
  onOpen,
  route,
}: {
  rows: T[];
  onOpen: (row: T) => void;
  route: string;
}) {
  const [selectedId, setSelectedId] = React.useState<string | null>(rows[0]?.id ?? null);

  React.useEffect(() => {
    if (!selectedId && rows[0]) setSelectedId(rows[0].id);
    if (selectedId && !rows.some((row) => row.id === selectedId)) setSelectedId(rows[0]?.id ?? null);
  }, [rows, selectedId]);

  const selectedIndex = rows.findIndex((row) => row.id === selectedId);

  useShortcuts([
    {
      id: `${route}.next-row`,
      combo: "j",
      description: "Select next row",
      route,
      handler: () => {
        if (rows.length === 0) return;
        const nextIndex = selectedIndex < 0 ? 0 : Math.min(selectedIndex + 1, rows.length - 1);
        setSelectedId(rows[nextIndex].id);
      },
    },
    {
      id: `${route}.prev-row`,
      combo: "k",
      description: "Select previous row",
      route,
      handler: () => {
        if (rows.length === 0) return;
        const previousIndex = selectedIndex <= 0 ? 0 : selectedIndex - 1;
        setSelectedId(rows[previousIndex].id);
      },
    },
    {
      id: `${route}.open-row`,
      combo: "enter",
      description: "Open selected row",
      route,
      handler: () => {
        if (selectedIndex < 0) return;
        onOpen(rows[selectedIndex]);
      },
    },
  ]);

  return { selectedId, setSelectedId };
}
