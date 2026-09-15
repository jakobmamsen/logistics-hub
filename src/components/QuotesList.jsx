/**
 * Quotes List Page
 * Phase 3 Week 2: Quote Management
 * 
 * Features:
 *   - List all quotes (paginated, real-time from Supabase)
 *   - Filter by status, service type, customer
 *   - Create new quote
 *   - Navigate to quote detail/builder
 *   - Quick status badge + margin indicator
 *   - Pagination
 */

import React, { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Button,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  Badge,
  StatusBadge,
  Input,
  Select,
  FormGroup,
  useModalState,
  Modal,
  Alert,
} from './index.jsx'
import { Plus, ChevronRight, FilterX, Loader, AlertCircle } from 'lucide-react'
import { useQuotesList } from '../hooks/useQuotes'
import { useAuth } from '../hooks/useAuth'

export const QuotesList = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    quotes,
    isLoading,
    error,
    total,
    page,
    limit,
    applyFilter,
    goToPage,
    createQuote,
    refetch,
  } = useQuotesList()

  const [filterStatus, setFilterStatus] = useState('')
  const [filterService, setFilterService] = useState('')
  const [hasFilters, setHasFilters] = useState(false)

  const createQuoteModal = useModalState()
  const [newQuoteData, setNewQuoteData] = useState({
    customerId: '',
    service_type: 'ocean_fcl',
    origin_port: '',
    destination_port: '',
    valid_until: '',
  })
  const [createError, setCreateError] = useState(null)
  const [isCreating, setIsCreating] = useState(false)

  const handleApplyFilter = async () => {
    if (filterStatus) applyFilter('status', filterStatus)
    if (filterService) applyFilter('serviceType', filterService)
    setHasFilters(filterStatus !== '' || filterService !== '')
  }

  const handleResetFilters = async () => {
    setFilterStatus('')
    setFilterService('')
    setHasFilters(false)
    applyFilter('status', null)
    applyFilter('serviceType', null)
    await refetch()
  }

  const handleCreateQuote = async () => {
    if (!newQuoteData.customerId) {
      setCreateError('Please select a customer')
      return
    }
    if (!newQuoteData.origin_port || !newQuoteData.destination_port) {
      setCreateError('Please enter origin and destination ports')
      return
    }
    if (!newQuoteData.valid_until) {
      setCreateError('Please set quote validity date')
      return
    }

    setIsCreating(true)
    setCreateError(null)

    const { data, error: err } = await createQuote(
      newQuoteData.customerId,
      newQuoteData
    )

    if (err) {
      setCreateError(err)
      setIsCreating(false)
      return
    }

    // Navigate to new quote for editing
    if (data?.quote?.id) {
      navigate(`/quotes/${data.quote.id}/builder`)
    }

    createQuoteModal.close()
    setNewQuoteData({
      customerId: '',
      service_type: 'ocean_fcl',
      origin_port: '',
      destination_port: '',
      valid_until: '',
    })
    setIsCreating(false)
  }

  const getMarginColor = (margin) => {
    if (!margin) return 'info'
    if (margin >= 20) return 'success'
    if (margin >= 15) return 'warning'
    return 'critical'
  }

  const totalPages = Math.ceil(total / limit)

  const serviceTypeLabel = {
    ocean_fcl: 'Ocean FCL',
    ocean_lcl: 'Ocean LCL',
    air_freight: 'Air Freight',
    roro: 'RORO',
    breakbulk: 'Breakbulk',
  }

  const statusLabel = {
    draft: 'Draft',
    submitted: 'Awaiting Approval',
    approved: 'Approved',
    sent: 'Sent to Customer',
    won: 'Won',
    lost: 'Lost',
    expired: 'Expired',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Quotes</h1>
          <p className="text-slate-600 mt-1">Manage commercial quotations</p>
        </div>
        <Button
          variant="primary"
          onClick={() => createQuoteModal.open()}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Quote
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="critical">
          <AlertCircle className="w-4 h-4" />
          Failed to load quotes: {error}
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormGroup>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Service Type
              </label>
              <Select
                value={filterService}
                onChange={(e) => setFilterService(e.target.value)}
              >
                <option value="">All Services</option>
                <option value="ocean_fcl">Ocean FCL</option>
                <option value="ocean_lcl">Ocean LCL</option>
                <option value="air_freight">Air Freight</option>
                <option value="roro">RORO</option>
                <option value="breakbulk">Breakbulk</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status
              </label>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="draft">Draft</option>
                <option value="submitted">Awaiting Approval</option>
                <option value="approved">Approved</option>
                <option value="sent">Sent to Customer</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </Select>
            </FormGroup>

            <FormGroup>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                &nbsp;
              </label>
              <Button
                variant="secondary"
                onClick={handleApplyFilter}
                className="w-full"
              >
                Apply Filters
              </Button>
            </FormGroup>
          </div>

          {hasFilters && (
            <div className="mt-4 flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleResetFilters}
                className="flex items-center gap-1"
              >
                <FilterX className="w-4 h-4" />
                Clear Filters
              </Button>
              <span className="text-sm text-slate-600">
                Filters active · Page {page} of {totalPages}
              </span>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Quotes Table */}
      <Card>
        <CardBody className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader className="w-6 h-6 text-slate-400 animate-spin" />
            </div>
          ) : quotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500">
              <p>No quotes found</p>
              <p className="text-sm mt-1">Create your first quote to get started</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeader>Quote Number</TableHeader>
                    <TableHeader>Customer</TableHeader>
                    <TableHeader>Service</TableHeader>
                    <TableHeader>Route</TableHeader>
                    <TableHeader align="right">Value</TableHeader>
                    <TableHeader align="center">Margin</TableHeader>
                    <TableHeader>Status</TableHeader>
                    <TableHeader align="center">Action</TableHeader>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quotes.map((quote) => {
                    const pricingData = quote.quote_versions?.[0]?.pricing_snapshot
                    const sellTotal = pricingData?.sell_total || 0
                    const marginPct = pricingData?.margin_pct || 0

                    return (
                      <TableRow
                        key={quote.id}
                        className="hover:bg-slate-50 cursor-pointer"
                        onClick={() => navigate(`/quotes/${quote.id}`)}
                      >
                        <TableCell>
                          <span className="font-semibold text-blue-600">
                            {quote.quote_number}
                          </span>
                        </TableCell>
                        <TableCell>{quote.customer?.company_name || '—'}</TableCell>
                        <TableCell>
                          <Badge variant="info" size="sm">
                            {serviceTypeLabel[quote.service_type] || quote.service_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {quote.origin_port} → {quote.destination_port}
                          </div>
                        </TableCell>
                        <TableCell align="right">
                          <div className="font-semibold">
                            €{sellTotal.toLocaleString('de-DE', {
                              minimumFractionDigits: 2,
                            })}
                          </div>
                        </TableCell>
                        <TableCell align="center">
                          <Badge variant={getMarginColor(marginPct)} size="sm">
                            {marginPct.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={quote.status}
                            label={statusLabel[quote.status]}
                          />
                        </TableCell>
                        <TableCell align="center">
                          <button className="text-blue-600 hover:text-blue-700 p-1">
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-t border-slate-200 px-6 py-4 flex items-center justify-between">
                  <span className="text-sm text-slate-600">
                    Page {page} of {totalPages} · Total: {total} quotes
                  </span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page === 1}
                      onClick={() => goToPage(page - 1)}
                    >
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={page === totalPages}
                      onClick={() => goToPage(page + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {/* Create Quote Modal */}
      <Modal
        isOpen={createQuoteModal.isOpen}
        onClose={createQuoteModal.close}
        title="Create New Quote"
        size="lg"
      >
        <div className="space-y-4 mb-6">
          {createError && (
            <Alert variant="critical">
              <AlertCircle className="w-4 h-4" />
              {createError}
            </Alert>
          )}

          <FormGroup>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Customer *
            </label>
            <Input
              placeholder="Select or enter customer ID (for now: mock integration)"
              value={newQuoteData.customerId}
              onChange={(e) =>
                setNewQuoteData({ ...newQuoteData, customerId: e.target.value })
              }
            />
            <p className="text-xs text-slate-500 mt-1">
              TODO: Customer dropdown with search (Week 2.2)
            </p>
          </FormGroup>

          <FormGroup>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Service Type *
            </label>
            <Select
              value={newQuoteData.service_type}
              onChange={(e) =>
                setNewQuoteData({ ...newQuoteData, service_type: e.target.value })
              }
            >
              <option value="ocean_fcl">Ocean FCL</option>
              <option value="ocean_lcl">Ocean LCL</option>
              <option value="air_freight">Air Freight</option>
              <option value="roro">RORO</option>
              <option value="breakbulk">Breakbulk</option>
            </Select>
          </FormGroup>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Origin Port *
              </label>
              <Input
                placeholder="e.g., Hamburg"
                value={newQuoteData.origin_port}
                onChange={(e) =>
                  setNewQuoteData({
                    ...newQuoteData,
                    origin_port: e.target.value,
                  })
                }
              />
            </FormGroup>

            <FormGroup>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Destination Port *
              </label>
              <Input
                placeholder="e.g., Singapore"
                value={newQuoteData.destination_port}
                onChange={(e) =>
                  setNewQuoteData({
                    ...newQuoteData,
                    destination_port: e.target.value,
                  })
                }
              />
            </FormGroup>
          </div>

          <FormGroup>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Valid Until *
            </label>
            <Input
              type="date"
              value={newQuoteData.valid_until}
              onChange={(e) =>
                setNewQuoteData({ ...newQuoteData, valid_until: e.target.value })
              }
            />
          </FormGroup>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={createQuoteModal.close}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleCreateQuote}
            disabled={isCreating}
          >
            {isCreating ? 'Creating...' : 'Create & Edit'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default QuotesList
