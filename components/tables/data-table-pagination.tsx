"use client";

import { useCallback, useMemo } from "react";
import type { Table as TanstackTable } from "@tanstack/react-table";
import {
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const;

function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  if (current <= 3) {
    return [1, 2, "...", total - 1, total];
  }
  if (current >= total - 2) {
    return [1, 2, "...", total - 1, total];
  }
  return [1, 2, "...", current, current + 1, "...", total - 1, total];
}

interface DataTablePaginationProps<TData> {
  table: TanstackTable<TData>;
  loading?: boolean;
  className?: string;
}

export function DataTablePagination<TData>({
  table,
  loading = false,
  className,
}: DataTablePaginationProps<TData>) {
  const handlePageSizeChange = useCallback(
    (value: string | number) => {
      const scrollY = window.scrollY;
      table.setPageSize(Number(value));
      requestAnimationFrame(() => window.scrollTo(0, scrollY));
    },
    [table]
  );

  const { pageIndex, pageSize } = table.getState().pagination;
  const currentPage = pageIndex + 1;
  const totalPages = Math.max(1, table.getPageCount());
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages]
  );

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 p-3 pt-0",
        className
      )}
    >
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="whitespace-nowrap">Rows per page</span>
        <Select
          value={pageSize}
          onValueChange={handlePageSizeChange}
          disabled={loading}
        >
          <SelectTrigger className="h-8 w-16">
            <span>{pageSize}</span>
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((n) => (
              <SelectItem key={n} value={n}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage() || loading}
        >
          <span className="sr-only">Go to first page</span>
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage() || loading}
        >
          <span className="sr-only">Go to previous page</span>
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {pageNumbers.map((page, i) =>
          page === "..." ? (
            <span
              key={`ellipsis-${i}`}
              className="flex h-8 w-8 items-center justify-center text-sm text-muted-foreground"
            >
              ...
            </span>
          ) : (
            <button
              key={page}
              type="button"
              aria-label={`Go to page ${page}`}
              aria-current={page === currentPage ? "page" : undefined}
              disabled={loading}
              onClick={() => table.setPageIndex(page - 1)}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                page === currentPage
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {page}
            </button>
          )
        )}

        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage() || loading}
        >
          <span className="sr-only">Go to next page</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          className="h-8 w-8 p-0"
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage() || loading}
        >
          <span className="sr-only">Go to last page</span>
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
