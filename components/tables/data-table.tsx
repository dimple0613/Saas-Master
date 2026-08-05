"use client";

import { type ReactNode } from "react";
import {
  flexRender,
  type Table as TanstackTable,
} from "@tanstack/react-table";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export interface DataTableProps<TData> {
  table: TanstackTable<TData>;
  loading?: boolean;
  emptyNode?: ReactNode;
  skeletonRows?: number;
  stickyHeader?: boolean;
  headerRowClassName?: string;
}

export function DataTable<TData>({
  table,
  loading = false,
  emptyNode,
  skeletonRows = 5,
  stickyHeader = false,
  headerRowClassName = "bg-muted/50",
}: DataTableProps<TData>) {
  const colCount = table.getVisibleLeafColumns().length;
  const rows = table.getRowModel().rows;

  return (
    <div className="relative w-full border border-l-0 border-r-0">
      <Table
        wrapperClassName={cn(stickyHeader && "")}
      >
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className={headerRowClassName}>
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  colSpan={header.colSpan}
                  className={cn(
                    stickyHeader && "sticky top-0 z-10 bg-muted/50"
                  )}
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, rowIdx) => (
              <TableRow key={`skeleton-${rowIdx}`}>
                {Array.from({ length: colCount }).map((_, colIdx) => (
                  <TableCell key={`skeleton-${rowIdx}-${colIdx}`}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : rows.length ? (
            rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(
                      cell.column.columnDef.cell,
                      cell.getContext()
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={colCount} className="h-24 text-center">
                {emptyNode ?? (
                  <span className="text-muted-foreground">No results.</span>
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
