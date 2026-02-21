import { Providers } from "../providers";
import { ChatView } from "@/components/ChatView";

export default function ChatPage() {
  return (
    <Providers>
      <ChatView />
    </Providers>
  );
}
