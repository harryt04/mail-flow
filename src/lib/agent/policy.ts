import type { AgentAction } from '@ui-sdk/react/agent'
import { elementOf } from '@ui-sdk/core/observe'

export function allowAgentAction(step: AgentAction) {
  if (step.confirm !== undefined) return false
  const target = elementOf(step.ref)
  if (
    !target ||
    target.closest(
      '[data-agent-hidden], [data-agent-secret], [data-agent-confirm]',
    )
  )
    return false

  switch (target.dataset.agentControl) {
    case 'navigation':
      return (
        step.component === 'button' &&
        step.action === 'press' &&
        target instanceof HTMLAnchorElement &&
        ['/home', '/inbox'].includes(target.getAttribute('href') ?? '')
      )
    case 'inbox-search':
      return (
        step.component === 'input' &&
        target instanceof HTMLInputElement &&
        target.type === 'text' &&
        (step.action === 'clear' || step.action === 'setValue')
      )
    default:
      return false
  }
}
