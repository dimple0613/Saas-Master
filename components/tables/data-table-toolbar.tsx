"use client";

import { type ReactNode } from "react";
import { X } from "lucide-react";
import type { Table as TanstackTable } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DataTableViewOptions } from "@/components/tables/data-table-view-options";
import { cn } from "@/lib/utils";

interface DataTableToolbarProps<TData> {
  table: TanstackTable<TData>;
  searchColumn?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: ReactNode;
  labels?: Record<string, string>;
  className?: string;
}

export function DataTableToolbar<TData>({
  table,
  searchColumn,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Filter...",
  filters,
  labels,
  className,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0;

  let inputValue: string;
  let handleChange: (value: string) => void;

  if (searchColumn) {
    const column = table.getColumn(searchColumn);
    inputValue = (column?.getFilterValue() as string) ?? "";
    handleChange = (value: string) => column?.setFilterValue(value);
  } else {
    inputValue = searchValue ?? "";
    handleChange = (value: string) => onSearchChange?.(value);
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 p-3 pb-0",
        className
      )}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <Input
          value={inputValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-8 w-[150px] lg:w-[250px]"
        />
        {filters}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} labels={labels} />
    </div>
  );
}
