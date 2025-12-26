import React from "react";
import { motion } from "framer-motion";
import { cn } from "../../../lib/utils";
import { Welcome } from "./Welcome";
import { useI18n } from "../I18nContext";

export const ConversationStarter = ({ className, onSend }) => {
  const { tArray } = useI18n();
  const questions = tArray("chat.conversationStarters", []);
  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-between overflow-auto",
        className,
      )}
    >
      <div />
      <div className="pointer-events-none flex items-center justify-center">
        <Welcome className="pointer-events-auto mt-14 mb-5 w-[75%]" />
      </div>
      <ul className="mb-6 flex w-full flex-wrap">
        {questions.map((question, index) => (
          <motion.li
            key={`${index}-${question}`}
            className="flex w-1/2 shrink-0 p-2 active:scale-105"
            style={{ transition: "all 0.2s ease-out" }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{
              duration: 0.2,
              delay: index * 0.1 + 0.5,
              ease: "easeOut",
            }}
          >
            <button
              type="button"
              className="df-starter-button bg-card text-muted-foreground h-full w-full rounded-2xl border px-4 py-4 text-left opacity-75 transition-all duration-300 hover:opacity-100 hover:shadow-md"
              onClick={() => {
                onSend?.(question);
              }}
            >
              {question}
            </button>
          </motion.li>
        ))}
      </ul>
    </div>
  );
};
