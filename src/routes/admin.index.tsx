import { createFileRoute } from "@tanstack/react-router";

import { CardListingManager } from "@/components/shop/CardListingManager";

export const Route = createFileRoute("/admin/")({
  component: AdminCardsPage,
});

function AdminCardsPage() {
  return <CardListingManager scope="admin" />;
}
