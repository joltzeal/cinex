"use client";

import { useState, useRef, useEffect, useCallback, useMemo, JSX } from "react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  Folder,
  Box
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Share2 } from "lucide-react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ChevronRightIcon, ChevronDownIcon, MagnifyingGlassIcon, Cross2Icon } from "@radix-ui/react-icons";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

export interface TreeViewItem {
  id: string;
  name: string;
  type: string;
  children?: TreeViewItem[];
  checked?: boolean;
}
export interface DirectoryTag {
  type: 'downloadDir' | 'mediaLibraryDir';
  mediaType: string;
  source: string; // 例如 'JAV', 'Magnet'
}
export interface TreeViewItemWithTags extends TreeViewItem {
  tags?: DirectoryTag[];
  children?: TreeViewItemWithTags[];
}
export interface TreeViewIconMap {
  [key: string]: React.ReactNode | undefined;
}

export interface TreeViewMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  action: (items: TreeViewItemWithTags[]) => void;
}

export interface TreeViewProps {
  className?: string;
  data: TreeViewItemWithTags[];
  title?: string;
  showExpandAll?: boolean;
  showCheckboxes?: boolean;
  checkboxPosition?: "left" | "right";
  searchPlaceholder?: string;
  selectionText?: string;
  checkboxLabels?: {
    check: string;
    uncheck: string;
  };
  getIcon?: (item: TreeViewItemWithTags, depth: number) => React.ReactNode;
  onSelectionChange?: (selectedItems: TreeViewItemWithTags[]) => void;
  onAction?: (action: string, items: TreeViewItemWithTags[]) => void;
  onCheckChange?: (item: TreeViewItemWithTags, checked: boolean) => void;
  iconMap?: TreeViewIconMap;
  menuItems?: TreeViewMenuItem[];
}

interface TreeItemProps {
  item: TreeViewItemWithTags;
  depth?: number;
  selectedIds: Set<string>;
  lastSelectedId: React.MutableRefObject<string | null>;
  onSelect: (ids: Set<string>) => void;
  expandedIds: Set<string>;
  onToggleExpand: (id: string, isOpen: boolean) => void;
  getIcon?: (item: TreeViewItemWithTags, depth: number) => React.ReactNode;
  onAction?: (action: string, items: TreeViewItemWithTags[]) => void;
  onAccessChange?: (item: TreeViewItemWithTags, hasAccess: boolean) => void;
  allItems: TreeViewItemWithTags[];
  showAccessRights?: boolean;
  itemMap: Map<string, TreeViewItemWithTags>;
  iconMap?: TreeViewIconMap;
  menuItems?: TreeViewMenuItem[];
  getSelectedItems: () => TreeViewItemWithTags[];
}

// Helper function to build a map of all items by ID
const buildItemMap = (items: TreeViewItemWithTags[]): Map<string, TreeViewItemWithTags> => {
  const map = new Map<string, TreeViewItemWithTags>();
  const processItem = (item: TreeViewItemWithTags) => {
    map.set(item.id, item);
    item.children?.forEach(processItem);
  };
  items.forEach(processItem);
  return map;
};

// Update the getCheckState function to work bottom-up
const getCheckState = (
  item: TreeViewItemWithTags,
  itemMap: Map<string, TreeViewItemWithTags>
): "checked" | "unchecked" | "indeterminate" => {
  // Get the original item from the map
  const originalItem = itemMap.get(item.id);
  if (!originalItem) return "unchecked";

  // If it's a leaf node (no children), return its check state
  if (!originalItem.children || originalItem.children.length === 0) {
    return originalItem.checked ? "checked" : "unchecked";
  }

  // Count the check states of immediate children
  let checkedCount = 0;
  let indeterminateCount = 0;

  originalItem.children.forEach(child => {
    const childState = getCheckState(child, itemMap);
    if (childState === "checked") checkedCount++;
    if (childState === "indeterminate") indeterminateCount++;
  });

  // Calculate parent state based on children states
  const totalChildren = originalItem.children.length;

  // If all children are checked
  if (checkedCount === totalChildren) {
    return "checked";
  }
  // If any child is checked or indeterminate
  if (checkedCount > 0 || indeterminateCount > 0) {
    return "indeterminate";
  }
  // If no children are checked or indeterminate
  return "unchecked";
};

// Add this default icon map
const defaultIconMap: TreeViewIconMap = {
  file: <Box className="h-4 w-4 text-red-600" />,
  folder: <Folder className="h-4 w-4 text-primary/80" />,
};

