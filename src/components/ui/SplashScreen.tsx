import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import loaderAsset from "@/assets/taletails-loader.jpg.asset.json";

/**
 * Splash screen shown once per app session on the initial mount.
 * Fades in with a gentle pulse, holds ~2.2s, then fades out and unmounts.
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [unmount, setUnmount] = useState(false);

  // Hold then start fade-out; unmount after the fade completes.
  useEffect(() => {
    const hideTimer = window.setTimeout(() => setVisible(false), 2200);
    const removeTimer = window.setTimeout(() => setUnmount(true), 2900);
    return () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  if (unmount) return null;

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: "#FDF0E5" }}
      initial={{ opacity: 1 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.7, ease: "easeInOut" }}
      aria-hidden="true"
    >
      <motion.img
        src={loaderAsset.url}
        alt="Taletails"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{
          opacity: visible ? [0, 1, 0.85, 1] : 1,
          scale: visible ? [0.9, 1.04, 1] : 1,
        }}
        transition={{
          duration: visible ? 1.4 : 0.7,
          ease: "easeInOut",
          repeat: visible ? Infinity : 0,
          repeatType: "reverse",
        }}
        className="h-[150px] w-[150px] rounded-2xl object-contain drop-shadow-2xl sm:h-[180px] sm:w-[180px]"
        draggable={false}
      />
    </motion.div>
  );
}

export default SplashScreen;
