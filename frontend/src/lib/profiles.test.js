// @vitest-environment happy-dom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  PROFILES, isProfile, profileName, getActiveProfile, setActiveProfile,
  clearActiveProfile, slotSuffix, slotName, slotFile, profilePrefix,
} from './profiles.js'

beforeEach(() => { sessionStorage.clear() })

describe('profiles', () => {
  it('offers Jole and Krys', () => {
    expect(PROFILES.map(p => p.id)).toEqual(['jole', 'krys'])
    expect(isProfile('jole')).toBe(true)
    expect(isProfile('nobody')).toBe(false)
    expect(profileName('krys')).toBe('Krys')
  })

  it('keeps the old file names in tests when no profile is chosen', () => {
    expect(getActiveProfile()).toBe(null)
    expect(slotSuffix()).toBe('')
    expect(slotName('opengym-media')).toBe('opengym-media')
    expect(slotFile('opengym-state', 'json')).toBe('opengym-state.json')
  })

  it('scopes every file name once a profile is chosen', () => {
    setActiveProfile('jole')
    expect(getActiveProfile()).toBe('jole')
    expect(slotSuffix()).toBe('jole')
    expect(slotName('opengym-media')).toBe('opengym-media-jole')
    expect(slotFile('opengym-remote', 'json')).toBe('opengym-remote-jole.json')
    expect(profilePrefix()).toBe('gym_profile:jole:')
  })

  it('ignores an unknown stored value', () => {
    sessionStorage.setItem('gym_active_profile', 'nobody')
    expect(getActiveProfile()).toBe(null)
  })

  it('clears the choice', () => {
    setActiveProfile('krys')
    clearActiveProfile()
    expect(getActiveProfile()).toBe(null)
  })
})
