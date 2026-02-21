"use client";

import { ReactNode, useMemo } from "react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { publicEnv } from "@/lib/env";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const client = useMemo(
    () => new ConvexReactClient(publicEnv.NEXT_PUBLIC_CONVEX_URL),
    [],
  );

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}

