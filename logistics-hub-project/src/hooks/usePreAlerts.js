/**
 * Pre-Alert Hooks
 * Phase 3 Week 3: State Management
 * 
 * Hooks:
 *   - usePreAlert(preAlertId) - Single pre-alert + checklist
 *   - usePreAlertsList() - List + filtering + pagination
 */

import { useState, useCallback, useEffect } from 'react'
import preAlertApi from '../api/preAlerts'

// =====================================================================
// usePreAlert - Single Pre-Alert Management
// =====================================================================

export function usePreAlert(preAlertId) {
  const [preAlert, setPreAlert] = useState(null)
  const [checklistItems, setChecklistItems] = useState([])
  const [completionStats, setCompletionStats] = useState({
    completed: 0,
    total: 0,
    percentage: 0,
  })
  const [criticalStatus, setCriticalStatus] = useState({
    critical: 0,
    critical_done: 0,
    can_ready: false,
  })
  const [auditTrail, setAuditTrail] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load pre-alert data
  useEffect(() => {
    if (!preAlertId) return

    const loadPreAlert = async () => {
      setIsLoading(true)
      setError(null)

      const { data, error: err } = await preAlertApi.getById(preAlertId)
      if (err) {
        setError(err)
        setIsLoading(false)
        return
      }

      setPreAlert(data)
      setChecklistItems(data.checklist_items || [])
      setAuditTrail(data.audit_trail || [])

      // Get stats
      const stats = await preAlertApi.getCompletionStats(preAlertId)
      setCompletionStats(stats)

      const critical = await preAlertApi.getCriticalItemsStatus(preAlertId)
      setCriticalStatus(critical)

      setIsLoading(false)
    }

    loadPreAlert()
  }, [preAlertId])

  // Checklist management
  const completeChecklistItem = useCallback(
    async (itemId, notes = '') => {
      const { data, error: err } = await preAlertApi.completeChecklistItem(
        itemId,
        notes
      )
      if (!err) {
        setChecklistItems((prev) =>
          prev.map((item) =>
            item.id === itemId
              ? {
                  ...item,
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                  notes,
                }
              : item
          )
        )
        // Refresh stats
        const stats = await preAlertApi.getCompletionStats(preAlertId)
        setCompletionStats(stats)
      }
      return { data, error: err }
    },
    [preAlertId]
  )

  const startChecklistItem = useCallback(async (itemId) => {
    const { data, error: err } = await preAlertApi.startChecklistItem(itemId)
    if (!err) {
      setChecklistItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, status: 'in_progress' } : item
        )
      )
    }
    return { data, error: err }
  }, [])

  const markNotApplicable = useCallback(async (itemId, reason) => {
    const { data, error: err } = await preAlertApi.markNotApplicable(
      itemId,
      reason
    )
    if (!err) {
      setChecklistItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, status: 'not_applicable', notes: reason }
            : item
        )
      )
    }
    return { data, error: err }
  }, [])

  const addChecklistItem = useCallback(
    async (description, category = 'other') => {
      const { data, error: err } = await preAlertApi.addChecklistItem(
        preAlertId,
        description,
        category
      )
      if (!err) {
        setChecklistItems((prev) => [...prev, data])
      }
      return { data, error: err }
    },
    [preAlertId]
  )

  const deleteChecklistItem = useCallback(async (itemId) => {
    const { error: err } = await preAlertApi.deleteChecklistItem(itemId)
    if (!err) {
      setChecklistItems((prev) => prev.filter((item) => item.id !== itemId))
      // Refresh stats
      const stats = await preAlertApi.getCompletionStats(preAlertId)
      setCompletionStats(stats)
    }
    return { error: err }
  }, [preAlertId])

  // Pre-alert status management
  const markReady = useCallback(async () => {
    const { data, error: err } = await preAlertApi.markReady(preAlertId)
    if (!err) {
      setPreAlert((prev) => ({ ...prev, status: 'ready' }))
    }
    return { data, error: err }
  }, [preAlertId])

  const markInProgress = useCallback(async () => {
    const { data, error: err } = await preAlertApi.markInProgress(preAlertId)
    if (!err) {
      setPreAlert((prev) => ({ ...prev, status: 'in_progress' }))
    }
    return { data, error: err }
  }, [preAlertId])

  const markCompleted = useCallback(async () => {
    const { data, error: err } = await preAlertApi.markCompleted(preAlertId)
    if (!err) {
      setPreAlert((prev) => ({
        ...prev,
        status: 'completed',
        completed_at: new Date().toISOString(),
      }))
    }
    return { data, error: err }
  }, [preAlertId])

  const cancel = useCallback(async (reason) => {
    const { data, error: err } = await preAlertApi.cancel(preAlertId, reason)
    if (!err) {
      setPreAlert((prev) => ({ ...prev, status: 'cancelled' }))
    }
    return { data, error: err }
  }, [preAlertId])

  return {
    preAlert,
    checklistItems,
    completionStats,
    criticalStatus,
    auditTrail,
    isLoading,
    error,
    completeChecklistItem,
    startChecklistItem,
    markNotApplicable,
    addChecklistItem,
    deleteChecklistItem,
    markReady,
    markInProgress,
    markCompleted,
    cancel,
  }
}

