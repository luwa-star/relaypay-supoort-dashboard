"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import {
	LayoutDashboard,
	Phone,
	Ticket,
	BarChart3,
	BookOpen,
	LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogFooter,
	DialogTitle,
	DialogDescription,
	DialogClose,
} from "@/components/ui/dialog";

const navItems = [
	{ href: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
	{ href: "/dashboard/calls", label: "Call Logs", icon: Phone, exact: false },
	{ href: "/dashboard/tickets", label: "Tickets", icon: Ticket, exact: false },
	{
		href: "/dashboard/performance",
		label: "Performance",
		icon: BarChart3,
		exact: false,
	},
];

export function Sidebar() {
	const pathname = usePathname();
	const router = useRouter();
	const [showLogoutDialog, setShowLogoutDialog] = useState(false);
	const [loggingOut, setLoggingOut] = useState(false);

	async function handleLogout() {
		setLoggingOut(true);
		await axios.post("/api/auth/logout");
		router.push("/login");
	}

	return (
		<>
			<aside className="flex h-screen w-60 flex-col bg-sidebar text-sidebar-foreground">
				{/* Logo */}
				<div className="flex items-center gap-2 px-5 py-5 border-b border-sidebar-border">
					<Image
						src="/relaypay_logo_holu.png"
						alt="RelayPay"
						width={120}
						height={32}
						className="object-contain brightness-0 invert"
						priority
					/>
				</div>

				{/* Navigation */}
				<nav className="flex-1 overflow-y-auto py-4 px-3">
					<p className="px-2 mb-2 text-xs font-medium uppercase tracking-wider text-sidebar-foreground/50">
						Dashboard
					</p>
					<ul className="space-y-0.5">
						{navItems.map((item) => {
							const active = item.exact
								? pathname === item.href
								: pathname.startsWith(item.href);
							return (
								<li key={item.href}>
									<Link
										href={item.href}
										className={cn(
											"flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
											active
												? "bg-sidebar-accent text-sidebar-accent-foreground"
												: "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground",
										)}>
										<item.icon className="h-4 w-4 shrink-0" />
										{item.label}
									</Link>
								</li>
							);
						})}
					</ul>
				</nav>

				{/* Bottom links */}
				<div className="border-t border-sidebar-border p-3 space-y-0.5">
					<a
						href="https://road-tilapia-700.notion.site/RelayPay-Knowledge-Base-33ca8ad4796a8015af4afd878c269558"
						target="_blank"
						rel="noopener noreferrer"
						className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors">
						<BookOpen className="h-4 w-4 shrink-0" />
						Knowledge Base
					</a>
					<button
						onClick={() => setShowLogoutDialog(true)}
						className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors">
						<LogOut className="h-4 w-4 shrink-0" />
						Sign out
					</button>
				</div>

			</aside>

			<Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Sign out</DialogTitle>
						<DialogDescription>
							Are you sure you want to sign out of your account?
						</DialogDescription>
					</DialogHeader>
					<DialogFooter>
						<DialogClose asChild>
							<button
								disabled={loggingOut}
								className="rounded-md px-4 py-2 text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50">
								Cancel
							</button>
						</DialogClose>
						<button
							onClick={handleLogout}
							disabled={loggingOut}
							className="rounded-md px-4 py-2 text-sm font-medium bg-destructive text-white hover:bg-destructive/90 transition-colors disabled:opacity-50">
							{loggingOut ? "Signing out…" : "Sign out"}
						</button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}
