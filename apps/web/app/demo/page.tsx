import { Providers } from "@/app/providers";
import { ChatView } from "@/components/ChatView";

export const dynamic = "force-dynamic";

export default function DemoPage() {
  return (
    <Providers>
      <ChatView userId="demo-user" />
    </Providers>
  );
}