function TreeItem({
  item,
  depth = 0,
  selectedIds,
  lastSelectedId,
  onSelect,
  expandedIds,
  onToggleExpand,
  getIcon,
  onAction,
  onAccessChange,
  allItems,
  showAccessRights,
  itemMap,
  iconMap = defaultIconMap,
  menuItems,
  getSelectedItems,
}: TreeItemProps): JSX.Element {
  const isOpen = expandedIds.has(item.id);
  const isSelected = selectedIds.has(item.id);
  const itemRef = useRef<HTMLDivElement>(null);
  const [selectionStyle, setSelectionStyle] = useState("");

  // Get all visible items in order
  const getVisibleItems = useCallback(
    (items: TreeViewItemWithTags[]): TreeViewItemWithTags[] => {
      let visibleItems: TreeViewItemWithTags[] = [];

      items.forEach((item) => {
        visibleItems.push(item);
        if (item.children && expandedIds.has(item.id)) {
          visibleItems = [...visibleItems, ...getVisibleItems(item.children)];
        }
      });

      return visibleItems;
    },
    [expandedIds]
  );

  useEffect(() => {
    if (!isSelected) {
      setSelectionStyle("");
      return;
    }

    // Get all visible items from the entire tree
    const visibleItems = getVisibleItems(allItems);
    const currentIndex = visibleItems.findIndex((i) => i.id === item.id);

    const prevItem = visibleItems[currentIndex - 1];
    const nextItem = visibleItems[currentIndex + 1];

    const isPrevSelected = prevItem && selectedIds.has(prevItem.id);
    const isNextSelected = nextItem && selectedIds.has(nextItem.id);

    const roundTop = !isPrevSelected;
    const roundBottom = !isNextSelected;

    setSelectionStyle(
      `${roundTop ? "rounded-t-md" : ""} ${roundBottom ? "rounded-b-md" : ""}`
    );
  }, [
    isSelected,
    selectedIds,
    expandedIds,
    item.id,
    getVisibleItems,
    allItems,
  ]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    let newSelection = new Set(selectedIds);

    if (!itemRef.current) return;

    if (e.shiftKey && lastSelectedId.current !== null) {
      const items = Array.from(
        document.querySelectorAll("[data-tree-item]")
      ) as HTMLElement[];
      const lastIndex = items.findIndex(
        (el) => el.getAttribute("data-id") === lastSelectedId.current
      );
      const currentIndex = items.findIndex((el) => el === itemRef.current);
      const [start, end] = [
        Math.min(lastIndex, currentIndex),
        Math.max(lastIndex, currentIndex),
      ];

      items.slice(start, end + 1).forEach((el) => {
        const id = el.getAttribute("data-id");
        const parentFolderClosed = el.closest('[data-folder-closed="true"]');
        const isClosedFolder = el.getAttribute("data-folder-closed") === "true";

        if (id && (isClosedFolder || !parentFolderClosed)) {
          newSelection.add(id);
        }
      });
    } else if (e.ctrlKey || e.metaKey) {
      if (newSelection.has(item.id)) {
        newSelection.delete(item.id);
      } else {
        newSelection.add(item.id);
      }
    } else {
      newSelection = new Set([item.id]);
      // Open folder on single click if it's a folder
      if (item.children && isSelected) {
        onToggleExpand(item.id, !isOpen);
      }
    }

    lastSelectedId.current = item.id;
    onSelect(newSelection);
  };

  const handleAction = (action: string) => {
    if (onAction) {
      // Get all selected items, or just this item if none selected
      const selectedItems =
        selectedIds.size > 0
          ? allItems
              .flatMap((item) => getAllDescendants(item))
              .filter((item) => selectedIds.has(item.id))
          : [item];
      onAction(action, selectedItems);
    }
  };

  // Helper function to get all descendants of an item (including the item itself)
  const getAllDescendants = (item: TreeViewItemWithTags): TreeViewItemWithTags[] => {
    const descendants = [item];
    if (item.children) {
      item.children.forEach((child) => {
        descendants.push(...getAllDescendants(child));
      });
    }
    return descendants;
  };

  const handleAccessClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAccessChange) {
      const currentState = getCheckState(item, itemMap);
      // Toggle between checked and unchecked, treating indeterminate as unchecked
      const newChecked = currentState === "checked" ? false : true;
      onAccessChange(item, newChecked);
    }
  };

  const renderIcon = () => {
    if (getIcon) {
      return getIcon(item, depth);
    }

    // Use the provided iconMap or fall back to default
    return iconMap[item.type] || iconMap.folder || defaultIconMap.folder;
  };

  const getItemPath = (item: TreeViewItemWithTags, items: TreeViewItemWithTags[]): string => {
    const path: string[] = [item.name];

    const findParent = (
      currentItem: TreeViewItemWithTags,
      allItems: TreeViewItemWithTags[]
    ) => {
      for (const potentialParent of allItems) {
        if (
          potentialParent.children?.some((child) => child.id === currentItem.id)
        ) {
          path.unshift(potentialParent.name);
          findParent(potentialParent, allItems);
          break;
        }
        if (potentialParent.children) {
          findParent(currentItem, potentialParent.children);
        }
      }
    };

    findParent(item, items);
    return path.join(" → ");
  };

  // Add function to count selected items in a folder
  const getSelectedChildrenCount = (item: TreeViewItemWithTags): number => {
    let count = 0;

    if (!item.children) return 0;

    item.children.forEach((child) => {
      if (selectedIds.has(child.id)) {
        count++;
      }
      if (child.children) {
        count += getSelectedChildrenCount(child);
      }
    });

    return count;
  };

  // Get selected count only if item has children and is collapsed
  const selectedCount =
    (item.children && !isOpen && getSelectedChildrenCount(item)) || null;

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div>
          <div
            ref={itemRef}
            data-tree-item
            data-id={item.id}
            data-depth={depth}
            data-folder-closed={item.children && !isOpen}
            className={cn(
              "select-none cursor-pointer px-1",
              isSelected 
                ? `bg-orange-100 ${selectionStyle}` 
                : item.tags && item.tags.length > 0
                  ? "bg-gradient-to-r from-amber-50/50 to-transparent border-l-2 border-amber-300"
                  : "text-foreground"
            )}
            style={{ paddingLeft: `${depth * 20}px` }}
            onClick={handleClick}
          >
            <div className="flex items-center h-8">
              {item.children ? (
                <div className="flex items-center gap-2 flex-1 group min-w-0">
                  <Collapsible
                    open={isOpen}
                    onOpenChange={(open) => onToggleExpand(item.id, open)}
                  >
                    <CollapsibleTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <motion.div
                          initial={false}
                          animate={{ rotate: isOpen ? 90 : 0 }}
                          transition={{ duration: 0.1 }}
                        >
                          <ChevronRightIcon className="h-4 w-4" />
                        </motion.div>
                      </Button>
                    </CollapsibleTrigger>
                  </Collapsible>
                  {showAccessRights && (
                    <div
                      className="relative flex items-center justify-center w-4 h-4 cursor-pointer hover:opacity-80"
                      onClick={handleAccessClick}
                    >
                      {getCheckState(item, itemMap) === "checked" && (
                        <div className="w-4 h-4 border rounded bg-primary border-primary flex items-center justify-center">
                          <svg
                            className="h-3 w-3 text-primary-foreground"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                      {getCheckState(item, itemMap) === "unchecked" && (
                        <div className="w-4 h-4 border rounded border-input" />
                      )}
                      {getCheckState(item, itemMap) === "indeterminate" && (
                        <div className="w-4 h-4 border rounded bg-primary border-primary flex items-center justify-center">
                          <div className="h-0.5 w-2 bg-primary-foreground" />
                        </div>
                      )}
                    </div>
                  )}
                  {renderIcon()}
                  <span className="flex-1 block truncate">{item.name}</span>
                  {/* 显示目录标签 */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex gap-1 mr-2 shrink-0">
                      {item.tags.map((tag, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className={cn(
                            "text-xs px-2 py-0.5 border",
                            tag.type === 'downloadDir' 
                              ? "bg-green-50 border-green-200 text-green-700 hover:bg-green-50"
                              : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-50"
                          )}
                        >
                          {tag.mediaType} {tag.type === 'downloadDir' ? '下载目录' : '媒体库目录'}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {selectedCount !== null && selectedCount > 0 && (
                    <Badge
                      variant="secondary"
                      className="mr-2 bg-blue-100 hover:bg-blue-100 shrink-0"
                    >
                      {selectedCount} selected
                    </Badge>
                  )}
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 group-hover:opacity-100 opacity-0 items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">{item.name}</h4>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>
                            <span className="font-medium">Type:</span>{" "}
                            {item.type.charAt(0).toUpperCase() +
                              item.type.slice(1).replace("_", " ")}
                          </div>
                          <div>
                            <span className="font-medium">ID:</span> {item.id}
                          </div>
                          <div>
                            <span className="font-medium">Location:</span>{" "}
                            {getItemPath(item, allItems)}
                          </div>
                          <div>
                            <span className="font-medium">Items:</span>{" "}
                            {item.children?.length || 0} direct items
                          </div>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1 pl-8 group min-w-0">
                  {showAccessRights && (
                    <div
                      className="relative flex items-center justify-center w-4 h-4 cursor-pointer hover:opacity-80"
                      onClick={handleAccessClick}
                    >
                      {item.checked ? (
                        <div className="w-4 h-4 border rounded bg-primary border-primary flex items-center justify-center">
                          <svg
                            className="h-3 w-3 text-primary-foreground"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-4 h-4 border rounded border-input" />
                      )}
                    </div>
                  )}
                  {renderIcon()}
                  <span className="flex-1 block truncate">{item.name}</span>
                  <HoverCard>
                    <HoverCardTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 group-hover:opacity-100 opacity-0 items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-80">
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">{item.name}</h4>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <div>
                            <span className="font-medium">Type:</span>{" "}
                            {item.type.charAt(0).toUpperCase() +
                              item.type.slice(1).replace("_", " ")}
                          </div>
                          <div>
                            <span className="font-medium">ID:</span> {item.id}
                          </div>
                          <div>
                            <span className="font-medium">Location:</span>{" "}
                            {getItemPath(item, allItems)}
                          </div>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              )}
            </div>
          </div>

          {item.children && (
            <Collapsible
              open={isOpen}
              onOpenChange={(open) => onToggleExpand(item.id, open)}
            >
              <AnimatePresence initial={false}>
                {isOpen && (
                  <CollapsibleContent forceMount asChild>
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.05 }}
                    >
                      {item.children?.map((child) => (
                        <TreeItem
                          key={child.id}
                          item={child}
                          depth={depth + 1}
                          selectedIds={selectedIds}
                          lastSelectedId={lastSelectedId}
                          onSelect={onSelect}
                          expandedIds={expandedIds}
                          onToggleExpand={onToggleExpand}
                          getIcon={getIcon}
                          onAction={onAction}
                          onAccessChange={onAccessChange}
                          allItems={allItems}
                          showAccessRights={showAccessRights}
                          itemMap={itemMap}
                          iconMap={iconMap}
                          menuItems={menuItems}
                          getSelectedItems={getSelectedItems}
                        />
                      ))}
                    </motion.div>
                  </CollapsibleContent>
                )}
              </AnimatePresence>
            </Collapsible>
          )}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        {menuItems?.map((menuItem) => (
          <ContextMenuItem
            key={menuItem.id}
            onClick={() => {
              const items = selectedIds.has(item.id)
                ? getSelectedItems()
                : [item];
              menuItem.action(items);
            }}
          >
            {menuItem.icon && (
              <span className="mr-2 h-4 w-4">{menuItem.icon}</span>
            )}
            {menuItem.label}
          </ContextMenuItem>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}

export default function TreeView({
  className,
  checkboxLabels = {
    check: "Check",
    uncheck: "Uncheck",
  },
  data,
  iconMap,
  searchPlaceholder = "Search...",
  selectionText = "selected",
  showExpandAll = true,
  showCheckboxes = false,
  getIcon,
  onSelectionChange,
  onAction,
  onCheckChange,
  menuItems,
}: TreeViewProps) {
  const [currentMousePos, setCurrentMousePos] = useState<number>(0);
  const [dragStart, setDragStart] = useState<number | null>(null);
  const [dragStartPosition, setDragStartPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");

  const dragRef = useRef<HTMLDivElement>(null);
  const lastSelectedId = useRef<string | null>(null);
  const treeRef = useRef<HTMLDivElement>(null);

  const DRAG_THRESHOLD = 10; // pixels

  // Create a map of all items by ID
  const itemMap = useMemo(() => buildItemMap(data), [data]);

  // Memoize the search results and expanded IDs
  const { filteredData, searchExpandedIds } = useMemo(() => {
    if (!searchQuery.trim()) {
      return { filteredData: data, searchExpandedIds: new Set<string>() };
    }

    const searchLower = searchQuery.toLowerCase();
    const newExpandedIds = new Set<string>();

    // Helper function to check if an item or its descendants match the search
    const itemMatches = (item: TreeViewItem): boolean => {
      const nameMatches = item.name.toLowerCase().includes(searchLower);
      if (nameMatches) return true;

      if (item.children) {
        return item.children.some((child) => itemMatches(child));
      }

      return false;
    };

    // Helper function to filter tree while keeping parent structure
    const filterTree = (items: TreeViewItemWithTags[]): TreeViewItemWithTags[] => {
      return items
        .map((item) => {
          if (!item.children) {
            return itemMatches(item) ? item : null;
          }

          const filteredChildren = filterTree(item.children);
          if (filteredChildren.length > 0 || itemMatches(item)) {
            if (item.children) {
              newExpandedIds.add(item.id);
            }
            return {
              ...item,
              children: filteredChildren,
            };
          }
          return null;
        })
        .filter((item): item is TreeViewItemWithTags => item !== null);
    };

    return {
      filteredData: filterTree(data),
      searchExpandedIds: newExpandedIds,
    };
  }, [data, searchQuery]);

  // Update expanded IDs when search changes
  useEffect(() => {
    if (searchQuery.trim()) {
      setExpandedIds(prev => new Set([...prev, ...searchExpandedIds]));
    }
  }, [searchExpandedIds, searchQuery]);

  useEffect(() => {
    const handleClickAway = (e: MouseEvent) => {
      const target = e.target as Element;

      const clickedInside =
        (treeRef.current && treeRef.current.contains(target)) ||
        (dragRef.current && dragRef.current.contains(target)) ||
        // Ignore clicks on context menus
        target.closest('[role="menu"]') ||
        target.closest("[data-radix-popper-content-wrapper]");

      if (!clickedInside) {
        setSelectedIds(new Set());
        lastSelectedId.current = null;
      }
    };

    document.addEventListener("mousedown", handleClickAway);
    return () => document.removeEventListener("mousedown", handleClickAway);
  }, []);

  // Function to collect all folder IDs
  const getAllFolderIds = (items: TreeViewItemWithTags[]): string[] => {
    let ids: string[] = [];
    items.forEach((item) => {
      if (item.children) {
        ids.push(item.id);
        ids = [...ids, ...getAllFolderIds(item.children)];
      }
    });
    return ids;
  };

  const handleExpandAll = () => {
    setExpandedIds(new Set(getAllFolderIds(data)));
  };

  const handleCollapseAll = () => {
    setExpandedIds(new Set());
  };

  const handleToggleExpand = (id: string, isOpen: boolean) => {
    const newExpandedIds = new Set(expandedIds);
    if (isOpen) {
      newExpandedIds.add(id);
    } else {
      newExpandedIds.delete(id);
    }
    setExpandedIds(newExpandedIds);
  };

  // Get selected items
  const getSelectedItems = useCallback((): TreeViewItemWithTags[] => {
    const items: TreeViewItemWithTags[] = [];
    const processItem = (item: TreeViewItemWithTags) => {
      if (selectedIds.has(item.id)) {
        items.push(item);
      }
      item.children?.forEach(processItem);
    };
    data.forEach(processItem);
    return items;
  }, [selectedIds, data]);

  // Get selected items, filtering out parents if their children are selected
  const getEffectiveSelectedItems = useCallback((): TreeViewItemWithTags[] => {
    const selectedItems = getSelectedItems();

    // Build a set of all selected IDs for quick lookup
    const selectedIdsSet = new Set(selectedItems.map((item) => item.id));

    // Filter out parents whose children are also selected
    return selectedItems.filter((item) => {
      // If this item has no children, always include it
      if (!item.children) return true;

      // Check if any children of this item are selected
      const hasSelectedChildren = item.children.some((child) =>
        selectedIdsSet.has(child.id)
      );

      // Only include this item if none of its children are selected
      return !hasSelectedChildren;
    });
  }, [getSelectedItems]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only track on left click and not on buttons
    if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return;

    setDragStartPosition({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      // Check if primary button is still held down
      if (!(e.buttons & 1)) {
        setIsDragging(false);
        setDragStart(null);
        setDragStartPosition(null);
        return;
      }

      // If we haven't registered a potential drag start position, ignore
      if (!dragStartPosition) return;

      // Calculate distance moved
      const deltaX = e.clientX - dragStartPosition.x;
      const deltaY = e.clientY - dragStartPosition.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // If we haven't started dragging yet, check if we should start
      if (!isDragging) {
        if (distance > DRAG_THRESHOLD) {
          setIsDragging(true);
          setDragStart(dragStartPosition.y);

          // Clear selection if not holding shift/ctrl
          if (!e.shiftKey && !e.ctrlKey) {
            setSelectedIds(new Set());
            lastSelectedId.current = null;
          }
        }
        return;
      }

      // Rest of the existing drag logic
      if (!dragRef.current) return;

      const items = Array.from(
        dragRef.current.querySelectorAll("[data-tree-item]")
      ) as HTMLElement[];

      const startY = dragStart;
      const currentY = e.clientY;
      const [selectionStart, selectionEnd] = [
        Math.min(startY || 0, currentY),
        Math.max(startY || 0, currentY),
      ];

      const newSelection = new Set(
        e.shiftKey || e.ctrlKey ? Array.from(selectedIds) : []
      );

      items.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const itemTop = rect.top;
        const itemBottom = rect.top + rect.height;

        if (itemBottom >= selectionStart && itemTop <= selectionEnd) {
          const id = item.getAttribute("data-id");
          const isClosedFolder =
            item.getAttribute("data-folder-closed") === "true";
          const parentFolderClosed = item.closest(
            '[data-folder-closed="true"]'
          );

          if (id && (isClosedFolder || !parentFolderClosed)) {
            newSelection.add(id);
          }
        }
      });

      setSelectedIds(newSelection);
      setCurrentMousePos(e.clientY);
    },
    [isDragging, dragStart, selectedIds, dragStartPosition]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDragStart(null);
    setDragStartPosition(null);
  }, []);

  // Add cleanup for mouse events
  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("mouseleave", handleMouseUp);
    }
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mouseleave", handleMouseUp);
    };
  }, [isDragging, handleMouseUp]);

  // Call onSelectionChange when selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(getSelectedItems());
    }
  }, [selectedIds, onSelectionChange, getSelectedItems]);

  return (
    <div className="flex gap-4 ">
      <div
        ref={treeRef}
        className="bg-background p-4 rounded-xl border w-full h-full flex flex-col relative shadow-lg"
      >
        <AnimatePresence mode="wait">
          {selectedIds.size > 0 ? (
            <motion.div
              key="selection"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="h-10 flex items-center justify-between bg-background rounded-lg border px-4"
            >
              <div
                className="font-medium cursor-pointer flex items-center"
                title="Clear selection"
                onClick={() => {
                  setSelectedIds(new Set());
                  lastSelectedId.current = null;
                }}
              >
                <Cross2Icon className="h-4 w-4 mr-2" />
                {selectedIds.size} {selectionText}
              </div>

              {showCheckboxes && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const effectiveItems = getEffectiveSelectedItems();
                      const processItem = (item: TreeViewItem) => {
                        onCheckChange?.(item, true);
                        item.children?.forEach(processItem);
                      };
                      effectiveItems.forEach(processItem);
                    }}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    {checkboxLabels.check}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const effectiveItems = getEffectiveSelectedItems();
                      const processItem = (item: TreeViewItem) => {
                        onCheckChange?.(item, false);
                        item.children?.forEach(processItem);
                      };
                      effectiveItems.forEach(processItem);
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {checkboxLabels.uncheck}
                  </Button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="h-10 flex items-center gap-2"
            >
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-9"
                />
              </div>
              {showExpandAll && (
                <div className="flex gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 px-2"
                    onClick={handleExpandAll}
                  >
                    <ChevronDownIcon className="h-4 w-4 mr-1" />
                    展开全部
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-10 px-2"
                    onClick={handleCollapseAll}
                  >
                    <ChevronRightIcon className="h-4 w-4 mr-1" />
                    收起全部
                  </Button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <ScrollArea className="flex-1 rounded-lg bg-card relative">
        <div
          ref={dragRef}
          className={cn(
            "select-none p-2",
            className
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        >
          {isDragging && (
            <div
              className="absolute inset-0 bg-blue-500/0 pointer-events-none"
              style={{
                top: Math.min(
                  dragStart || 0,
                  dragStart === null ? 0 : currentMousePos
                ),
                height: Math.abs(
                  (dragStart || 0) - (dragStart === null ? 0 : currentMousePos)
                ),
              }}
            />
          )}
          {filteredData.map((item) => (
            <TreeItem
              key={item.id}
              item={item}
              selectedIds={selectedIds}
              lastSelectedId={lastSelectedId}
              onSelect={setSelectedIds}
              expandedIds={expandedIds}
              onToggleExpand={handleToggleExpand}
              getIcon={getIcon}
              onAction={onAction}
              onAccessChange={onCheckChange}
              allItems={data}
              showAccessRights={showCheckboxes}
              itemMap={itemMap}
              iconMap={iconMap}
              menuItems={menuItems}
              getSelectedItems={getSelectedItems}
            />
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
