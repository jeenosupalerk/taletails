import { createFileRoute } from "@tanstack/react-router";

import { OrderCheckout } from "@/components/checkout/OrderCheckout";

const SITE_URL = "https://taletails-test.lovable.app";
const title = "ชำระเงินคำสั่งซื้อ — Taletails";
const description = "ยืนยันคำสั่งซื้อการ์ด แนบสลิปโอนเงิน หรือสแกน QR PromptPay บน Taletails";

export const Route = createFileRoute("/order/$id")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/order` }],
  }),
  component: OrderCheckoutPage,
});

function OrderCheckoutPage() {
  const { id } = Route.useParams();
  return <OrderCheckout orderId={id} />;
}
