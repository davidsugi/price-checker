import { useState, useEffect } from 'react'
import { type ExchangeRates, fetchExchangeRates } from './utils'

const idrFormat = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export default function CurrencyConverter() {
  const [rates, setRates] = useState<ExchangeRates | null>(null)
  const [error, setError] = useState(false)
  const [usdInput, setUsdInput] = useState('')
  const [jpyInput, setJpyInput] = useState('')
  const [thbInput, setThbInput] = useState('')

  useEffect(() => {
    fetchExchangeRates().then((r) => {
      if (r) setRates(r)
      else setError(true)
    })
  }, [])

  const usdValue = parseFloat(usdInput.replace(/,/g, ''))
  const jpyValue = parseFloat(jpyInput.replace(/,/g, ''))
  const usdToIdr =
    rates && !isNaN(usdValue) ? idrFormat.format(usdValue * rates.usdToIdr) : null
  const jpyToIdr =
    rates && !isNaN(jpyValue) ? idrFormat.format(jpyValue * rates.jpyToIdr) : null
  const thbValue = parseFloat(thbInput.replace(/,/g, ''))
  const thbToIdr =
    rates && !isNaN(thbValue) ? idrFormat.format(thbValue * rates.thbToIdr) : null

  return (
    <div className="w-full max-w-5xl mt-4 rounded-lg border border-neutral-700 bg-neutral-800 p-4">
      <h3 className="text-sm font-semibold text-neutral-400 mb-3">
        Currency Converter
      </h3>

      {error && !rates && (
        <p className="text-xs text-red-400">
          Could not load exchange rates. Try again later.
        </p>
      )}

      {!rates && !error && (
        <p className="text-xs text-neutral-500">Loading rates...</p>
      )}

      {rates && (
        <div className="space-y-4">
          <div className="flex flex-col min-[700px]:flex-row gap-4">
            <div className="flex-1 min-w-0 space-y-1">
              <label htmlFor="usd-input" className="text-xs text-neutral-400">
                USD → IDR
                <span className="ml-1 text-neutral-500">
                  (1 USD = {rates.usdToIdr.toLocaleString('id-ID')} IDR)
                </span>
              </label>
              <input
                id="usd-input"
                type="text"
                inputMode="decimal"
                placeholder="Enter USD amount (e.g. 1,500.00)"
                value={usdInput}
                onChange={(e) => setUsdInput(e.target.value)}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
              <p className="text-sm text-neutral-300 h-5">
                {usdToIdr ? `= ${usdToIdr}` : ''}
              </p>
            </div>

            <div className="flex-1 min-w-0 space-y-1">
              <label htmlFor="jpy-input" className="text-xs text-neutral-400">
                JPY → IDR
                <span className="ml-1 text-neutral-500">
                  (1 JPY = {rates.jpyToIdr.toLocaleString('id-ID', { maximumFractionDigits: 2 })} IDR)
                </span>
              </label>
              <input
                id="jpy-input"
                type="text"
                inputMode="decimal"
                placeholder="Enter JPY amount (e.g. 15,600)"
                value={jpyInput}
                onChange={(e) => setJpyInput(e.target.value)}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
              <p className="text-sm text-neutral-300 h-5">
                {jpyToIdr ? `= ${jpyToIdr}` : ''}
              </p>
            </div>
          </div>

          <div className="max-w-[calc(50%-0.5rem)] min-[700px]:max-w-[calc(50%-0.5rem)]">
            <div className="space-y-1">
              <label htmlFor="thb-input" className="text-xs text-neutral-400">
                THB → IDR
                <span className="ml-1 text-neutral-500">
                  (1 THB = {rates.thbToIdr.toLocaleString('id-ID', { maximumFractionDigits: 2 })} IDR)
                </span>
              </label>
              <input
                id="thb-input"
                type="text"
                inputMode="decimal"
                placeholder="Enter THB amount (e.g. 1,500)"
                value={thbInput}
                onChange={(e) => setThbInput(e.target.value)}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              />
              <p className="text-sm text-neutral-300 h-5">
                {thbToIdr ? `= ${thbToIdr}` : ''}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
