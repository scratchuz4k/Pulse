import { ref, watch, onMounted } from 'vue'

export interface PttBinding {
  label: string
}

export function codeToLabel(code: string, key: string): string {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit[0-9]$/.test(code)) return code.slice(5)
  const named: Record<string, string> = {
    Space: 'Space', Enter: 'Enter', Escape: 'Esc', Tab: 'Tab',
    Backspace: 'Bksp', Delete: 'Del', Insert: 'Ins',
    ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    Home: 'Home', End: 'End', PageUp: 'PgUp', PageDown: 'PgDn',
  }
  if (named[code]) return named[code]
  if (/^F\d+$/.test(code)) return code
  if (key.length === 1) return key.toUpperCase()
  return code
}


// Module-level singleton — shared across ConnectBar + RoomView
const isPttMode = ref(false)
const pttBinding = ref<PttBinding | null>(null)
const isCapturing = ref(false)
const whisperPttBinding = ref<PttBinding | null>(null)
const isCapturingWhisper = ref(false)
let pttDomCode: string | null = null
let whisperPttDomCode: string | null = null
let _initialized = false

function isTypingTarget(el: Element | null): boolean {
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || (el as HTMLElement).isContentEditable
}

function onPttKeyEvent(e: KeyboardEvent): void {
  if (isCapturing.value || isCapturingWhisper.value) return
  const isPttKey = pttDomCode && e.code === pttDomCode
  const isWhisperKey = whisperPttDomCode && e.code === whisperPttDomCode
  if (!isPttKey && !isWhisperKey) return
  // Allow key through when user is typing in a text field
  if (isTypingTarget(document.activeElement)) return
  // Prevent key from activating focused buttons or other DOM elements
  e.preventDefault()
}

function onCaptureKeydown(e: KeyboardEvent): void {
  if (!isCapturing.value && !isCapturingWhisper.value) return
  if (e.repeat) return
  if (['Control', 'Alt', 'Shift', 'Meta', 'CapsLock'].includes(e.key)) return
  e.preventDefault()
  e.stopPropagation()
  const label = codeToLabel(e.code, e.key)
  if (isCapturing.value) {
    isCapturing.value = false
    pttDomCode = e.code
    window.pulseApi.setPttKeyByCode(e.code, label).then(ok => {
      if (ok) pttBinding.value = { label }
    })
  } else {
    isCapturingWhisper.value = false
    whisperPttDomCode = e.code
    window.pulseApi.setWhisperPttKeyByCode(e.code, label).then(ok => {
      if (ok) whisperPttBinding.value = { label }
    })
  }
}

export function usePtt() {
  onMounted(() => {
    if (_initialized) return
    _initialized = true

    window.pulseApi.getPttKey().then(saved => {
      if (saved) pttBinding.value = { label: saved }
    })
    window.pulseApi.getPttMode().then(saved => {
      isPttMode.value = saved
      watch(isPttMode, (v) => { window.pulseApi.setPttMode(v) })
    })
    window.pulseApi.getWhisperPttKey().then(saved => {
      if (saved) whisperPttBinding.value = { label: saved }
    })
    window.pulseApi.getPttDomCode().then(v => { if (v) pttDomCode = v })
    window.pulseApi.getWhisperPttDomCode().then(v => { if (v) whisperPttDomCode = v })

    // Capture phase: handle key capture and block PTT keys from activating DOM elements
    document.addEventListener('keydown', onCaptureKeydown, true)
    document.addEventListener('keydown', onPttKeyEvent, true)
    document.addEventListener('keyup', onPttKeyEvent, true)
  })

  function startCapture(): void {
    isCapturing.value = true
  }

  function startWhisperCapture(): void {
    isCapturingWhisper.value = true
  }

  function clearWhisperPtt(): void {
    window.pulseApi.clearWhisperPttKey()
    whisperPttBinding.value = null
    whisperPttDomCode = null
  }

  return { isPttMode, pttBinding, isCapturing, startCapture, whisperPttBinding, isCapturingWhisper, startWhisperCapture, clearWhisperPtt }
}
