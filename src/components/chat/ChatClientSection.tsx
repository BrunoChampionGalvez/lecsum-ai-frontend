"use client";

import React, { useState } from "react";
import { ChatInputForm } from "./ChatInputForm";

interface ChatClientSectionProps {
  chatSessionId: string;
}

export const ChatClientSection: React.FC<ChatClientSectionProps> = ({ chatSessionId }) => {
  const [isLoading, setIsLoading] = useState(false);

  // Dummy handler for demonstration; replace with real API logic as needed
  const handleSendMessage = async (message: string) => {
    setIsLoading(true);
    try {
      // TODO: send message to backend using chatSessionId
      // await sendMessage(chatSessionId, message);
      console.log("Send message:", message, "to session:", chatSessionId);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="pt-4 border-t mt-4">
      <ChatInputForm onSendMessage={handleSendMessage} isLoading={isLoading} />
    </div>
  );
};
