import { createSignal, onMount } from "solid-js";
import orLogo from "~/assets/orSpot.svg";
import arrowLeft from "~/assets/arrow-left.svg";

const defaultIngest = "https://app.openreplay.com";

function Settings({ goBack }: { goBack: () => void }) {
  const [includeDevTools, setIncludeDevTools] = createSignal(true);
  const [openInNewTab, setOpenInNewTab] = createSignal(true);
  const [showIngest, setShowIngest] = createSignal(false);
  const [ingest, setIngest] = createSignal(defaultIngest);
  const [editIngest, setEditIngest] = createSignal(false);
  const [tempIngest, setTempIngest] = createSignal("");

  onMount(() => {
    chrome.storage.local.get("settings", (data: any) => {
      if (data.settings) {
        console.log('update state', data.settings)
        const ingest =
          data.settings.ingestPoint || defaultIngest;
        const devToolsEnabled =
          data.settings.consoleLogs && data.settings.networkLogs;
        setOpenInNewTab(data.settings.openInNewTab ?? false);
        setIncludeDevTools(devToolsEnabled);
        setIngest(ingest);
        setTempIngest(ingest);
        setShowIngest(ingest !== defaultIngest);
        setEditIngest(!data.settings.ingestPoint);
      }
    });
  });

  const toggleIncludeDevTools = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    const value = includeDevTools();
    setIncludeDevTools(!value);
    chrome.runtime.sendMessage({
      type: "ort:settings",
      settings: { consoleLogs: !value, networkLogs: !value },
    });
  };

  const toggleShowIngest = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    const value = e.target.checked
    const newSettings = { showIngest: value }
    if (!value) {
      newSettings['ingestPoint'] = defaultIngest
    }
    chrome.runtime.sendMessage({
      type: "ort:settings",
      settings: newSettings,
    });
    setShowIngest(value);
  };

  const applyIngest = () => {
    const val = tempIngest();
    if (isValidUrl(val)) {
      chrome.runtime.sendMessage({
        type: "ort:settings",
        settings: { ingestPoint: val },
      });
      setIngest(val);
      setEditIngest(false);
    } else {
      alert("Please enter a valid URL.");
    }
  };

  const toggleEditIngest = (isEditing: boolean) => {
    setTempIngest(ingest());
    setEditIngest(isEditing);
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  const toggleOpenInNewTab = (e: Event) => {
    e.stopPropagation();
    const value = openInNewTab();
    setOpenInNewTab(!value);
    chrome.runtime.sendMessage({
      type: "ort:settings",
      settings: { openInNewTab: !value },
    });
  };

  return (
    <div class={"flex flex-col"}>
      <div class={"flex gap-2 items-center justify-between p-4"}>
        <button
          class="btn btn-xs btn-circle bg-white hover:bg-indigo-50"
          onClick={goBack}
        >
          <img src={arrowLeft} alt={"Go back"} />
        </button>
        <div class="flex gap-2">
          <img src={orLogo} class="w-5" alt={"Openreplay Spot logo"} />
          <span class={"text-lg font-semibold"}>Settings</span>
        </div>
        <span>
          {/* Keeps Settings title section in the middle of the window. */}
        </span>
      </div>

      <div class="flex flex-col">
        <div class="p-4 border-b border-slate-300 hover:bg-indigo-50">
          <div class="flex flex-row justify-between items-center">
            <p class="font-semibold mb-1 flex items-center">View Recording</p>

            <label class="label cursor-pointer pr-0">
              <input
                type="checkbox"
                class="toggle toggle-primary toggle-sm cursor-pointer"
                checked={openInNewTab()}
                onChange={toggleOpenInNewTab}
              />
            </label>
          </div>
          <p class="text-xs">
            Take me to newly created Spot tab after saving a recording.
          </p>
        </div>

        <div class="flex flex-col border-b border-slate-300 cursor-default justify-between p-4 hover:bg-indigo-50">
          <div class="flex flex-row justify-between items-center">
            <p class="font-semibold mb-1 flex items-center">
              <span>Include DevTools</span>
            </p>
            <div>
              <label class="cursor-pointer">
                <input
                  type="checkbox"
                  class="toggle toggle-primary toggle-sm"
                  checked={includeDevTools()}
                  onChange={toggleIncludeDevTools}
                />
              </label>
            </div>
          </div>
          <p class="text-xs">
            Include console logs, network calls and other useful debugging
            information for developers.
          </p>
        </div>

        <div class="p-4 hover:bg-indigo-50 cursor-default">
          <div class="flex flex-row justify-between">
            <p class="font-semibold mb-1">Ingest Point</p>
            <div>
              <label class="cursor-pointer">
                <input
                  type="checkbox"
                  class="toggle toggle-primary toggle-sm"
                  checked={showIngest()}
                  onChange={toggleShowIngest}
                />
              </label>
            </div>
          </div>
          <p class="text-xs">
            Set this URL if you are self-hosting OpenReplay so it points to your
            instance.
          </p>

          {showIngest() && (
            <div class="flex flex-col justify-start py-4 cursor-default">
              {editIngest() ? (
                <div class={"flex flex-col items-start gap-2"}>
                  <input
                    class={"input input-bordered input-sm w-full max-w-xs mb-2"}
                    type="text"
                    value={tempIngest()}
                    onChange={(e) => setTempIngest(e.currentTarget.value)}
                    autofocus
                  />

                  <div class="flex gap-2 justify-start items-center">
                    <button
                      class="btn btn-sm btn-primary text-white hover:bg-primary hover:text-white"
                      onClick={applyIngest}
                    >
                      Save
                    </button>

                    <button
                      class="btn btn-sm btn-link font-normal no-underline hover:no-underline hover:opacity-75"
                      onClick={() => toggleEditIngest(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div class={"flex items-center gap-2"}>
                  <span class={"text-gray-700"}>{ingest()}</span>
                  <button
                    class="btn btn-sm btn-link font-normal no-underline hover:no-underline hover:opacity-75"
                    onClick={() => toggleEditIngest(true)}
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
