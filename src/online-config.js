// Paste the browser-safe values from your Supabase project's Connect dialog.
// The publishable key is designed to be included in a web app. Never place a
// Supabase secret key in this file.
export const ONLINE_CONFIG = Object.freeze({
  supabaseUrl: 'https://ugglwnieqlqtaylotoyo.supabase.co',
  supabasePublishableKey: 'sb_publishable_UtYMbspK-imzXAGEOYpgZA_WSewHIRC',
  channelPrefix: 'arcade',
  appId: 'whale-run',
  protocolVersion: 1,
  privateChannels: false,
})

export function onlineConfigured(config = ONLINE_CONFIG) {
  return Boolean(config.supabaseUrl && config.supabasePublishableKey)
}