// =====================================================================
// usePreAlertsList - List Management
// =====================================================================

export function usePreAlertsList() {
  const [preAlerts, setPreAlerts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [filters, setFilters] = useState({ status: null, serviceType: null })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load pre-alerts
  const fetchPreAlerts = useCallback(async (pageNum = 1) => {
    setIsLoading(true)
    setError(null)

    const offset = (pageNum - 1) * limit
    const { data, count, error: err } = await preAlertApi.list({
      status: filters.status,
      serviceType: filters.serviceType,
      limit,
      offset,
    })

    if (err) {
      setError(err)
      setIsLoading(false)
      return
    }

    setPreAlerts(data || [])
    setTotal(count || 0)
    setPage(pageNum)
    setIsLoading(false)
  }, [filters, limit])

  // Initial load
  useEffect(() => {
    fetchPreAlerts(1)
  }, [fetchPreAlerts])

  // Filtering
  const applyFilter = useCallback(
    (key, value) => {
      setFilters((prev) => ({ ...prev, [key]: value }))
      fetchPreAlerts(1)
    },
    [fetchPreAlerts]
  )

  const clearFilters = useCallback(() => {
    setFilters({ status: null, serviceType: null })
    fetchPreAlerts(1)
  }, [fetchPreAlerts])

  // Pagination
  const goToPage = useCallback(
    (pageNum) => {
      if (pageNum >= 1 && pageNum <= Math.ceil(total / limit)) {
        fetchPreAlerts(pageNum)
      }
    },
    [fetchPreAlerts, total, limit]
  )

  const nextPage = useCallback(() => {
    goToPage(page + 1)
  }, [page, goToPage])

  const prevPage = useCallback(() => {
    goToPage(page - 1)
  }, [page, goToPage])

  // Create pre-alert
  const createPreAlert = useCallback(async (quoteId, customerId, data) => {
    const { data: preAlert, error: err } = await preAlertApi.create(
      quoteId,
      customerId,
      data
    )
    if (!err) {
      // Refresh list
      fetchPreAlerts(1)
    }
    return { data: preAlert, error: err }
  }, [fetchPreAlerts])

  // Refetch
  const refetch = useCallback(() => {
    fetchPreAlerts(page)
  }, [page, fetchPreAlerts])

  return {
    preAlerts,
    isLoading,
    error,
    total,
    page,
    limit,
    filters,
    applyFilter,
    clearFilters,
    goToPage,
    nextPage,
    prevPage,
    createPreAlert,
    refetch,
  }
}
