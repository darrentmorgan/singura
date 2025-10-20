/**
 * Hook for fetching connection statistics
 */

import { useState, useEffect } from 'react';
import { ConnectionStats } from '@singura/shared-types';

interface UseConnectionStatsOptions {
  connectionId: string;
  enabled?: boolean;
}

export function useConnectionStats({ connectionId, enabled = true }: UseConnectionStatsOptions) {
  const [stats, setStats] = useState<ConnectionStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !connectionId) {
      return;
    }

    const fetchStats = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/connections/${connectionId}/stats`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch connection stats');
        }

        const data = await response.json();
        setStats(data.stats);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching connection stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [connectionId, enabled]);

  return { stats, isLoading, error };
}

/**
 * Hook for fetching stats for multiple connections
 */
export function useMultipleConnectionStats(connectionIds: string[]) {
  const [statsMap, setStatsMap] = useState<Map<string, ConnectionStats>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (connectionIds.length === 0) {
      return;
    }

    const fetchAllStats = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const promises = connectionIds.map(async (id) => {
          const response = await fetch(`/api/connections/${id}/stats`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
              'Content-Type': 'application/json',
            },
          });

          if (response.ok) {
            const data = await response.json();
            return { id, stats: data.stats as ConnectionStats };
          }

          return { id, stats: null };
        });

        const results = await Promise.all(promises);
        const newMap = new Map<string, ConnectionStats>();

        results.forEach(({ id, stats }) => {
          if (stats) {
            newMap.set(id, stats);
          }
        });

        setStatsMap(newMap);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error('Error fetching connection stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(connectionIds)]); // Use stringified array as dependency

  return { statsMap, isLoading, error };
}