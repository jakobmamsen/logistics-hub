/**
 * useQuotes Hook
 * Phase 3 Week 2: Quote Management State
 * 
 * Provides:
 *   - Quote list with filtering + pagination
 *   - Quote detail with all versions + line items
 *   - Quote creation + editing
 *   - Line item management
 *   - Pricing calculations
 *   - Approval workflow
 * 
 * Usage:
 *   const { quotes, currentQuote, createQuote, addLine, submit } = useQuotes()
 */

import { useState, useCallback, useEffect } from 'react'
import quoteApi from '../api/quotes'

/**
 * Single quote management hook
 */
export const useQuote = (quoteId) => {
  const [quote, setQuote] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Fetch quote on mount
  useEffect(() => {
    if (!quoteId) {
      setIsLoading(false)
      return
    }

    const fetchQuote = async () => {
      setIsLoading(true)
      setError(null)

      const { data, error: err } = await quoteApi.getById(quoteId)

      if (err) {
        setError(err)
        setIsLoading(false)
        return
      }

      setQuote(data)
      setIsLoading(false)
    }

    fetchQuote()
  }, [quoteId])

  // Add line item
  const addLine = useCallback(
    async (lineData) => {
      if (!quote || !quote.quote_versions || quote.quote_versions.length === 0) {
        return { error: 'No quote version available' }
      }

      const latestVersion = quote.quote_versions[0]
      const { data, error: err } = await quoteApi.addLine(latestVersion.id, lineData)

      if (err) {
        setError(err)
        return { error: err }
      }

      // Update local state
      setQuote((prev) => ({
        ...prev,
        quote_versions: [
          {
            ...prev.quote_versions[0],
            quote_lines: [...(prev.quote_versions[0].quote_lines || []), data],
          },
          ...prev.quote_versions.slice(1),
        ],
      }))

      return { data }
    },
    [quote]
  )

  // Update line item
  const updateLine = useCallback(
    async (lineId, lineData) => {
      const { data, error: err } = await quoteApi.updateLine(lineId, lineData)

      if (err) {
        setError(err)
        return { error: err }
      }

      // Update local state
      setQuote((prev) => ({
        ...prev,
        quote_versions: [
          {
            ...prev.quote_versions[0],
            quote_lines: prev.quote_versions[0].quote_lines.map((line) =>
              line.id === lineId ? data : line
            ),
          },
          ...prev.quote_versions.slice(1),
        ],
      }))

      return { data }
    },
    []
  )

  // Delete line item
  const deleteLine = useCallback(
    async (lineId) => {
      const { error: err } = await quoteApi.deleteLine(lineId)

      if (err) {
        setError(err)
        return { error: err }
      }

      // Update local state
      setQuote((prev) => ({
        ...prev,
        quote_versions: [
          {
            ...prev.quote_versions[0],
            quote_lines: prev.quote_versions[0].quote_lines.filter((line) => line.id !== lineId),
          },
          ...prev.quote_versions.slice(1),
        ],
      }))

      return { data: true }
    },
    []
  )

  // Calculate totals
  const calculateTotals = useCallback(async () => {
    if (!quote || !quote.quote_versions || quote.quote_versions.length === 0) {
      return { error: 'No quote version available' }
    }

    const latestVersion = quote.quote_versions[0]
    const { data, error: err } = await quoteApi.calculateTotals(latestVersion.id)

    if (err) {
      setError(err)
      return { error: err }
    }

    return { data }
  }, [quote])

  // Submit for approval
  const submitQuote = useCallback(
    async (pricingData) => {
      if (!quote) {
        return { error: 'No quote loaded' }
      }

      const { data, error: err, message, autoApproved } = await quoteApi.submit(
        quote.id,
        pricingData
      )

      if (err) {
        setError(err)
        return { error: err }
      }

      // Refresh quote
      const { data: refreshed } = await quoteApi.getById(quote.id)
      setQuote(refreshed)

      return { data, message, autoApproved }
    },
    [quote]
  )

  // Approve quote (manager only)
  const approveQuote = useCallback(
    async (versionId, reason) => {
      const { data, error: err } = await quoteApi.approve(versionId, reason)

      if (err) {
        setError(err)
        return { error: err }
      }

      // Refresh quote
      const { data: refreshed } = await quoteApi.getById(quote.id)
      setQuote(refreshed)

      return { data }
    },
    [quote]
  )

  // Reject quote
  const rejectQuote = useCallback(
    async (versionId, reason) => {
      const { data, error: err } = await quoteApi.reject(versionId, reason)

      if (err) {
        setError(err)
        return { error: err }
      }

      // Refresh quote
      const { data: refreshed } = await quoteApi.getById(quote.id)
      setQuote(refreshed)

      return { data }
    },
    [quote]
  )

  // Send to customer
  const sendQuote = useCallback(
    async () => {
      if (!quote) {
        return { error: 'No quote loaded' }
      }

      const { data, error: err } = await quoteApi.send(quote.id)

      if (err) {
        setError(err)
        return { error: err }
      }

      setQuote(data)
      return { data }
    },
    [quote]
  )

  // Mark as won
  const markWon = useCallback(
    async () => {
      if (!quote) {
        return { error: 'No quote loaded' }
      }

      const { data, error: err } = await quoteApi.markWon(quote.id)

      if (err) {
        setError(err)
        return { error: err }
      }

      setQuote(data)
      return { data }
    },
    [quote]
  )

  // Mark as lost
  const markLost = useCallback(
    async (reason) => {
      if (!quote) {
        return { error: 'No quote loaded' }
      }

      const { data, error: err } = await quoteApi.markLost(quote.id, reason)

      if (err) {
        setError(err)
        return { error: err }
      }

      setQuote(data)
      return { data }
    },
    [quote]
  )

  return {
    quote,
    isLoading,
    error,
    addLine,
    updateLine,
    deleteLine,
    calculateTotals,
    submitQuote,
    approveQuote,
    rejectQuote,
    sendQuote,
    markWon,
    markLost,
  }
}

