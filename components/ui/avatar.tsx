"use client";

import * as React from "react";
import { Avatar as RadixAvatar } from "radix-ui";
import { cn } from "@/lib/utils";

function Avatar({
  className,
  ...props
}: React.ComponentProps<typeof RadixAvatar.Root>) {
  return (
    <RadixAvatar.Root
      data-slot="avatar"
      className={cn(
        "relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  ...props
}: React.ComponentProps<typeof RadixAvatar.Image>) {
  return (
    <RadixAvatar.Image
      data-slot="avatar-image"
      className={cn("aspect-square h-full w-full", className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof RadixAvatar.Fallback>) {
  return (
    <RadixAvatar.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-muted text-sm font-medium",
        className
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
