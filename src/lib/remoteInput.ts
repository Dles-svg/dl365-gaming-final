export interface KeyboardEvent {
  type: 'keydown' | 'keyup'
  key: string
  code: string
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
}

export interface MouseEvent {
  type: 'mousedown' | 'mouseup' | 'mousemove' | 'wheel' | 'click'
  button?: number
  x: number
  y: number
  deltaX?: number
  deltaY?: number
}

export type RemoteInputEvent = KeyboardEvent | MouseEvent

export class InputCapture {
  private element: HTMLElement
  private onInputCallback: ((event: RemoteInputEvent) => void) | null = null
  private isCapturing: boolean = false

  constructor(element: HTMLElement) {
    this.element = element
  }

  startCapture(callback: (event: RemoteInputEvent) => void): void {
    this.onInputCallback = callback
    this.isCapturing = true

    this.element.addEventListener('keydown', this.handleKeyDown)
    this.element.addEventListener('keyup', this.handleKeyUp)
    this.element.addEventListener('mousedown', this.handleMouseDown)
    this.element.addEventListener('mouseup', this.handleMouseUp)
    this.element.addEventListener('mousemove', this.handleMouseMove)
    this.element.addEventListener('wheel', this.handleWheel)
    this.element.addEventListener('click', this.handleClick)

    this.element.setAttribute('tabindex', '0')
    this.element.focus()
  }

  stopCapture(): void {
    this.isCapturing = false

    this.element.removeEventListener('keydown', this.handleKeyDown)
    this.element.removeEventListener('keyup', this.handleKeyUp)
    this.element.removeEventListener('mousedown', this.handleMouseDown)
    this.element.removeEventListener('mouseup', this.handleMouseUp)
    this.element.removeEventListener('mousemove', this.handleMouseMove)
    this.element.removeEventListener('wheel', this.handleWheel)
    this.element.removeEventListener('click', this.handleClick)
  }

  private handleKeyDown = (e: globalThis.KeyboardEvent) => {
    if (!this.isCapturing) return
    e.preventDefault()

    this.sendInput({
      type: 'keydown',
      key: e.key,
      code: e.code,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey
    })
  }

  private handleKeyUp = (e: globalThis.KeyboardEvent) => {
    if (!this.isCapturing) return
    e.preventDefault()

    this.sendInput({
      type: 'keyup',
      key: e.key,
      code: e.code,
      ctrlKey: e.ctrlKey,
      shiftKey: e.shiftKey,
      altKey: e.altKey,
      metaKey: e.metaKey
    })
  }

  private handleMouseDown = (e: globalThis.MouseEvent) => {
    if (!this.isCapturing) return
    e.preventDefault()

    const rect = this.element.getBoundingClientRect()
    this.sendInput({
      type: 'mousedown',
      button: e.button,
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height
    })
  }

  private handleMouseUp = (e: globalThis.MouseEvent) => {
    if (!this.isCapturing) return
    e.preventDefault()

    const rect = this.element.getBoundingClientRect()
    this.sendInput({
      type: 'mouseup',
      button: e.button,
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height
    })
  }

  private handleMouseMove = (e: globalThis.MouseEvent) => {
    if (!this.isCapturing) return

    const rect = this.element.getBoundingClientRect()
    this.sendInput({
      type: 'mousemove',
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height
    })
  }

  private handleWheel = (e: WheelEvent) => {
    if (!this.isCapturing) return
    e.preventDefault()

    const rect = this.element.getBoundingClientRect()
    this.sendInput({
      type: 'wheel',
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
      deltaX: e.deltaX,
      deltaY: e.deltaY
    })
  }

  private handleClick = (e: globalThis.MouseEvent) => {
    if (!this.isCapturing) return
    e.preventDefault()

    const rect = this.element.getBoundingClientRect()
    this.sendInput({
      type: 'click',
      button: e.button,
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height
    })
  }

  private sendInput(event: RemoteInputEvent): void {
    if (this.onInputCallback) {
      this.onInputCallback(event)
    }
  }
}

export class InputExecutor {
  private onInputCallback: ((event: RemoteInputEvent) => void) | null = null

  onInput(callback: (event: RemoteInputEvent) => void): void {
    this.onInputCallback = callback
  }

  executeInput(event: RemoteInputEvent): void {
    if (this.onInputCallback) {
      this.onInputCallback(event)
    }

    if (window.electronAPI?.sendRemoteInput) {
      window.electronAPI.sendRemoteInput(event)
    }
  }
}
