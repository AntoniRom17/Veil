"use client";

import { useEffect, useState } from "react";

export function VeilApp() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  return (
    <main className="veil-boot" aria-busy={!ready}>
      <div className="veil-boot__mark" aria-hidden="true">
        <span />
      </div>
      <p className="veil-boot__brand">VEIL</p>
      <p className="veil-boot__status" role="status">
        {ready ? "Your skincare, organized." : "Opening your private shelf…"}
      </p>
    </main>
  );
}
