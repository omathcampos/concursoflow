import type { SupabaseClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it } from "vitest";

import { useSupabaseCache } from "@/lib/data/supabase/cache-store";
import { hydrateSupabaseCache } from "@/lib/data/supabase/hydrate";

/**
 * Stub mínimo do client Supabase: `.from(table)` devolve um objeto que é ao
 * mesmo tempo "thenable" (pra `await client.from(x).select("*")` resolver
 * direto) e encadeável com `.eq().maybeSingle()` (usado por profiles e
 * notification_prefs) — sem precisar de um mock completo do supabase-js.
 */
function fakeClient(opts: { errorTable?: string } = {}): SupabaseClient {
  return {
    from(table: string) {
      const listResult = opts.errorTable === table ? { data: null, error: { message: `${table} falhou` } } : { data: [], error: null };
      const singleResult = { data: null, error: null };
      const stub = {
        select: () => stub,
        eq: () => stub,
        maybeSingle: async () => singleResult,
        then: (resolve: (value: typeof listResult) => void) => resolve(listResult),
      };
      return stub;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("hydrateSupabaseCache — revalidação silenciosa (stale-while-revalidate)", () => {
  beforeEach(() => {
    useSupabaseCache.setState({
      status: "ready",
      error: null,
      subjects: [{ id: "existing", name: "Matéria existente" } as never],
    });
  });

  it("sem silent (boot), passa por 'loading' — comportamento de sempre", async () => {
    const statuses: string[] = [];
    const unsubscribe = useSupabaseCache.subscribe((s) => statuses.push(s.status));

    await hydrateSupabaseCache(fakeClient(), "user-1");

    unsubscribe();
    expect(statuses).toContain("loading");
    expect(useSupabaseCache.getState().status).toBe("ready");
  });

  it("com silent:true, NUNCA passa por 'loading' — tela atual fica intacta", async () => {
    const statuses: string[] = [];
    const unsubscribe = useSupabaseCache.subscribe((s) => statuses.push(s.status));

    await hydrateSupabaseCache(fakeClient(), "user-1", { silent: true });

    unsubscribe();
    expect(statuses).not.toContain("loading");
    expect(useSupabaseCache.getState().status).toBe("ready");
  });

  it("silent:true com falha de rede mantém os dados atuais e não seta cache.error", async () => {
    await expect(hydrateSupabaseCache(fakeClient({ errorTable: "subjects" }), "user-1", { silent: true })).rejects.toThrow();

    const state = useSupabaseCache.getState();
    expect(state.error).toBeNull();
    expect(state.status).toBe("ready");
    expect(state.subjects).toEqual([{ id: "existing", name: "Matéria existente" }]);
  });

  it("sem silent, falha de rede seta cache.error e status vira 'error' — comportamento de sempre", async () => {
    await expect(hydrateSupabaseCache(fakeClient({ errorTable: "subjects" }), "user-1")).rejects.toThrow();

    const state = useSupabaseCache.getState();
    expect(state.error).toBe("subjects falhou");
    expect(state.status).toBe("error");
  });
});
