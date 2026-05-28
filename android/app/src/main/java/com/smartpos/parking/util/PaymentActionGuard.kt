package com.smartpos.parking.util

import java.util.concurrent.atomic.AtomicBoolean

/**
 * Evita duplo clique em pagamento — exigência PagBank nos exemplos PlugPag.
 */
class PaymentActionGuard {
    private val inFlight = AtomicBoolean(false)

    fun tryAcquire(): Boolean = inFlight.compareAndSet(false, true)

    fun release() {
        inFlight.set(false)
    }
}
