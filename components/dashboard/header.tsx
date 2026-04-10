import * as React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface HeaderProps {
  title: string;
  description?: string;
}

export function Header({ title, description }: HeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        {description && (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground hidden sm:block">Admin</span>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
            RP
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
