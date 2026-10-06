import { createFileRoute } from "@tanstack/react-router";
import { PisoApp } from "@/components/piso-app";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return <PisoApp />;
}
