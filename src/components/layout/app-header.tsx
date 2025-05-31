import Link from 'next/link';
import { Gamepad2 } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-headline font-bold text-primary-foreground hover:text-accent-foreground transition-colors">
          <Gamepad2 className="h-7 w-7 text-primary-foreground" />
          UpDown River Scorer
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary-foreground transition-colors">
            Game
          </Link>
          <Link href="/rules" className="text-sm font-medium text-muted-foreground hover:text-primary-foreground transition-colors">
            Rules
          </Link>
        </nav>
      </div>
    </header>
  );
}
