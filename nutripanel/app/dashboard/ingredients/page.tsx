"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SearchResult = {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner: string | null;
};

type ImportedIngredient = {
  id: string;
  name: string;
  sourceType: string;
  sourceRef: string | null;
  brandName: string | null;
  createdAt: string;
  nutrientProfile: {
    caloriesKcal: string;
    proteinG: string;
    carbsG: string;
    fatG: string;
  } | null;
};

function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error && err.message ? err.message : fallback;
}

export default function IngredientsPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [imported, setImported] = useState<ImportedIngredient[]>([]);
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingImported, setLoadingImported] = useState(false);
  const [importingFdcId, setImportingFdcId] = useState<number | null>(null);
  const [removingIngredientId, setRemovingIngredientId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [importedError, setImportedError] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const selectedCount = selectedIngredientIds.length;
  const recipeBuilderHref =
    selectedCount > 0
      ? `/dashboard/recipes/new?ingredientIds=${encodeURIComponent(
          selectedIngredientIds.join(",")
        )}`
      : "#";
  const selectedImported = useMemo(
    () => imported.filter((item) => selectedIngredientIds.includes(item.id)),
    [imported, selectedIngredientIds]
  );

  async function loadImportedIngredients() {
    setLoadingImported(true);
    setImportedError("");
    try {
      const fetchList = () =>
        fetch("/api/ingredients/list", {
          cache: "no-store",
          credentials: "include",
        });

      let res = await fetchList();
      // Clerk/session propagation can be briefly eventual after auth transitions.
      if (res.status === 401) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        res = await fetchList();
      }

      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        throw new Error(`Server returned non-JSON (${res.status}).`);
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load ingredients");
      }
      const rows = Array.isArray(data.ingredients) ? data.ingredients : [];
      setImported(rows);
      // Keep only still-valid selected IDs after refresh.
      setSelectedIngredientIds((prev) =>
        prev.filter((id) => rows.some((item: ImportedIngredient) => item.id === id))
      );
    } catch (err: unknown) {
      setImportedError(
        getErrorMessage(err, "Failed to load imported ingredients. Please try refresh.")
      );
    } finally {
      setLoadingImported(false);
    }
  }

  useEffect(() => {
    void loadImportedIngredients();
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmedQuery = query.trim();
    setHasSearched(false);
    setResults([]);

    if (trimmedQuery.length < 2) {
      setError("Please enter at least 2 characters to search.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ingredients/search", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: trimmedQuery }),
      });

      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        throw new Error(
          `Server returned non-JSON (${res.status}). Is /api/ingredients/search deployed?`
        );
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Search failed");
      }

      setResults(data.results || []);
      setHasSearched(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Something went wrong"));
    } finally {
      setLoading(false);
    }
  }

  async function importIngredient(fdcId: number) {
    setImportingFdcId(fdcId);
    try {
      const res = await fetch("/api/ingredients/import", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fdcId }),
      });

      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        throw new Error(`Server returned non-JSON (${res.status}).`);
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Import failed");
      }

      alert("Ingredient imported!");
      // Reset search UI after successful import to keep workflow focused.
      setQuery("");
      setResults([]);
      setHasSearched(false);
      setError("");
      await loadImportedIngredients();
    } catch (err: unknown) {
      alert(getErrorMessage(err, "Import failed"));
    } finally {
      setImportingFdcId(null);
    }
  }

  function toggleSelectedIngredient(id: string) {
    setSelectedIngredientIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function removeIngredient(ingredientId: string) {
    const removeSelected =
      selectedIngredientIds.length > 0 && selectedIngredientIds.includes(ingredientId);
    const targetIds = removeSelected ? selectedIngredientIds : [ingredientId];
    const confirmed = window.confirm(
      removeSelected
        ? `Remove ${targetIds.length} selected ingredient(s) from your list?`
        : "Remove this ingredient from your list?"
    );
    if (!confirmed) return;

    setRemovingIngredientId(ingredientId);
    try {
      const res = await fetch("/api/ingredients/list", {
        method: "DELETE",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ingredientIds: targetIds }),
      });
      const ct = res.headers.get("content-type") ?? "";
      if (!ct.includes("application/json")) {
        throw new Error(`Server returned non-JSON (${res.status}).`);
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove ingredient");
      }

      setImported((prev) => prev.filter((item) => !targetIds.includes(item.id)));
      setSelectedIngredientIds((prev) =>
        prev.filter((id) => !targetIds.includes(id))
      );
    } catch (err: unknown) {
      alert(getErrorMessage(err, "Failed to remove ingredient"));
    } finally {
      setRemovingIngredientId(null);
    }
  }

  return (
    <main className="min-h-screen p-10 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900">
          Ingredient Search
        </h1>
        <p className="mt-2 text-gray-600">
          Search USDA ingredients to build your nutrition database.
        </p>

        <form onSubmit={handleSearch} className="mt-6 flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. turmeric powder"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-black text-white rounded-xl font-medium disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {error && (
          <p className="mt-4 text-red-600">{error}</p>
        )}

        {!error && hasSearched && results.length === 0 && (
          <p className="mt-4 text-amber-700">
            No ingredients found for &quot;{query.trim()}&quot;. Try a simpler keyword
            (e.g. &quot;turmeric&quot;, &quot;milk&quot;, &quot;chicken&quot;).
          </p>
        )}

        <div className="mt-8 space-y-3">
          {results.map((item) => (
            <div
              key={item.fdcId}
              className="p-4 bg-white border border-gray-200 rounded-xl"
            >
              <h2 className="font-semibold text-gray-900">
                {item.description}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Type: {item.dataType}
              </p>
              {item.brandOwner && (
                <p className="text-sm text-gray-600">
                  Brand: {item.brandOwner}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                FDC ID: {item.fdcId}
              </p>
              <button
                onClick={() => importIngredient(item.fdcId)}
                disabled={importingFdcId === item.fdcId}
                className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50"
              >
                {importingFdcId === item.fdcId ? "Importing..." : "Import"}
              </button>
            </div>
          ))}

        </div>

        <section className="mt-12">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-gray-900">My Imported Ingredients</h2>
            <button
              onClick={() => loadImportedIngredients()}
              disabled={loadingImported}
              className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
            >
              {loadingImported ? "Refreshing..." : "Refresh list"}
            </button>
          </div>

          <p className="mt-2 text-sm text-gray-600">
            Select ingredients to use in recipe creation.
          </p>

          {importedError && (
            <p className="mt-3 text-red-600">{importedError}</p>
          )}

          {!importedError && !loadingImported && imported.length === 0 && (
            <p className="mt-3 text-gray-600">No imported ingredients yet.</p>
          )}

          <div className="mt-4 space-y-2">
            {imported.map((item) => {
              const checked = selectedIngredientIds.includes(item.id);
              return (
                <label
                  key={item.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-3 bg-white ${
                    checked ? "border-green-500" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSelectedIngredient(item.id)}
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {item.sourceType} · FDC {item.sourceRef ?? "-"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <p className="text-xs text-gray-500 whitespace-nowrap">
                      {item.nutrientProfile?.caloriesKcal ?? "0"} kcal/100g
                    </p>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void removeIngredient(item.id);
                      }}
                      disabled={removingIngredientId === item.id}
                      className="px-2 py-1 text-xs rounded-md border border-red-200 text-red-700 bg-red-50 disabled:opacity-50"
                    >
                      {removingIngredientId === item.id ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-700">
              Selected ingredients: <span className="font-semibold">{selectedCount}</span>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Next step: attach grams per selected ingredient in recipe builder API/UI.
            </p>
            {selectedImported.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedImported.map((item) => (
                  <span
                    key={item.id}
                    className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs text-green-800"
                  >
                    {item.name}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-4">
              <Link
                href={recipeBuilderHref}
                onClick={() => {
                  if (selectedCount > 0) {
                    sessionStorage.setItem(
                      "np:selectedIngredientIds",
                      JSON.stringify(selectedIngredientIds)
                    );
                  }
                }}
                className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium ${
                  selectedCount > 0
                    ? "bg-black text-white hover:bg-gray-800"
                    : "bg-gray-200 text-gray-500 pointer-events-none"
                }`}
                aria-disabled={selectedCount === 0}
              >
                Continue to Recipe Builder
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}