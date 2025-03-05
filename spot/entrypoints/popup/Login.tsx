function Login() {
  const onOpenLoginPage = async () => {
    const { settings } = await chrome.storage.local.get("settings");
    return openLoginPage(settings.ingestPoint);
  };
  const onOpenSignupPage = async () => {
    const { settings } = await chrome.storage.local.get("settings");
    return openSignupPage(settings.ingestPoint);
  };
  return (
    <div class={"flex flex-row gap-2"}>
      <button
        onClick={onOpenLoginPage}
        name={"Login"}
        class="btn btn-primary text-white shadow-sm text-lg w-2/4	"
      >
        Login
      </button>
      <button
        onClick={onOpenSignupPage}
        name={"Create Account"}
        class="btn btn-primary btn-outline bg-white shadow-sm text-lg w-2/4	"
      >
        Create Account
      </button>
    </div>
  );
}

function getLink(url: string) {
  let str = url;
  if (str.endsWith("/")) {
    str = str.slice(0, -1);
  }
  if (str.includes("api.openreplay.com")) {
    str = str.replace("api.openreplay.com", "app.openreplay.com");
  }
  return str;
}

function openSignupPage(instanceUrl: string) {
  const signupUrl = `${getLink(instanceUrl)}/signup?spotCallback=true`;

  chrome.tabs.create({
    url: signupUrl,
    active: true,
  });
}

function openLoginPage(instanceUrl: string) {
  const loginUrl = `${getLink(instanceUrl)}/login?spotCallback=true`;

  chrome.tabs.create({
    url: loginUrl,
    active: true,
  });
}

export default Login;
