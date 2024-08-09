function Button({
  icon,
  name,
  onClick,
}: {
  icon?: string;
  name: string;
  onClick: () => void;
}) {
  return (
    <div
      class={
        "w-full rounded-lg bg-white hover:bg-primary hover:text-white border border-neutral-200 px-4 py-2 flex items-center justify-center gap-2 cursor-pointer"
      }
      onClick={onClick}
    >
      {icon ? <img src={icon} alt={"button icon"} /> : null}
      <div class={"text-lg font-semibold"}>{name}</div>
    </div>
  );
}

export default Button;
