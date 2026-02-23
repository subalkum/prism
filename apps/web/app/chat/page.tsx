import { Providers } from "../providers";
import { ChatView } from "@/components/ChatView";

// Prevent static pre-rendering — this page relies on client-only APIs (searchParams, Convex)
export const dynamic = "force-dynamic";

export default function ChatPage() {
  return (
    <Providers>
      <ChatView />
    </Providers>
  );
}
