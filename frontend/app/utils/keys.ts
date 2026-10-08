/** Keys typed into a field, or while a dialog, menu or listbox has focus,
 *  belong to that control, not to the page's shortcuts. */
export function ownsKeys(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    !!target.closest(
      'input, textarea, select, [role="dialog"], [role="alertdialog"], [role="menu"], [role="menubar"], [role="listbox"], [role="combobox"], [role="slider"], [role="textbox"]',
    )
  );
}
