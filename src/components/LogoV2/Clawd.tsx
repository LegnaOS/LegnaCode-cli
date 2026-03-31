import * as React from 'react'
import { Box, Text } from '../../ink.js'
import { env } from '../../utils/env.js'

export type ClawdPose = 'default' | 'arms-up' | 'look-left' | 'look-right'

type Props = {
  pose?: ClawdPose
}

// LEGNA "L" logo — replaces the original Clawd mascot.
// 3 rows, ~9 cols wide, matching the original footprint.
export function Clawd({ pose: _pose = 'default' }: Props = {}): React.ReactNode {
  if (env.terminal === 'Apple_Terminal') {
    return <AppleTerminalLogo />
  }
  return (
    <Box flexDirection="column">
      <Text color="clawd_body">{'▐██▌    '}</Text>
      <Text color="clawd_body">{'▐██▌    '}</Text>
      <Text color="clawd_body">{'▐██████▌'}</Text>
    </Box>
  )
}

function AppleTerminalLogo(): React.ReactNode {
  return (
    <Box flexDirection="column" alignItems="center">
      <Text backgroundColor="clawd_body">{' ██ '}</Text>
      <Text backgroundColor="clawd_body">{' ██ '}</Text>
      <Text backgroundColor="clawd_body">{' █████ '}</Text>
    </Box>
  )
}
