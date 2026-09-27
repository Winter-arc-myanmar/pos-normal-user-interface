import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiLoadingState } from "@/components/ApiLoadingState";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Category } from "@/core/domain/entities/Category";
import { useAuth } from "@/core/presentation/hooks/useAuth";
import { useCategoryManagement } from "@/core/presentation/hooks/useCategoryManagement";

const fieldClass =
  "mt-1 min-h-10 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none focus:border-blue-500";

type Draft = {
  id: string;
  name: string;
  parentId: string;
  description: string;
  sortOrder: string;
};

const emptyDraft = (parentId = ""): Draft => ({
  id: "",
  name: "",
  parentId,
  description: "",
  sortOrder: "0",
});

const draftFrom = (category: Category): Draft => ({
  id: category.id,
  name: category.name,
  parentId: category.parentId || "",
  description: category.description || "",
  sortOrder: String(category.sortOrder ?? 0),
});

const flatten = (nodes: Category[]): Category[] =>
  nodes.flatMap((node) => [node, ...flatten(node.children || [])]);

const sortNodes = (nodes: Category[]): Category[] =>
  [...nodes].sort(
    (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)
  );

const buildTree = (categories: Category[]): Category[] => {
  const ids = new Set(categories.map((category) => category.id));
  const byParent = new Map<string, Category[]>();
  for (const category of categories) {
    const parent =
      category.parentId && ids.has(category.parentId) ? category.parentId : "";
    const list = byParent.get(parent) || [];
    list.push(category);
    byParent.set(parent, list);
  }
  const attach = (parentId: string): Category[] =>
    sortNodes(byParent.get(parentId) || []).map(
      (category) =>
        new Category({
          ...category,
          children: attach(category.id),
        })
    );
  return attach("");
};

const asTree = (nodes: Category[]): Category[] => {
  if (!nodes.length) return [];
  if (nodes.some((node) => node.children && node.children.length > 0)) {
    return sortNodes(nodes).map(
      (node) =>
        new Category({
          ...node,
          children: asTree(node.children || []),
        })
    );
  }
  return buildTree(flatten(nodes));
};

const descendantIds = (id: string, categories: Category[]) => {
  const ids = new Set<string>();
  const walkNode = (category?: Category) => {
    for (const child of category?.children || []) {
      if (!child.id || ids.has(child.id)) continue;
      ids.add(child.id);
      walkNode(child);
    }
  };
  walkNode(categories.find((category) => category.id === id));
  const children = new Map<string, string[]>();
  for (const category of categories) {
    if (!category.parentId) continue;
    const list = children.get(category.parentId) || [];
    list.push(category.id);
    children.set(category.parentId, list);
  }
  const walk = (current: string) => {
    for (const child of children.get(current) || []) {
      if (ids.has(child)) continue;
      ids.add(child);
      walk(child);
    }
  };
  walk(id);
  return ids;
};

