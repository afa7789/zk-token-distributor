"use client";

import React from "react";
import { ConnectKitButton } from "connectkit";

type CKButtonProps = React.ComponentProps<typeof ConnectKitButton>;

export default function StyledConnectKitButton(props: CKButtonProps) {
  return (
    <div className="ck-button-wrapper">
      <ConnectKitButton {...props} />
      <style jsx>{`
        /* ONLY remove the outermost visual border/outline/shadow from the ConnectKit button
           Leave internal styling (background, padding, avatar, etc.) untouched. */
        .ck-button-wrapper :global(.connectkit-button),
        .ck-button-wrapper :global(.ck-connect-button) {
          border: none !important;
          outline: none !important;
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