/**
 * Quotes list management hook
 */
export const useQuotesList = () => {
  const [quotes, setQuotes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({})
  const [pagination, setPagination] = useState({ page: 1, limit: 25 })
  const [total, setTotal] = useState(0)

  // Fetch quotes
  const fetchQuotes = useCallback(
    async (newFilters = {}, newPage = 1) => {
      setIsLoading(true)
      setError(null)

      const { data, error: err, count } = await quoteApi.list({
        ...filters,
        ...newFilters,
        page: newPage,
        limit: pagination.limit,
      })

      if (err) {
        setError(err)
        setIsLoading(false)
        return
      }

      setQuotes(data || [])
      setTotal(count || 0)
      setFilters({ ...filters, ...newFilters })
      setPagination({ page: newPage, limit: pagination.limit })
      setIsLoading(false)
    },
    [filters, pagination.limit]
  )

  // Initial fetch
  useEffect(() => {
    fetchQuotes()
  }, [])

  // Apply filter
  const applyFilter = useCallback(
    (filterKey, filterValue) => {
      const newFilters = { ...filters, [filterKey]: filterValue }
      if (!filterValue) {
        delete newFilters[filterKey]
      }
      fetchQuotes(newFilters, 1)
    },
    [filters, fetchQuotes]
  )

  // Change page
  const goToPage = useCallback(
    (page) => {
      fetchQuotes({}, page)
    },
    [fetchQuotes]
  )

  // Create new quote
  const createQuote = useCallback(
    async (customerId, quoteData) => {
      const { data, error: err } = await quoteApi.create(customerId, quoteData)

      if (err) {
        setError(err)
        return { error: err }
      }

      // Refresh list
      await fetchQuotes()

      return { data }
    },
    [fetchQuotes]
  )

  return {
    quotes,
    isLoading,
    error,
    total,
    page: pagination.page,
    limit: pagination.limit,
    filters,
    applyFilter,
    goToPage,
    createQuote,
    refetch: fetchQuotes,
  }
}

export default useQuote
