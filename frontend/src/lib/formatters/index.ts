export function formatModuleLabel(label: string) {
  return label.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}
