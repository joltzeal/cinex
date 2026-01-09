'use client';

/**
 * Client-side hook for filtering navigation items based on user access
 *
 * This hook uses better-auth's client-side hooks to check user authentication
 * without any server calls. This is perfect for navigation visibility (UX only).
 *
 * Performance:
 * - All checks are synchronous (no server calls)
 * - Instant filtering
 * - No loading states
 * - No UI flashing
 *
 * Note: For actual security (API routes, server actions), always use server-side checks.
 * This is only for UI visibility.
 */

import { useMemo } from 'react';
import { authClient } from '@/lib/auth-client';
import type { NavItem } from '@/types';

/**
 * Hook to filter navigation items based on user authentication
 *
 * @param items - Array of navigation items to filter
 * @returns Filtered items
 */
export function useFilteredNavItems(items: NavItem[]) {
  const { data: session } = authClient.useSession();
  const user = session?.user;

  // Memoize access context
  const accessContext = useMemo(() => {
    return {
      user: user ?? undefined,
      isAuthenticated: !!user
    };
  }, [user?.id]);

  // Filter items synchronously (all client-side)
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        // No access restrictions - show to everyone
        if (!item.access) {
          return true;
        }

        // If item requires organization, skip it (we don't use organizations)
        if (item.access.requireOrg) {
          return false;
        }

        // For other access restrictions (permission, role, plan, feature),
        // you can implement custom logic here based on your user model
        // For now, we'll show all items that don't require organization

        if (
          item.access.plan ||
          item.access.feature ||
          item.access.permission ||
          item.access.role
        ) {
          // You can implement custom checks here if needed
          // For example, check user.role, user.plan, etc.
          console.warn(
            `Custom access checks for navigation items may be needed. ` +
              `Item "${item.title}" is shown, but you may want to implement additional checks.`
          );
        }

        return true;
      })
      .map((item) => {
        // Recursively filter child items
        if (item.items && item.items.length > 0) {
          const filteredChildren = item.items.filter((childItem) => {
            // No access restrictions
            if (!childItem.access) {
              return true;
            }

            // Skip items requiring organization
            if (childItem.access.requireOrg) {
              return false;
            }

            // Custom access checks
            if (
              childItem.access.plan ||
              childItem.access.feature ||
              childItem.access.permission ||
              childItem.access.role
            ) {
              console.warn(
                `Custom access checks for navigation items may be needed. ` +
                  `Item "${childItem.title}" is shown, but you may want to implement additional checks.`
              );
            }

            return true;
          });

          return {
            ...item,
            items: filteredChildren
          };
        }

        return item;
      });
  }, [items, accessContext]);

  return filteredItems;
}
