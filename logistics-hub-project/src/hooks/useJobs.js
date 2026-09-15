/**
 * Job Hooks
 * Phase 3 Week 4: Job State Management
 * 
 * Hooks:
 *   - useJob(jobId) - Single job + all tasks
 *   - useJobsList() - List + filtering + pagination
 *   - useJobTasks(jobId) - Task list management
 */

import { useState, useCallback, useEffect } from 'react'
import jobApi from '../api/jobs'

// =====================================================================
// useJob - Single Job Management
// =====================================================================

export function useJob(jobId) {
  const [job, setJob] = useState(null)
  const [tasks, setTasks] = useState([])
  const [taskStatusSummary, setTaskStatusSummary] = useState({})
  const [auditTrail, setAuditTrail] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load job data
  useEffect(() => {
    if (!jobId) return

    const loadJob = async () => {
      setIsLoading(true)
      setError(null)

      const { data, error: err } = await jobApi.getById(jobId)
      if (err) {
        setError(err)
        setIsLoading(false)
        return
      }

      setJob(data)
      setTasks(data.tasks || [])
      setAuditTrail(data.audit_trail || [])

      // Get task status summary
      const summary = await jobApi.getTaskStatusSummary(jobId)
      setTaskStatusSummary(summary.summary || {})

      setIsLoading(false)
    }

    loadJob()
  }, [jobId])

  // Task management
  const assignTask = useCallback(async (taskId, userId) => {
    const { data, error: err } = await jobApi.assignTask(taskId, userId)
    if (!err) {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, assigned_to_user_id: userId, status: 'assigned' }
            : task
        )
      )
    }
    return { data, error: err }
  }, [])

  const startTask = useCallback(async (taskId) => {
    const { data, error: err } = await jobApi.startTask(taskId)
    if (!err) {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId
            ? { ...task, status: 'in_progress', started_at: new Date().toISOString() }
            : task
        )
      )
    }
    return { data, error: err }
  }, [])

  const completeTask = useCallback(
    async (taskId, notes = '') => {
      const { data, error: err } = await jobApi.completeTask(taskId, notes)
      if (!err) {
        setTasks((prev) =>
          prev.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  status: 'completed',
                  completed_at: new Date().toISOString(),
                  completion_notes: notes,
                }
              : task
          )
        )
        // Refresh summary
        const summary = await jobApi.getTaskStatusSummary(jobId)
        setTaskStatusSummary(summary.summary || {})
      }
      return { data, error: err }
    },
    [jobId]
  )

  const blockTask = useCallback(async (taskId, reason) => {
    const { data, error: err } = await jobApi.blockTask(taskId, reason)
    if (!err) {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, status: 'blocked', notes: reason } : task
        )
      )
    }
    return { data, error: err }
  }, [])

  const unblockTask = useCallback(async (taskId) => {
    const { data, error: err } = await jobApi.unblockTask(taskId)
    if (!err) {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, status: 'in_progress' } : task
        )
      )
    }
    return { data, error: err }
  }, [])

  const updateTaskNotes = useCallback(async (taskId, notes) => {
    const { data, error: err } = await jobApi.updateTaskNotes(taskId, notes)
    if (!err) {
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, notes } : task))
      )
    }
    return { data, error: err }
  }, [])

  // Job status management
  const markReady = useCallback(async () => {
    const { data, error: err } = await jobApi.markReady(jobId)
    if (!err) {
      setJob((prev) => ({ ...prev, status: 'ready' }))
    }
    return { data, error: err }
  }, [jobId])

  const markInProgress = useCallback(async () => {
    const { data, error: err } = await jobApi.markInProgress(jobId)
    if (!err) {
      setJob((prev) => ({ ...prev, status: 'in_progress' }))
    }
    return { data, error: err }
  }, [jobId])

  const putOnHold = useCallback(async (reason) => {
    const { data, error: err } = await jobApi.putOnHold(jobId, reason)
    if (!err) {
      setJob((prev) => ({ ...prev, status: 'on_hold' }))
    }
    return { data, error: err }
  }, [jobId])

  const markCompleted = useCallback(async () => {
    const { data, error: err } = await jobApi.markCompleted(jobId)
    if (!err) {
      setJob((prev) => ({
        ...prev,
        status: 'completed',
        completed_at: new Date().toISOString(),
      }))
    }
    return { data, error: err }
  }, [jobId])

  return {
    job,
    tasks,
    taskStatusSummary,
    auditTrail,
    isLoading,
    error,
    assignTask,
    startTask,
    completeTask,
    blockTask,
    unblockTask,
    updateTaskNotes,
    markReady,
    markInProgress,
    putOnHold,
    markCompleted,
  }
}

// =====================================================================
// useJobsList - Job List Management
// =====================================================================

export function useJobsList() {
  const [jobs, setJobs] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [filters, setFilters] = useState({ status: null, serviceType: null })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load jobs
  const fetchJobs = useCallback(async (pageNum = 1) => {
    setIsLoading(true)
    setError(null)

    const offset = (pageNum - 1) * limit
    const { data, count, error: err } = await jobApi.list({
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

    setJobs(data || [])
    setTotal(count || 0)
    setPage(pageNum)
    setIsLoading(false)
  }, [filters, limit])

  // Initial load
  useEffect(() => {
    fetchJobs(1)
  }, [fetchJobs])

  // Filtering
  const applyFilter = useCallback(
    (key, value) => {
      setFilters((prev) => ({ ...prev, [key]: value }))
      fetchJobs(1)
    },
    [fetchJobs]
  )

  const clearFilters = useCallback(() => {
    setFilters({ status: null, serviceType: null })
    fetchJobs(1)
  }, [fetchJobs])

  // Pagination
  const goToPage = useCallback(
    (pageNum) => {
      if (pageNum >= 1 && pageNum <= Math.ceil(total / limit)) {
        fetchJobs(pageNum)
      }
    },
    [fetchJobs, total, limit]
  )

  const nextPage = useCallback(() => {
    goToPage(page + 1)
  }, [page, goToPage])

  const prevPage = useCallback(() => {
    goToPage(page - 1)
  }, [page, goToPage])

  // Create job
  const createJob = useCallback(
    async (preAlertId, quoteId, customerId, data) => {
      const { data: job, error: err } = await jobApi.create(
        preAlertId,
        quoteId,
        customerId,
        data
      )
      if (!err) {
        // Refresh list
        fetchJobs(1)
      }
      return { data: job, error: err }
    },
    [fetchJobs]
  )

  // Refetch
  const refetch = useCallback(() => {
    fetchJobs(page)
  }, [page, fetchJobs])

  return {
    jobs,
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
    createJob,
    refetch,
  }
}

// =====================================================================
// useJobTasks - Individual Task Management
// =====================================================================

export function useJobTasks(jobId) {
  const [tasks, setTasks] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load tasks
  useEffect(() => {
    if (!jobId) return

    const loadTasks = async () => {
      setIsLoading(true)
      setError(null)

      const { data, error: err } = await jobApi.getJobTasks(jobId)
      if (err) {
        setError(err)
        setIsLoading(false)
        return
      }

      setTasks(data || [])
      setIsLoading(false)
    }

    loadTasks()
  }, [jobId])

  return {
    tasks,
    isLoading,
    error,
  }
}
