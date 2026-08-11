"use client"

import { useTheme } from "@/lib/theme-context"
import { Toaster as Sonner } from "sonner"
import { CircleCheck, CircleX, TriangleAlert, Info, LoaderCircle } from "lucide-react"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      position="top-right"
      closeButton
      duration={4000}
      visibleToasts={4}
      icons={{
        success: <CircleCheck className="h-5 w-5 text-emerald-500" />,
        error: <CircleX className="h-5 w-5 text-destructive" />,
        warning: <TriangleAlert className="h-5 w-5 text-amber-500" />,
        info: <Info className="h-5 w-5 text-blue-500" />,
        loading: <LoaderCircle className="h-5 w-5 animate-spin" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          closeButton:
            "group-[.toast]:border-border group-[.toast]:text-muted-foreground group-[.toast]:hover:text-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
