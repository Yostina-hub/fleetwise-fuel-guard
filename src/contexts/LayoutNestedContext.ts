/**
 * LayoutNestedContext
 * -------------------
 * Lets <Layout> detect that it is being rendered *inside* an outer Layout
 * shell (see `LayoutShell.tsx`). When nested, the inner Layout renders only
 * its children so the persistent sidebar/header stay mounted across route
 * navigations — eliminating the full-screen flash and re-fetch storm that
 * happens when every page wraps itself in its own Layout.
 *
 * This is purely additive: pages that still wrap themselves in <Layout>
 * keep working unchanged, but the wrapper becomes a no-op when it detects
 * the shell is already in the tree.
 */
import { createContext } from "react";

export const LayoutNestedContext = createContext(false);
