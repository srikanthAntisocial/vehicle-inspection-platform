export default function Home() {
  return (
    <div className="grain min-h-screen">
      <header className="container flex h-16 items-center justify-between">
        <div className="text-2xl font-bold text-primary">
          {process.env.NEXT_PUBLIC_BRAND_NAME || "AutoVision Inspect"}
        </div>
        <nav className="flex items-center gap-2">
          <a href="#" className="text-muted-foreground hover:text-foreground">
            Sign in
          </a>
        </nav>
      </header>

      <section className="container mt-20 space-y-8">
        <div className="space-y-4">
          <h1 className="text-display text-5xl font-semibold">
            Turn eleven photos into a defensible damage report.
          </h1>
          <p className="max-w-2xl text-lg text-muted-foreground">
            {process.env.NEXT_PUBLIC_BRAND_TAGLINE || "AI-powered vehicle damage intelligence"}. Guides every walk-around, validates the capture, sends it to the AI engine, and brings the verdict home.
          </p>
        </div>

        <div className="card-surface p-8">
          <p className="text-sm text-muted-foreground">Welcome to your Vehicle Inspection Platform</p>
          <p className="mt-4 text-sm">Frontend is successfully deployed! ✅</p>
        </div>
      </section>
    </div>
  );
}