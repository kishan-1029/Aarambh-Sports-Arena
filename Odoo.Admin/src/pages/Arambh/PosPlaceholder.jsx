import React from "react";
import EmptyState from "../../Components/Common/EmptyState";
import { Can } from "../../Components/Common/Can";

const PosPlaceholder = () => {
  document.title = "POS | Arambh Sports Arena";

  return (
    <Can
      perm="pos.create"
      fallback={
        <div className="p-5">
          <EmptyState
            icon="ri-lock-line"
            title="No POS access"
            description="You need permission `pos.create` to use the terminal."
          />
        </div>
      }
    >
      <div className="p-5">
        <EmptyState
          icon="ri-store-2-line"
          title="POS — Coming soon"
          description="Fullscreen POS shell is ready. Terminal select, floor plan, and payments arrive in Phase 9."
        />
      </div>
    </Can>
  );
};

export default PosPlaceholder;
