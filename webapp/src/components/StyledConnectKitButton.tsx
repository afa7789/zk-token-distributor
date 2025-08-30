"use client";

import React from "react";
import { ConnectKitButton } from "connectkit";

type CKButtonProps = React.ComponentProps<typeof ConnectKitButton>;

export default function StyledConnectKitButton(props: CKButtonProps) {
  return (
    <div className="ck-button-wrapper">
      <ConnectKitButton {...props} />
      <style jsx>{`
        .ck-button-wrapper :global(.connectkit),
        .ck-button-wrapper :global(.ck-button),
        .ck-button-wrapper :global(.ck-connect-button),
        .ck-button-wrapper :global(.connectkit-button) {
          background: var(--surface) !important;
          color: var(--foreground) !important;
          border: 1px solid var(--muted) !important;
          padding: 6px 10px !important;
          border-radius: 6px !important;
          box-shadow: none !important;
        }

        .ck-button-wrapper :global(.ck-avatar),
        .ck-button-wrapper :global(.ck-avatar img),
        .ck-button-wrapper :global(.ck-avatar svg) {
          background: transparent !important;
        }

        /* Make sure text sizing matches surrounding UI */
        .ck-button-wrapper :global(.connectkit-button) {
          font-size: 0.95rem !important;
        }
      `}</style>
    </div>
  );
}
