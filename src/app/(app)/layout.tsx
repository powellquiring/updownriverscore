import { AppHeader } from '@/components/layout/app-header';

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-8">
        {children}
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t border-border">
        UpDown River Scorer &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
