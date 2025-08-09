import { Button } from "@/components/ui/button";
import heroImg from "@/assets/hero-gaming.jpg";
import { toast } from "@/hooks/use-toast";
import { Sparkles, Gamepad2, Users } from "lucide-react";

const handleGetApp = () => {
  toast({
    title: "Mobile build ready (Capacitor)",
    description:
      "Export to GitHub → npm i → npx cap add ios/android → npm run build → npx cap sync → npx cap run ios/android.",
  });
};

export default function Hero() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="py-6">
        <nav className="flex items-center justify-between">
          <a href="/" className="text-lg font-semibold story-link">NovaPlay</a>
          <div className="flex items-center gap-3">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <Button variant="hero" className="hover-scale" onClick={handleGetApp}>Get the App</Button>
          </div>
        </nav>
      </header>

      <main className="flex-1 grid lg:grid-cols-2 gap-8 items-center">
        <section className="space-y-6 animate-enter">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            Build and play Roblox-like 3D worlds on iOS & Android
          </h1>
          <p className="text-lg text-muted-foreground max-w-prose">
            NovaPlay lets anyone create, share, and discover immersive 3D experiences. A creator-first platform with mobile performance in mind.
          </p>
          <div className="flex items-center gap-3">
            <Button variant="hero" size="lg" className="hover-scale" onClick={handleGetApp}>
              Start Creating
            </Button>
            <Button variant="outline" size="lg" className="hover-scale">
              Learn More
            </Button>
          </div>
          <ul id="features" className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6">
            <li className="rounded-lg border p-4 bg-card/50 backdrop-blur-sm animate-fade-in">
              <Gamepad2 className="mb-2" />
              <p className="text-sm font-medium">No-code world builder</p>
              <p className="text-xs text-muted-foreground">Drag-and-drop 3D blocks</p>
            </li>
            <li className="rounded-lg border p-4 bg-card/50 backdrop-blur-sm animate-fade-in">
              <Users className="mb-2" />
              <p className="text-sm font-medium">Multiplayer-ready</p>
              <p className="text-xs text-muted-foreground">Play with friends</p>
            </li>
            <li className="rounded-lg border p-4 bg-card/50 backdrop-blur-sm animate-fade-in">
              <Sparkles className="mb-2" />
              <p className="text-sm font-medium">Creator economy</p>
              <p className="text-xs text-muted-foreground">Monetize your worlds</p>
            </li>
          </ul>
        </section>
        <aside className="relative group">
          <div className="absolute -inset-4 rounded-xl opacity-60 blur-2xl transition-all duration-500 group-hover:opacity-90"
               style={{ backgroundImage: 'var(--gradient-primary)' }} />
          <img
            src={heroImg}
            alt="Futuristic gaming landscape for a Roblox-like 3D world platform"
            loading="lazy"
            className="relative w-full rounded-xl border shadow-xl transition-transform duration-300 group-hover:scale-[1.02]"
          />
        </aside>
      </main>

      <footer className="py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} NovaPlay. Build and play 3D worlds.
      </footer>
    </div>
  );
}
