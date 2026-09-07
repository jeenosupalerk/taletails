import { createFileRoute } from "@tanstack/react-router";
import { CheckoutStepper } from "@/components/checkout/CheckoutStepper";

export const Route = createFileRoute("/stepper-preview")({
  head: () => ({ meta: [{ title: "Stepper Preview" }] }),
  component: () => (
    <div className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-md space-y-6 pt-10">
        <CheckoutStepper current={1} />
        <CheckoutStepper current={2} />
        <CheckoutStepper current={3} />
      </div>
    </div>
  ),
});
