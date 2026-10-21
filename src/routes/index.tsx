import { createFileRoute } from "@tanstack/react-router";
import { AlertApp } from "@/components/alert-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <AlertApp />;
}
