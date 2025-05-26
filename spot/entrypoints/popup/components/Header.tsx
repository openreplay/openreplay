import { Component } from "solid-js";
import orLogo from "~/assets/orSpot.svg";
import {
  HomePageSvg,
  SlackSvg,
  SettingsSvg,
} from "../Icons";

interface HeaderProps {
  openSettings: () => void;
}

const Header: Component<HeaderProps> = (props) => {
  const openHomePage = async () => {
    const { settings } = await chrome.storage.local.get("settings");
    return window.open(`${settings.ingestPoint}/spots`, "_blank");
  };

  const openOrSite = () => {
    window.open("https://openreplay.com", "_blank");
  };

  return (
    <div class="flex items-center gap-1">
      <div
        class="flex items-center gap-1 cursor-pointer hover:opacity-50"
        onClick={openOrSite}
      >
        <img src={orLogo} class="w-5" alt="OpenReplay Spot" />
        <div class="text-neutral-600">
          <span class="text-lg font-semibold text-black">OpenReplay Spot</span>
        </div>
      </div>

      <div class="ml-auto flex items-center gap-2">
        <div class="text-sm tooltip tooltip-bottom" data-tip="My Spots">
          <div onClick={openHomePage}>
            <div class="cursor-pointer p-2 hover:bg-indigo-lightest rounded-full">
              <HomePageSvg />
            </div>
          </div>
        </div>

        <div
          class="text-sm tooltip tooltip-bottom"
          data-tip="Get help on Slack"
        >
          <a
            href="https://join.slack.com/t/openreplay/shared_invite/zt-2brqlwcis-k7OtqHkW53EAoTRqPjCmyg"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div class="cursor-pointer p-2 hover:bg-indigo-lightest rounded-full">
              <SlackSvg />
            </div>
          </a>
        </div>

        <div
          class="text-sm tooltip tooltip-bottom"
          data-tip="Settings"
          onClick={props.openSettings}
        >
          <div class="cursor-pointer p-2 hover:bg-indigo-lightest rounded-full">
            <SettingsSvg />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