export function CategoriesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    categories,
    tree,
    page,
    totalPages,
    total,
    isLoading,
    error,
    listCategories,
    listTree,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategoryManagement();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const searching = search.trim().length > 0;

  useEffect(() => {
    void listTree().catch(() => undefined);
  }, [listTree]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void listCategories({
        page: currentPage,
        limit: 50,
        search: search.trim() || undefined,
        sortBy: searching ? "name" : "sortOrder",
        sortOrder: "asc",
      }).catch(() => undefined);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [currentPage, listCategories, search, searching]);

  const catalog = useMemo(() => {
    const fromTree = flatten(tree);
    return fromTree.length ? fromTree : categories;
  }, [categories, tree]);

  const visibleTree = useMemo(
    () => (searching ? [] : asTree(tree.length ? tree : categories)),
    [categories, searching, tree]
  );

  const parentNames = useMemo(
    () => new Map(catalog.map((category) => [category.id, category.name])),
    [catalog]
  );

  const blockedParents = useMemo(() => {
    if (!draft.id) return new Set<string>();
    return new Set([draft.id, ...descendantIds(draft.id, catalog)]);
  }, [catalog, draft.id]);

  const reload = async () => {
    await Promise.all([
      listTree(),
      listCategories({
        page: currentPage,
        limit: 50,
        search: search.trim() || undefined,
        sortBy: searching ? "name" : "sortOrder",
        sortOrder: "asc",
      }),
    ]);
  };

  const openCategory = (category: Category) => {
    setDraft(draftFrom(category));
    setConfirmDelete(false);
    setNotice(null);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const sortOrder = Number(draft.sortOrder || 0);
    try {
      const saved = draft.id
        ? await updateCategory(draft.id, {
            name: draft.name.trim(),
            parentId: draft.parentId || null,
            description: draft.description.trim() || null,
            sortOrder,
          })
        : await createCategory({
            name: draft.name.trim(),
            tenantId: user?.tenantId || "",
            parentId: draft.parentId || undefined,
            description: draft.description.trim() || undefined,
            sortOrder,
          });
      setDraft(draftFrom(saved));
      setNotice(t("categories.saved"));
      setConfirmDelete(false);
      await reload();
    } catch {
      setNotice(null);
    }
  };

  const remove = async () => {
    if (!draft.id) return;
    try {
      await deleteCategory(draft.id);
      setDraft(emptyDraft());
      setNotice(t("categories.deleted"));
      setConfirmDelete(false);
      await reload();
    } catch {
      setNotice(null);
    }
  };

  const count = searching ? total : catalog.length || total;

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-[#080808] text-slate-100 min-[1100px]:grid min-[1100px]:grid-cols-[minmax(0,1.2fr)_minmax(20rem,26rem)] min-[1100px]:grid-rows-[auto_minmax(0,1fr)] min-[1100px]:gap-3 min-[1100px]:p-3">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3 min-[1100px]:contents">
        <header className="flex min-w-0 flex-wrap items-center gap-2 min-[1100px]:col-span-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold">{t("categories.title")}</h1>
            <p className="text-xs text-slate-400">
              {t("categories.subtitle", { count })}
            </p>
          </div>
          <div className="w-full min-w-0 sm:w-64">
            <SearchInput
              aria-label={t("categories.search")}
              placeholder={t("categories.search")}
              value={search}
              onChange={(event) => {
                setCurrentPage(1);
                setSearch(event.target.value);
              }}
              onClear={() => setSearch("")}
            />
          </div>
          <Button type="button" onClick={() => setDraft(emptyDraft())}>
            {t("categories.add")}
          </Button>
        </header>

        <div className="flex h-80 shrink-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-800 bg-[#101010] min-[1100px]:h-full min-[1100px]:min-h-0">
          {error ? (
            <p className="m-2 rounded bg-red-950/50 px-3 py-2 text-sm text-red-200">{error}</p>
          ) : null}
          <div className="relative m-2 min-h-0 flex-1 overflow-auto">
            {isLoading && catalog.length === 0 ? (
              <ApiLoadingState label={t("categories.loading")} />
            ) : searching ? (
              categories.length === 0 ? (
                <p className="p-6 text-sm text-slate-400">{t("categories.empty")}</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {categories.map((category) => (
                    <li key={category.id}>
                      <CategoryRow
                        category={category}
                        selected={draft.id === category.id}
                        parentName={parentNames.get(category.parentId || "")}
                        onClick={() => openCategory(category)}
                      />
                    </li>
                  ))}
                </ul>
              )
            ) : visibleTree.length === 0 ? (
              <p className="p-6 text-sm text-slate-400">{t("categories.empty")}</p>
            ) : (
              <CategoryTree
                nodes={visibleTree}
                depth={0}
                selectedId={draft.id}
                expanded={expanded}
                onToggle={(id) =>
                  setExpanded((current) => ({ ...current, [id]: current[id] === false }))
                }
                onSelect={openCategory}
              />
            )}
          </div>
          {searching ? (
            <div className="flex shrink-0 items-center justify-between border-t border-slate-800 px-2 py-2 text-xs text-slate-400">
              <button
                type="button"
                className="min-h-9 min-w-9 rounded bg-slate-800 disabled:opacity-40"
                disabled={page <= 1 || isLoading}
                onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
                aria-label={t("categories.prevPage")}
              >
                ‹
              </button>
              <span>
                {page} / {Math.max(1, totalPages)}
              </span>
              <button
                type="button"
                className="min-h-9 min-w-9 rounded bg-slate-800 disabled:opacity-40"
                disabled={page >= totalPages || isLoading}
                onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
                aria-label={t("categories.nextPage")}
              >
                ›
              </button>
            </div>
          ) : null}
        </div>

        <form
          id="category-form"
          onSubmit={(event) => void save(event)}
          className="shrink-0 rounded-xl border border-slate-800 bg-slate-950 p-4 min-[1100px]:min-h-0 min-[1100px]:overflow-y-auto"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">
              {draft.id ? t("categories.edit") : t("categories.create")}
            </h2>
            {draft.id ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setDraft(emptyDraft(draft.id));
                  setConfirmDelete(false);
                  setNotice(null);
                }}
              >
                {t("categories.addChild")}
              </Button>
            ) : null}
          </div>
          {notice ? <p className="mt-2 text-sm text-emerald-300">{notice}</p> : null}
          <label className="mt-3 block text-xs text-slate-400">
            {t("categories.name")}
            <input
              required
              className={fieldClass}
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
          <label className="mt-3 block text-xs text-slate-400">
            {t("categories.parent")}
            <select
              className={fieldClass}
              value={draft.parentId}
              onChange={(event) =>
                setDraft((current) => ({ ...current, parentId: event.target.value }))
              }
            >
              <option value="">{t("categories.noParent")}</option>
              {catalog
                .filter((category) => !blockedParents.has(category.id))
                .map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="mt-3 block text-xs text-slate-400">
            {t("categories.description")}
            <textarea
              className={`${fieldClass} min-h-20 py-2`}
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
            />
          </label>
          <label className="mt-3 block text-xs text-slate-400">
            {t("categories.sortOrder")}
            <input
              required
              type="number"
              min={0}
              className={fieldClass}
              value={draft.sortOrder}
              onChange={(event) =>
                setDraft((current) => ({ ...current, sortOrder: event.target.value }))
              }
            />
          </label>
          <div className="mt-4 hidden gap-2 min-[1100px]:flex">
            <Button type="submit" isLoading={isLoading} fullWidth>
              {t("common.save")}
            </Button>
            {draft.id ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => (confirmDelete ? void remove() : setConfirmDelete(true))}
              >
                {confirmDelete ? t("categories.confirmDelete") : t("common.delete")}
              </Button>
            ) : null}
          </div>
        </form>
      </div>
      <div className="flex shrink-0 gap-2 border-t border-slate-800 bg-slate-950 p-3 min-[1100px]:hidden">
        <Button type="submit" form="category-form" isLoading={isLoading} fullWidth>
          {t("common.save")}
        </Button>
        {draft.id ? (
          <Button
            type="button"
            variant="destructive"
            onClick={() => (confirmDelete ? void remove() : setConfirmDelete(true))}
          >
            {confirmDelete ? t("categories.confirmDelete") : t("common.delete")}
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function CategoryRow({
  category,
  selected,
  parentName,
  depth = 0,
  childCount = 0,
  expanded = true,
  onToggle,
  onClick,
}: {
  category: Category;
  selected: boolean;
  parentName?: string;
  depth?: number;
  childCount?: number;
  expanded?: boolean;
  onToggle?: () => void;
  onClick: () => void;
}) {
  return (
    <div className="flex items-stretch gap-1" style={{ paddingLeft: depth * 16 }}>
      {childCount > 0 ? (
        <button
          type="button"
          className="min-h-11 min-w-8 rounded text-slate-400"
          aria-expanded={expanded}
          onClick={onToggle}
        >
          {expanded ? "▾" : "▸"}
        </button>
      ) : (
        <span className="w-8 shrink-0" />
      )}
      <button
        type="button"
        onClick={onClick}
        className={[
          "flex min-h-11 min-w-0 flex-1 items-center justify-between gap-2 rounded-lg border px-3 text-left",
          selected ? "border-blue-500 bg-blue-950/40" : "border-slate-800 bg-slate-950",
        ].join(" ")}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{category.name}</span>
          {parentName ? (
            <span className="block truncate text-xs text-slate-500">{parentName}</span>
          ) : category.description ? (
            <span className="block truncate text-xs text-slate-500">{category.description}</span>
          ) : null}
        </span>
        <span className="shrink-0 text-xs text-slate-500">{category.sortOrder}</span>
      </button>
    </div>
  );
}

function CategoryTree({
  nodes,
  depth,
  selectedId,
  expanded,
  onToggle,
  onSelect,
}: {
  nodes: Category[];
  depth: number;
  selectedId: string;
  expanded: Record<string, boolean>;
  onToggle: (id: string) => void;
  onSelect: (category: Category) => void;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {nodes.map((category) => {
        const children = category.children || [];
        const isOpen = expanded[category.id] !== false;
        return (
          <li key={category.id}>
            <CategoryRow
              category={category}
              selected={selectedId === category.id}
              depth={depth}
              childCount={children.length}
              expanded={isOpen}
              onToggle={() => onToggle(category.id)}
              onClick={() => onSelect(category)}
            />
            {children.length > 0 && isOpen ? (
              <div className="mt-1">
                <CategoryTree
                  nodes={children}
                  depth={depth + 1}
                  selectedId={selectedId}
                  expanded={expanded}
                  onToggle={onToggle}
                  onSelect={onSelect}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
