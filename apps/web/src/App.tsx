import { useState } from "react";
import { LandingPage } from "./pages/LandingPage";
import { WWH2Panel } from "./wwh2/WWH2Panel";

export function App() {
  const [wwh2MenuTrigger, setWwh2MenuTrigger] = useState(0);

  return (
    <>
      <LandingPage onOpenWwh2={() => setWwh2MenuTrigger((n) => n + 1)} />
      <WWH2Panel openMenuTrigger={wwh2MenuTrigger} />
    </>
  );
}
