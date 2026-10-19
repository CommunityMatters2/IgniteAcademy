"use client";

import { motion } from "motion/react";
import { Crown } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Row = { id: string; name: string; fullName: string; avatarKey: string | null; points: number };

const order = [1, 0, 2]; // 2nd, 1st, 3rd
const heights = ["h-28", "h-20", "h-14"];
const medal = ["bg-gold text-gold-fg", "bg-[#d9dde3] text-black", "bg-[#e3a46a] text-black"];

export function Podium({ rows }: { rows: Row[] }) {
  return (
    <div className="relative mt-2 mb-2 flex items-end justify-center gap-3 rounded-3xl border border-border bg-gradient-to-b from-gold/10 to-surface px-4 pt-10">
      {order.map((idx, col) => {
        const r = rows[idx];
        if (!r) return <div key={col} className="flex-1" />;
        return (
          <motion.div
            key={r.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + col * 0.12, type: "spring", stiffness: 260, damping: 22 }}
            className="flex flex-1 flex-col items-center"
          >
            <div className="relative">
              {idx === 0 && (
                <motion.span
                  initial={{ y: -10, rotate: -15, opacity: 0 }}
                  animate={{ y: 0, rotate: 0, opacity: 1 }}
                  transition={{ delay: 0.6, type: "spring" }}
                  className="absolute -top-7 left-1/2 -translate-x-1/2"
                >
                  <Crown className="size-7 fill-gold text-gold drop-shadow-[0_0_12px_var(--gold)]" />
                </motion.span>
              )}
              <Avatar name={r.fullName} avatarKey={r.avatarKey} size={idx === 0 ? 72 : 56} ring={idx === 0 ? "gold" : undefined} />
            </div>
            <p className="mt-2 w-full truncate text-center text-sm font-semibold">{r.name}</p>
            <p className="text-xs text-muted tabular-nums">{r.points} pts</p>
            <div
              className={cn(
                "mt-2 flex w-full items-start justify-center rounded-t-2xl pt-2 font-display text-xl font-extrabold",
                heights[idx],
                medal[idx],
              )}
            >
              {idx + 1}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
