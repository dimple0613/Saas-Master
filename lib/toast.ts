"use client";

import { toast, type ExternalToast } from "sonner";

export type ToastKind = "success" | "error" | "warning" | "info";

export interface PromiseMessages {
  loading: string;
  success: string;
  error: string;
}

export type NotifyOptions = ExternalToast;

export function notify(
  kind: ToastKind,
  title: string,
  description?: string,
  options?: NotifyOptions
): string | number {
  const data: ExternalToast = { ...options, description };
  switch (kind) {
    case "success":
      return toast.success(title, data);
    case "error":
      return toast.error(title, data);
    case "warning":
      return toast.warning(title, data);
    case "info":
      return toast.info(title, data);
  }
}

export function notifySuccess(
  title: string,
  description?: string,
  options?: NotifyOptions
): string | number {
  return notify("success", title, description, options);
}

export function notifyError(
  title: string,
  description?: string,
  options?: NotifyOptions
): string | number {
  return notify("error", title, description, options);
}

export function notifyWarning(
  title: string,
  description?: string,
  options?: NotifyOptions
): string | number {
  return notify("warning", title, description, options);
}

export function notifyInfo(
  title: string,
  description?: string,
  options?: NotifyOptions
): string | number {
  return notify("info", title, description, options);
}

export function notifyPromise<T>(
  promise: Promise<T>,
  messages: PromiseMessages,
  options?: NotifyOptions
) {
  return toast.promise<T>(promise, {
    loading: messages.loading,
    success: messages.success,
    error: messages.error,
    ...options,
  });
}

export function dismissToast(id?: string | number) {
  toast.dismiss(id);
}

export { toast };
