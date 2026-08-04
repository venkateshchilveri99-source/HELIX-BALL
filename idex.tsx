import { createFileRoute } from "@tanstack/react-router";
import HelixGame from "@/components/HelixGame";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Helix Smash — JS Helix Tower Game" },
      {
        name: "description",
        content:
          "Play Helix Smash: a canvas-based JavaScript helix tower game. Rotate the tower, hold to smash platforms and avoid the black blocks.",
      },
      { property: "og:title", content: "Helix Smash — JS Helix Tower Game" },
      {
        property: "og:description",
        content: "A pure JavaScript canvas helix / stack-ball tower game you can play in the browser.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 py-8">
      <header className="text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">Helix Smash</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drag to rotate · hold to smash · dodge the black blocks
        </p>
      </header>
      <HelixGame />
    </main>
  );
}
