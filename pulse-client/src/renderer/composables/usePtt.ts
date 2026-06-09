import { ref, onMounted, onUnmounted } from 'vue'

const CODE_TO_ACCELERATOR: Record<string, string> = {
  Space: 'Space',
  Enter: 'Return',
  Backspace: 'Backspace',
  Tab: 'Tab',
  Escape: 'Escape',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
}

export function codeToAccelerator(code: string): string {
  if (CODE_TO_ACCELERATOR[code]) return CODE_TO_ACCELERATOR[code]
  if (/^Key[A-Z]$/.test(code)) return code.slice(3)
  if (/^Digit[0-9]$/.test(code)) return code.slice(5)
  if (/^F\d+$/.test(code)) return code
  return code
}

export interface PttBinding {
  accelerator: string
  label: string
}

export function usePtt() {
  const isPttMode = ref(false)
  const pttBinding = ref<PttBinding | null>(null)
  const isCapturing = ref(false)

  // Called by RoomView to hook focused-window keyup into the mic release logic
  let _onRelease: (() => void) | null = null
  function setReleaseCallback(fn: () => void): void {
    _onRelease = fn
  }

  function handleWindowKeyUp(e: KeyboardEvent): void {
    if (!isPttMode.value || !pttBinding.value) return
    const acc = codeToAccelerator(e.code)
    if (acc === pttBinding.value.accelerator && _onRelease) {
      _onRelease()
    }
  }

  onMounted(async () => {
    const saved = await window.pulseApi.getPttKey()
    if (saved) pttBinding.value = { accelerator: saved, label: saved }
    window.addEventListener('keyup', handleWindowKeyUp)
  })

  onUnmounted(() => {
    window.pulseApi.removePttListeners()
    window.removeEventListener('keyup', handleWindowKeyUp)
  })

  function startCapture(): void {
    isCapturing.value = true
  }

  function handleCaptureKeydown(e: KeyboardEvent): void {
    if (!isCapturing.value) return
    e.preventDefault()
    e.stopPropagation()
    const accelerator = codeToAccelerator(e.code)
    const label = e.code === 'Space' ? 'Space' : (e.key.length === 1 ? e.key.toUpperCase() : e.key)
    pttBinding.value = { accelerator, label }
    isCapturing.value = false
    window.pulseApi.setPttKey(accelerator)
  }

  return { isPttMode, pttBinding, isCapturing, startCapture, handleCaptureKeydown, setReleaseCallback }
}
