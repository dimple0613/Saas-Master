"use client";

import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 p-0 sm:max-w-sm" showCloseButton={false}>
        {/* Close button */}
        <DialogClose
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            />
          }
        >
          <span className="sr-only">Close</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </DialogClose>

        {/* Content */}
        <div className="flex flex-col items-center px-6 pt-8 pb-6 text-center">
          {/* Icon */}
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Trash2 className="h-6 w-6 text-destructive" />
          </div>

          {/* Header */}
          <DialogHeader className="mt-5 items-center">
            <DialogTitle className="text-center text-lg">
              {title}
            </DialogTitle>
            {description && (
              <DialogDescription className="text-center">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Action */}
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={loading}
            className="mt-6 px-6"
          >
            {loading ? "Removing..." : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
