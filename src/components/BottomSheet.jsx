import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { Icon } from "./StudioIcons";

const SHEET_DISMISS_DISTANCE = 120;
const SHEET_DISMISS_VELOCITY = 500;

export default function BottomSheet({ onClose, children, className = "", contentClassName = "", labelledBy }) {
  return (
    <Dialog.Root open onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <Dialog.Portal forceMount>
        <Dialog.Overlay asChild>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed inset-0 z-40 bg-black/30"
          />
        </Dialog.Overlay>
        <Dialog.Content asChild aria-labelledby={labelledBy}>
          <motion.div
            initial={{ transform: "translateY(100%)" }}
            animate={{ transform: "translateY(0%)" }}
            exit={{ transform: "translateY(100%)" }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_event, info) => {
              if (info.offset.y > SHEET_DISMISS_DISTANCE || info.velocity.y > SHEET_DISMISS_VELOCITY) onClose();
            }}
            className={cn(
              "fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-2xl border-t border-[var(--ui-border)] bg-[#fbfaf6] text-[var(--ui-ink)] shadow-xl focus:outline-none",
              className
            )}
          >
            <Dialog.Title className="sr-only">Controls</Dialog.Title>
            <div className="relative flex shrink-0 justify-center py-3">
              <div className="h-1.5 w-10 rounded-full bg-[var(--ui-border)]" />
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="control-button absolute right-3 top-2 grid size-8 place-items-center rounded-full border border-[var(--ui-border)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ui-ink)]"
                  aria-label="Close controls"
                >
                  <Icon name="close" className="size-3.5" />
                </button>
              </Dialog.Close>
            </div>
            <div className={cn("overscroll-contain overflow-y-auto pb-[calc(1rem+env(safe-area-inset-bottom))]", contentClassName)}>
              {children}
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
