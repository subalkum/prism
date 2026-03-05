import { Providers } from "@/app/providers";
import { ChatView } from "@/components/ChatView";
import { getUserId } from "@/lib/getUser";

// Prevent static pre-rendering — this page relies on client-only APIs (searchParams, Convex)
export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const userId = await getUserId();

  return (
    <Providers>
      <ChatView userId={userId} />
    </Providers>
  );
}
