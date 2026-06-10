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

type AppView = "batch-list" | "shell";

type AppProps = {
  initialView?: AppView;
};

function App({ initialView = "batch-list" }: AppProps) {
  const [view, setView] = useState<AppView>(initialView);
  const [listRefreshKey, setListRefreshKey] = useState(0);
  const hasPersistedDraft = useMemo(() => hasPersistedAppDraftState(), [listRefreshKey]);
  const draftState = useMemo(() => (hasPersistedDraft ? loadAppDraftState() : null), [hasPersistedDraft, listRefreshKey]);

  const handleOpenBatch = () => {
    setView("shell");
  };

  const handleCreateNewBatch = () => {
    clearAppDraftState();
    saveAppDraftState(createSeedAppState());
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

  return <AppShell onBackToBatchList={handleReturnToBatchList} />;
}

export default App;
