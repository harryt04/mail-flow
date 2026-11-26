'use client'

import { useEffect } from 'react'
import { createAgent, registerTools } from '@ui-sdk/react/agent'
import { allowAgentAction } from '@/lib/agent/policy'

export function AgentBridge() {
  useEffect(() => {
    const agent = createAgent({ allow: allowAgentAction })
    return registerTools(agent, { allow: allowAgentAction })
  }, [])
  return null
}
