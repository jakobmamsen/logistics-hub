/**
 * Quote Builder Page
 * Phase 3 Week 2: Quote Creation & Editing
 * 
 * Features:
 *   - Load draft quote or create new one
 *   - Add/edit/delete line items
 *   - Real-time pricing calculation
 *   - Margin threshold indicator (green ≥15%, red <15%)
 *   - Submit for approval (auto-approve or route to manager)
 */

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Button,
  FormGroup,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  Badge,
  Modal,
  Alert,
} from './index.jsx'
import {
  Plus,
  Trash2,
  Edit2,
  Send,
  Save,
  AlertCircle,
  Check,
  Loader,
} from 'lucide-react'
import { useQuote } from '../hooks/useQuotes'
import { useModalState } from '../hooks/useModalState'

export const QuoteBuilder = () => {
  const navigate = useNavigate()
  const { id: quoteId } = useParams()

  const {
    quote,
    isLoading,
    error,
    addLine,
    updateLine,
    deleteLine,
    calculateTotals,
    submitQuote,
  } = useQuote(quoteId)

  // State
  const [totals, setTotals] = useState({
    buy_total: 0,
    sell_total: 0,
    gross_profit: 0,
    margin_pct: 0,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')
  const [editingLine, setEditingLine] = useState(null)

  // Modals
  const addLineModal = useModalState()
  const editLineModal = useModalState()
  const submitModal = useModalState()

  // Form states
  const [newLineData, setNewLineData] = useState({
    description: '',
    line_type: 'freight',
    quantity: 1,
    unit_of_measure: 'container',
    unit_price_usd: 0,
  })

  const [editLineData, setEditLineData] = useState(null)

  // Recalculate totals whenever lines change
  useEffect(() => {
    if (quote?.quote_versions?.[0]) {
      calculateTotals().then(({ data }) => {
        if (data) setTotals(data)
      })
    }
  }, [quote?.quote_versions?.[0]?.quote_lines, calculateTotals])

  // Handlers
  const handleAddLine = async () => {
    if (!newLineData.description) {
      alert('Please enter a description')
      return
    }

    const { error: err } = await addLine(newLineData)
    if (!err) {
      addLineModal.close()
      setNewLineData({
        description: '',
        line_type: 'freight',
        quantity: 1,
        unit_of_measure: 'container',
        unit_price_usd: 0,
      })
    }
  }

  const handleEditLine = async () => {
    if (!editLineData.description) {
      alert('Please enter a description')
      return
    }

    const { error: err } = await updateLine(editingLine.id, editLineData)
    if (!err) {
      editLineModal.close()
      setEditingLine(null)
      setEditLineData(null)
    }
  }

  const handleDeleteLine = async (lineId) => {
    if (window.confirm('Delete this line item?')) {
      await deleteLine(lineId)
    }
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    setSubmitMessage('')

    const { data, error: err, message } = await submitQuote(totals)

    if (err) {
      setSubmitMessage(`Error: ${err}`)
      setIsSubmitting(false)
      return
    }

    setSubmitMessage(message)

    // After 2 seconds, navigate to detail page
    setTimeout(() => {
      navigate(`/quotes/${quote.id}`)
    }, 2000)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="critical">
        <AlertCircle className="w-4 h-4" />
        Failed to load quote: {error}
      </Alert>
    )
  }

  if (!quote) {
    return (
      <Alert variant="info">
        <AlertCircle className="w-4 h-4" />
        Quote not found
      </Alert>
    )
  }

  const latestVersion = quote.quote_versions?.[0]
  const lines = latestVersion?.quote_lines || []
  const marginColor = totals.margin_pct >= 15 ? 'success' : 'critical'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Quote Builder</h1>
          <p className="text-slate-600 mt-1">{quote.quote_number}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate(`/quotes/${quote.id}`)}>
            View Details
          </Button>
          <Button
            variant="primary"
            onClick={() => submitModal.open()}
            disabled={lines.length === 0 || quote.status !== 'draft'}
            className="flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Submit
          </Button>
        </div>
      </div>

      {/* Quote Header Info */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-slate-600">Customer</p>
              <p className="font-semibold text-slate-900">
                {quote.customer?.company_name || '—'}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Service</p>
              <p className="font-semibold text-slate-900">{quote.service_type}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Route</p>
              <p className="font-semibold text-slate-900">
                {quote.origin_port} → {quote.destination_port}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Status</p>
              <Badge variant="info" size="sm">
                {quote.status}
              </Badge>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Line Items Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            <Button
              size="sm"
              variant="primary"
              onClick={() => addLineModal.open()}
              className="flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Line
            </Button>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {lines.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              <p>No line items yet. Click "Add Line" to start.</p>
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeader>Description</TableHeader>
                  <TableHeader align="center">Type</TableHeader>
                  <TableHeader align="right">Qty</TableHeader>
                  <TableHeader align="right">Unit Price</TableHeader>
                  <TableHeader align="right">Line Total</TableHeader>
                  <TableHeader align="center">Actions</TableHeader>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-slate-900">
                          {line.description}
                        </p>
                        <p className="text-sm text-slate-600">
                          {line.unit_of_measure}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell align="center">
                      <Badge size="sm" variant="info">
                        {line.line_type}
                      </Badge>
                    </TableCell>
                    <TableCell align="right">{line.quantity}</TableCell>
                    <TableCell align="right">
                      €{line.unit_price_usd.toLocaleString('de-DE', {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell align="right" className="font-semibold">
                      €{(line.line_total_usd || 0).toLocaleString('de-DE', {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell align="center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => {
                            setEditingLine(line)
                            setEditLineData({ ...line })
                            editLineModal.open()
                          }}
                          className="text-blue-600 hover:text-blue-700 p-1"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteLine(line.id)}
                          className="text-red-600 hover:text-red-700 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* Pricing Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardBody>
            <p className="text-sm text-slate-600">Buy Total</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">
              €{totals.buy_total.toLocaleString('de-DE', {
                minimumFractionDigits: 2,
              })}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-sm text-slate-600">Sell Total</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">
              €{totals.sell_total.toLocaleString('de-DE', {
                minimumFractionDigits: 2,
              })}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-sm text-slate-600">Gross Profit</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">
              €{totals.gross_profit.toLocaleString('de-DE', {
                minimumFractionDigits: 2,
              })}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-sm text-slate-600">Margin %</p>
            <div className="mt-2 flex items-end gap-2">
              <p className="text-2xl font-bold text-slate-900">
                {totals.margin_pct.toFixed(1)}%
              </p>
              <Badge variant={marginColor} size="sm">
                {totals.margin_pct >= 15 ? '✓ Auto' : '⏳ Review'}
              </Badge>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Margin Threshold Warning */}
      {totals.margin_pct < 15 && lines.length > 0 && (
        <Alert variant="warning">
          <AlertCircle className="w-4 h-4" />
          <div>
            <p className="font-semibold">Below Auto-Approval Threshold</p>
            <p className="text-sm mt-1">
              Margin is {totals.margin_pct.toFixed(1)}% (need ≥15%). Quote will need manager approval.
            </p>
          </div>
        </Alert>
      )}

      {/* Add Line Modal */}
      <Modal
        isOpen={addLineModal.isOpen}
        onClose={addLineModal.close}
        title="Add Line Item"
      >
        <div className="space-y-4 mb-6">
          <FormGroup>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Description *
            </label>
            <Input
              placeholder="e.g., Ocean freight Hamburg → Singapore"
              value={newLineData.description}
              onChange={(e) =>
                setNewLineData({ ...newLineData, description: e.target.value })
              }
            />
          </FormGroup>

          <FormGroup>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Type
            </label>
            <Select
              value={newLineData.line_type}
              onChange={(e) =>
                setNewLineData({ ...newLineData, line_type: e.target.value })
              }
            >
              <option value="freight">Freight</option>
              <option value="surcharge">Surcharge</option>
              <option value="fee">Fee</option>
              <option value="discount">Discount</option>
            </Select>
          </FormGroup>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Quantity *
              </label>
              <Input
                type="number"
                value={newLineData.quantity}
                onChange={(e) =>
                  setNewLineData({
                    ...newLineData,
                    quantity: parseFloat(e.target.value) || 0,
                  })
                }
              />
            </FormGroup>

            <FormGroup>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Unit
              </label>
              <Select
                value={newLineData.unit_of_measure}
                onChange={(e) =>
                  setNewLineData({
                    ...newLineData,
                    unit_of_measure: e.target.value,
                  })
                }
              >
                <option value="unit">Unit</option>
                <option value="kg">kg</option>
                <option value="cbm">CBM</option>
                <option value="pallet">Pallet</option>
                <option value="container">Container</option>
              </Select>
            </FormGroup>
          </div>

          <FormGroup>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Unit Price (€) *
            </label>
            <Input
              type="number"
              value={newLineData.unit_price_usd}
              onChange={(e) =>
                setNewLineData({
                  ...newLineData,
                  unit_price_usd: parseFloat(e.target.value) || 0,
                })
              }
            />
          </FormGroup>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={addLineModal.close}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAddLine}>
            Add Line
          </Button>
        </div>
      </Modal>

      {/* Edit Line Modal */}
      <Modal
        isOpen={editLineModal.isOpen}
        onClose={editLineModal.close}
        title="Edit Line Item"
      >
        {editLineData && (
          <>
            <div className="space-y-4 mb-6">
              <FormGroup>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description *
                </label>
                <Input
                  value={editLineData.description}
                  onChange={(e) =>
                    setEditLineData({
                      ...editLineData,
                      description: e.target.value,
                    })
                  }
                />
              </FormGroup>

              <div className="grid grid-cols-2 gap-4">
                <FormGroup>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Quantity
                  </label>
                  <Input
                    type="number"
                    value={editLineData.quantity}
                    onChange={(e) =>
                      setEditLineData({
                        ...editLineData,
                        quantity: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </FormGroup>

                <FormGroup>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Unit Price (€)
                  </label>
                  <Input
                    type="number"
                    value={editLineData.unit_price_usd}
                    onChange={(e) =>
                      setEditLineData({
                        ...editLineData,
                        unit_price_usd: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </FormGroup>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                onClick={() => {
                  editLineModal.close()
                  setEditingLine(null)
                  setEditLineData(null)
                }}
              >
                Cancel
              </Button>
              <Button variant="primary" onClick={handleEditLine}>
                Save
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* Submit Modal */}
      <Modal
        isOpen={submitModal.isOpen}
        onClose={submitModal.close}
        title="Submit for Approval"
      >
        <div className="space-y-4 mb-6">
          <p className="text-slate-700">
            Ready to submit quote <strong>{quote.quote_number}</strong>?
          </p>

          <Alert variant={totals.margin_pct >= 15 ? 'success' : 'warning'}>
            <div>
              <p className="font-semibold">
                {totals.margin_pct >= 15 ? '✓ Will Auto-Approve' : '⏳ Manager Review'}
              </p>
              <p className="text-sm mt-1">
                Margin: {totals.margin_pct.toFixed(1)}%
                {totals.margin_pct >= 15 ? ' (≥15%)' : ' (<15%)'}
              </p>
            </div>
          </Alert>

          {submitMessage && (
            <Alert variant="success">
              <Check className="w-4 h-4" />
              {submitMessage}
            </Alert>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={submitModal.close} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit
              </>
            )}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default QuoteBuilder
