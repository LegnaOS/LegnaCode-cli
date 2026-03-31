// Stub: connectorText type — feature-gated by feature('CONNECTOR_TEXT')
export type ConnectorTextBlock = {
  type: 'connector_text'
  text: string
  [key: string]: unknown
}

export function isConnectorTextBlock(block: unknown): block is ConnectorTextBlock {
  return (
    typeof block === 'object' &&
    block !== null &&
    (block as any).type === 'connector_text'
  )
}
