import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { toast } from "sonner";

import { useAuth } from "@/lib/auth";

/**
 * Gate for actions that need a signed-in user (buy now, add to cart, bidding).
 * Returns a function that returns true when the user may proceed, otherwise
 * shows a toast and sends them to the sign-in page.
 */
export function useRequireAuth() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  return useCallback(
    (message = "กรุณาเข้าสู่ระบบก่อนทำรายการ") => {
      if (isAuthenticated) return true;
      toast.error(message, { description: "กำลังนำคุณไปยังหน้าเข้าสู่ระบบ" });
      void navigate({ to: "/auth" });
      return false;
    },
    [isAuthenticated, navigate],
  );
}
