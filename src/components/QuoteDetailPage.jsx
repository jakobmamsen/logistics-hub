/**
 * Quote Detail Page
 * Phase 3 Week 2: Quote View & Actions
 * 
 * Features:
 *   - Display full quote details
 *   - Show all line items
 *   - Pricing summary + margin indicator
 *   - Approval history timeline
 *   - Action buttons: Send, Won, Lost
 *   - Edit (if draft)
 */

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  StatusBadge,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
  Modal,
  useModalState,
  Alert,
} from './index'
import {
  Send,
  CheckCircle,
  XCircle,
  Edit2,
  Loader,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'
import { useQuote } from '../../hooks/useQuotes'
import quoteApi from '../../api/quotes'

export const QuoteDetailPage = () => {
  const navigate = useNavigate()
  const { id: quoteId } = useParams()

  const { quote, isLoading, error, sendQuote, markWon, markLost } = useQuote(quoteId)

  // State
  const [approvalHistory, setApprovalHistory] = useState([])
  const [isActioning, setIsActioning] = useState(false)
  const [actionMessage, setActionMessage] = useState('')

  // Modals
  const sendModal = useModalState()
  const wonModal = useModalState()
  const lostModal = useModalState()
  const [lostReason, setLostReason] = useState('')

  // Load approval history
  useEffect(() => {
    if (quote?.quote_versions?.[0]) {
      quoteApi.getApprovalHistory(quote.quote_versions[0].id).then(({ data }) => {
        if (data) setApprovalHistory(data)
      })
    }
  }, [quote?.quote_versions])

  const handleSend = async () => {
    setIsActioning(true)
    const { error: err } = await sendQuote()
    if (!err) {
      setActionMessage('Quote sent to customer')
      setTimeout(() => sendModal.close(), 1500)
    }
    setIsActioning(false)
  }

  const handleWon = async () => {
    setIsActioning(true)
    const { error: err } = await markWon()
    if (!err) {
      setActionMessage('Quote marked as won!')
      setTimeout(() => wonModal.close(), 1500)
    }
    setIsActioning(false)
  }

  const handleLost = async () => {
    setIsActioning(true)
    const { error: err } = await markLost(lostReason)
    if (!err) {
      setActionMessage('Quote marked as lost')
      setTimeout(() => lostModal.close(), 1500)
    }
    setIsActioning(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="w-6 h-6 text-blue-500 animate-spin" />
      </div>
    )
  }

  if (error || !quote) {
    return (
      <Alert variant="critical">
        <AlertCircle className="w-4 h-4" />
        Failed to load quote: {error}
      </Alert>
    )
  }

  const latestVersion = quote.quote_versions?.[0]
  const lines = latestVersion?.quote_lines || []
  const pricingData = latestVersion?.pricing_snapshot || {}
  const marginPct = pricingData.margin_pct || 0
  const marginColor = marginPct >= 15 ? 'success' : marginPct >= 10 ? 'warning' : 'critical'

  const statusLabel = {
    draft: 'Draft',
    submitted: 'Awaiting Approval',
    approved: 'Approved',
    sent: 'Sent to Customer',
    won: 'Won',
    lost: 'Lost',
    expired: 'Expired',
  }

  const canEdit = quote.status === 'draft'
  const canSend = quote.status === 'approved'
  const canMarkWon = quote.status === 'sent'
  const canMarkLost = ['sent', 'won'].includes(quote.status)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{quote.quote_number}</h1>
          <p className="text-slate-600 mt-1">{quote.customer?.company_name || '—'}</p>
        </div>
        <div className="flex gap-2 items-center">
          <StatusBadge status={quote.status} label={statusLabel[quote.status]} />
          <div className="flex gap-2">
            {canEdit && (
              <Button
                variant="secondary"
                onClick={() => navigate(`/quotes/${quote.id}/builder`)}
                className="flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </Button>
            )}
            {canSend && (
              <Button
                variant="primary"
                onClick={() => sendModal.open()}
                className="flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send
              </Button>
            )}
            {canMarkWon && (
              <Button
                variant="success"
                onClick={() => wonModal.open()}
                className="flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Won
              </Button>
            )}
            {canMarkLost && (
              <Button
                variant="secondary"
                onClick={() => lostModal.open()}
                className="flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Lost
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Quote Summary */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-slate-600">Service Type</p>
              <p className="font-semibold text-slate-900 mt-1">{quote.service_type}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Route</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="font-semibold text-slate-900">{quote.origin_port}</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
                <span className="font-semibold text-slate-900">{quote.destination_port}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-600">Incoterm</p>
              <p className="font-semibold text-slate-900 mt-1">{quote.incoterm}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Valid Until</p>
              <p className="font-semibold text-slate-900 mt-1">
                {new Date(quote.valid_until).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {lines.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              <p>No line items</p>
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
              €{(pricingData.buy_total || 0).toLocaleString('de-DE', {
                minimumFractionDigits: 2,
              })}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-sm text-slate-600">Sell Total</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">
              €{(pricingData.sell_total || 0).toLocaleString('de-DE', {
                minimumFractionDigits: 2,
              })}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <p className="text-sm text-slate-600">Gross Profit</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">
              €{(pricingData.gross_profit || 0).toLocaleString('de-DE', {
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
                {marginPct.toFixed(1)}%
              </p>
              <Badge variant={marginColor} size="sm">
                {marginPct >= 15 ? '✓ Auto' : '⏳ Review'}
              </Badge>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Approval History */}
      {approvalHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Approval History</CardTitle>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {approvalHistory.map((approval, idx) => (
                <div key={approval.id} className="flex gap-4">
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        approval.action === 'approved'
                          ? 'bg-green-500'
                          : approval.action === 'rejected'
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`}
                    />
                    {idx < approvalHistory.length - 1 && (
                      <div className="w-0.5 h-8 bg-slate-200 my-1" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {approval.action.charAt(0).toUpperCase() +
                          approval.action.slice(1)}
                      </p>
                      <Badge size="sm" variant="info">
                        {approval.margin_pct?.toFixed(1)}% margin
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 mt-1">
                      {approval.acted_by_user?.email || 'System'}
                    </p>
                    {approval.reason && (
                      <p className="text-sm text-slate-700 mt-1 italic">
                        "{approval.reason}"
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(approval.acted_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Send to Customer Modal */}
      <Modal isOpen={sendModal.isOpen} onClose={sendModal.close} title="Send to Customer">
        <div className="space-y-4 mb-6">
          <p className="text-slate-700">
            Send quote <strong>{quote.quote_number}</strong> to{' '}
            <strong>{quote.customer?.company_name}</strong>?
          </p>
          <p className="text-sm text-slate-600">
            Email will be sent to{' '}
            <strong>{quote.customer?.email || 'customer email'}</strong>
          </p>

          {actionMessage && (
            <Alert variant="success">
              <CheckCircle className="w-4 h-4" />
              {actionMessage}
            </Alert>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={sendModal.close} disabled={isActioning}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSend}
            disabled={isActioning}
            className="flex items-center gap-2"
          >
            {isActioning ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send
              </>
            )}
          </Button>
        </div>
      </Modal>

      {/* Won Modal */}
      <Modal isOpen={wonModal.isOpen} onClose={wonModal.close} title="Mark as Won">
        <div className="space-y-4 mb-6">
          <p className="text-slate-700">
            Mark quote <strong>{quote.quote_number}</strong> as won?
          </p>
          <p className="text-sm text-slate-600">
            This will indicate that the customer accepted this quote.
          </p>

          {actionMessage && (
            <Alert variant="success">
              <CheckCircle className="w-4 h-4" />
              {actionMessage}
            </Alert>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={wonModal.close} disabled={isActioning}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleWon}
            disabled={isActioning}
            className="flex items-center gap-2"
          >
            {isActioning ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Marking...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Mark Won
              </>
            )}
          </Button>
        </div>
      </Modal>

      {/* Lost Modal */}
      <Modal isOpen={lostModal.isOpen} onClose={lostModal.close} title="Mark as Lost">
        <div className="space-y-4 mb-6">
          <p className="text-slate-700">
            Mark quote <strong>{quote.quote_number}</strong> as lost?
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Reason (optional)
            </label>
            <textarea
              placeholder="Why was this quote lost? (e.g., Competitor won, Price too high)"
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          {actionMessage && (
            <Alert variant="success">
              <CheckCircle className="w-4 h-4" />
              {actionMessage}
            </Alert>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={lostModal.close} disabled={isActioning}>
            Cancel
          </Button>
          <Button
            variant="critical"
            onClick={handleLost}
            disabled={isActioning}
            className="flex items-center gap-2"
          >
            {isActioning ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Marking...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Mark Lost
              </>
            )}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export default QuoteDetailPage
