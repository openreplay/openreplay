import { createSignal, For, Show } from "solid-js";

function Dropdown(props: {
  options: { label: string; id: string }[];
  selected: string | boolean;
  onChange: (value: string | boolean) => void;
}) {
  const [isOpen, setIsOpen] = createSignal(false);

  const toggleDropdown = () => {
    setIsOpen(!isOpen());
  };
  const selectOption = (option: { id: string; label: string }) => {
    props.onChange(option.id);
    setIsOpen(false);
  };

  return (
    <div class="relative">
      <div
        class="max-w-64 block leading-tight cursor-pointer whitespace-nowrap overflow-hidden font-normal"
        onClick={toggleDropdown}
      >
        <Show
          when={props.options.find((option) => option.id === props.selected)}
          fallback={<span>Select Microphone Source</span>}
        >
          {props.options.find((option) => option.id === props.selected)?.label}
        </Show>
      </div>
      <Show when={isOpen()}>
        <div
          style="width:260px"
          class="absolute z-10 w-full bg-white border shadow-sm rounded-lg bottom-full mb-2 -left-4 text-start font-normal"
        >
          <For each={props.options}>
            {(option) => (
              <div
                class="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                onClick={() => selectOption(option)}
              >
                {option.label}
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

export default Dropdown;
