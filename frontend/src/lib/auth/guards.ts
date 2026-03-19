export function isProtectedPath(pathname: string) {
  return !pathname.startsWith("/login") && !pathname.startsWith("/register");
}
