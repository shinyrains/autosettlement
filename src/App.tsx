import { useMemo, useState } from "react";
import { AppShell } from "./components/AppShell";
import { BatchListPage } from "./components/BatchListPage";
import {
  clearAppDraftState,
  createSeedAppState,
  hasPersistedAppDraftState,
  loadAppDraftState,
  saveAppDraftState,
} from "./state/appState";
import type { Company } from "./types/settlement";

type AppView = "batch-list" | "shell";

type AppProps = {
  initialView?: AppView;
  initialCompany?: Company;
};

function App({ initialView = "batch-list", initialCompany = "raon" }: AppProps) {
  const [view, setView] = useState<AppView>(initialView);
  const [activeCompany, setActiveCompany] = useState<Company>(initialCompany);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const hasPersistedDraft = useMemo(() => hasPersistedAppDraftState(), [listRefreshKey]);
  const draftState = useMemo(() => (hasPersistedDraft ? loadAppDraftState() : null), [hasPersistedDraft, listRefreshKey]);

  const handleOpenBatch = (company: Company = activeCompany) => {
    setActiveCompany(company);
    setView("shell");
  };

  const handleCreateNewBatch = (company: Company = activeCompany) => {
    clearAppDraftState();
    saveAppDraftState(createSeedAppState());
    setActiveCompany(company);
    setView("shell");
  };

  const handleReturnToBatchList = () => {
    setListRefreshKey((current) => current + 1);
    setView("batch-list");
  };

  if (view === "batch-list") {
    return (
      <BatchListPage
        draftState={draftState}
        onOpenBatch={handleOpenBatch}
        onCreateNewBatch={handleCreateNewBatch}
      />
    );
  }

  return <AppShell activeCompany={activeCompany} onBackToBatchList={handleReturnToBatchList} />;
}

export default App;
