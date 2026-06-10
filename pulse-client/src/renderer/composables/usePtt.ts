import { ref, watch, onMounted, onUnmounted } from 'vue'

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

  onMounted(async () => {
    const saved = await window.pulseApi.getPttKey()
    if (saved) pttBinding.value = { accelerator: saved, label: saved }
    const savedMode = await window.pulseApi.getPttMode()
    isPttMode.value = savedMode
    watch(isPttMode, (v) => { window.pulseApi.setPttMode(v) })
  })

  onUnmounted(() => {
    window.pulseApi.removePttListeners()
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

  return { isPttMode, pttBinding, isCapturing, startCapture, handleCaptureKeydown }
}
