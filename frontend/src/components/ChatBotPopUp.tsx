import React, { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import ChatBot from "./ChatBot";

const ChatBotPopup = () => {
  const [isOpen, setIsOpen] = useState(false);

  const togglePopup = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div>
      {/* Chatbot Trigger Button */}
      <button
        onClick={togglePopup}
        aria-label="Open Skillify coach"
        className="fixed bottom-5 right-5 z-30 grid h-14 w-14 place-items-center rounded-2xl border-2 border-sk-ink bg-sk-lime text-sk-ink shadow-[5px_5px_0_#101827] transition hover:-translate-y-1 sm:bottom-7 sm:right-7"
      >
        <MessageCircle className="h-7 w-7" />
      </button>

      {/* Chatbot Popup */}
      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 overflow-hidden rounded-[1.75rem] border-2 border-sk-ink bg-white shadow-[8px_8px_0_#101827] sm:bottom-7 sm:right-7">
            {/* Close Button */}
            <button
              onClick={togglePopup}
              aria-label="Close career coach"
              className="absolute right-3 top-3 z-10 rounded-full bg-white p-1 text-gray-500 shadow hover:text-gray-900"
            >
              <X className="h-5 w-5" />
            </button>

            <ChatBot />
        </div>
      )}
    </div>
  );
};

export default ChatBotPopup;
