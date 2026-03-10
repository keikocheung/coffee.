import { getProjectById, Project } from "@/lib/projects";

const STORAGE_KEY = "coffee.bookmarks";

function dispatch() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("bookmarks-updated"));
  }
}

export function getBookmarkIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function isBookmarked(id: string): boolean {
  return getBookmarkIds().includes(id);
}

export function addBookmark(id: string): void {
  const ids = getBookmarkIds();
  if (!ids.includes(id)) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids, id]));
    dispatch();
  }
}

export function removeBookmark(id: string): void {
  const ids = getBookmarkIds().filter((i) => i !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  dispatch();
}

export function toggleBookmark(id: string): boolean {
  if (isBookmarked(id)) {
    removeBookmark(id);
    return false;
  } else {
    addBookmark(id);
    return true;
  }
}

export function getBookmarkedProjects(): Project[] {
  return getBookmarkIds()
    .map((id) => getProjectById(id))
    .filter((p): p is Project => p !== undefined);
}
