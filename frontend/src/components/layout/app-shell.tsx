import { Sidebar } from "./sidebar";
import { Navbar } from "./navbar";

export function AppShell({
  children,
  crumbs,
}: {
  children: React.ReactNode;
  crumbs?: { label: string; href?: string }[];
}) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar crumbs={crumbs} />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
