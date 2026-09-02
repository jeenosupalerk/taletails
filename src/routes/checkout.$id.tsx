import { createFileRoute } from "@tanstack/react-router";

import { OrderCheckout } from "@/components/checkout/OrderCheckout";

const SITE_URL = "https://taletails-test.lovable.app";
const title = "ชำระเงินคำสั่งซื้อการ์ด — Taletails";
const description =
  "สรุปยอดชำระ แนบสลิปโอนเงิน หรือสแกน QR PromptPay เพื่อยืนยันคำสั่งซื้อการ์ดบน Taletails";

export const Route = createFileRoute("/checkout/$id")({
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
    links: [{ rel: "canonical", href: `${SITE_URL}/checkout` }],
  }),
  component: CheckoutByOrderPage,
});

function CheckoutByOrderPage() {
  const { id } = Route.useParams();
  return <OrderCheckout orderId={id} />;
}
