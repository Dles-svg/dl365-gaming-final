export interface HardwareSpecs {
  gpu: string
  cpu: string
  ram: string
  tier: 'basic' | 'advanced' | 'professional' | 'elite' | 'enthusiast' | 'extreme'
  coinsPerHour: number
  performanceScore: number
}

interface GPUInfo {
  name: string
  memory?: number
  vendor?: string
}

interface CPUInfo {
  name: string
  cores?: number
  threads?: number
}

const GPU_TIER_MAP: Record<string, { tier: HardwareSpecs['tier'], score: number }> = {
  'GTX 1650': { tier: 'basic', score: 10 },
  'GTX 1660': { tier: 'basic', score: 12 },
  'RX 5600': { tier: 'basic', score: 11 },
  'RX 5500': { tier: 'basic', score: 9 },

  'RTX 3060': { tier: 'advanced', score: 20 },
  'RTX 2060': { tier: 'advanced', score: 18 },
  'RX 6700': { tier: 'advanced', score: 22 },
  'RX 6600': { tier: 'advanced', score: 19 },

  'RTX 3070': { tier: 'professional', score: 30 },
  'RTX 4070': { tier: 'professional', score: 32 },
  'RX 6800': { tier: 'professional', score: 31 },

  'RTX 3080': { tier: 'elite', score: 40 },
  'RX 6900': { tier: 'elite', score: 41 },

  'RTX 4080': { tier: 'enthusiast', score: 50 },
  'RX 7900': { tier: 'enthusiast', score: 51 },

  'RTX 4090': { tier: 'extreme', score: 60 },
  'RTX 4090 Ti': { tier: 'extreme', score: 62 },
  'RX 7990': { tier: 'extreme', score: 61 },
}

const CPU_TIER_MAP: Record<string, { tier: HardwareSpecs['tier'], score: number }> = {
  'i3-10100': { tier: 'basic', score: 10 },
  'i3-12100': { tier: 'basic', score: 11 },
  'Ryzen 3 3200G': { tier: 'basic', score: 9 },
  'Ryzen 3 3100': { tier: 'basic', score: 10 },

  'i5-11400': { tier: 'advanced', score: 20 },
  'i5-12400': { tier: 'advanced', score: 21 },
  'Ryzen 5 5600X': { tier: 'advanced', score: 22 },
  'Ryzen 5 3600': { tier: 'advanced', score: 19 },

  'i7-11700K': { tier: 'professional', score: 30 },
  'i7-13700K': { tier: 'professional', score: 32 },
  'Ryzen 7 5800X': { tier: 'professional', score: 31 },
  'Ryzen 7 3700X': { tier: 'professional', score: 29 },

  'i9-11900K': { tier: 'elite', score: 40 },
  'i9-13900K': { tier: 'elite', score: 42 },
  'Ryzen 9 5900X': { tier: 'elite', score: 41 },
  'Ryzen 9 3950X': { tier: 'elite', score: 40 },

  'i9-12900K': { tier: 'enthusiast', score: 50 },
  'i9-14900K': { tier: 'enthusiast', score: 52 },
  'Ryzen 9 5950X': { tier: 'enthusiast', score: 51 },

  'Xeon Platinum 8380': { tier: 'extreme', score: 60 },
  'EPYC 7763': { tier: 'extreme', score: 62 },
  'Threadripper': { tier: 'extreme', score: 61 },
}

function detectGPU(): GPUInfo {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')

    if (gl) {
      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info')
      if (debugInfo) {
        const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
        return { name: renderer, vendor: (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) }
      }
    }
  } catch (e) {
    console.error('GPU detection failed:', e)
  }

  return { name: 'Unknown GPU' }
}

function detectCPU(): CPUInfo {
  try {
    const cores = navigator.hardwareConcurrency || 1

    return {
      name: `CPU with ${cores} cores`,
      cores: cores
    }
  } catch (e) {
    console.error('CPU detection failed:', e)
  }

  return { name: 'Unknown CPU' }
}

function detectRAM(): string {
  try {
    if ('deviceMemory' in navigator) {
      const memory = (navigator as any).deviceMemory
      return `${memory}GB`
    }
  } catch (e) {
    console.error('RAM detection failed:', e)
  }

  return 'Unknown RAM'
}

function classifyGPUTier(gpuName: string): { tier: HardwareSpecs['tier'], score: number } {
  const normalizedGPU = gpuName.toUpperCase()

  for (const [key, value] of Object.entries(GPU_TIER_MAP)) {
    if (normalizedGPU.includes(key.toUpperCase())) {
      return value
    }
  }

  if (normalizedGPU.includes('4090')) return { tier: 'extreme', score: 60 }
  if (normalizedGPU.includes('4080')) return { tier: 'enthusiast', score: 50 }
  if (normalizedGPU.includes('3080') || normalizedGPU.includes('6900')) return { tier: 'elite', score: 40 }
  if (normalizedGPU.includes('3070') || normalizedGPU.includes('6800')) return { tier: 'professional', score: 30 }
  if (normalizedGPU.includes('3060') || normalizedGPU.includes('6700') || normalizedGPU.includes('6600')) return { tier: 'advanced', score: 20 }
  if (normalizedGPU.includes('1660') || normalizedGPU.includes('1650') || normalizedGPU.includes('5600')) return { tier: 'basic', score: 10 }

  return { tier: 'basic', score: 5 }
}

function classifyCPUTier(cpuName: string, cores: number): { tier: HardwareSpecs['tier'], score: number } {
  const normalizedCPU = cpuName.toUpperCase()

  for (const [key, value] of Object.entries(CPU_TIER_MAP)) {
    if (normalizedCPU.includes(key.toUpperCase())) {
      return value
    }
  }

  if (cores >= 64) return { tier: 'extreme', score: 60 }
  if (cores >= 32) return { tier: 'enthusiast', score: 50 }
  if (cores >= 16) return { tier: 'elite', score: 40 }
  if (cores >= 12) return { tier: 'professional', score: 30 }
  if (cores >= 8) return { tier: 'advanced', score: 20 }
  if (cores >= 4) return { tier: 'basic', score: 10 }

  return { tier: 'basic', score: 5 }
}

function classifyRAMTier(ramStr: string): { tier: HardwareSpecs['tier'], score: number } {
  const ramGB = parseInt(ramStr)

  if (isNaN(ramGB)) return { tier: 'basic', score: 5 }

  if (ramGB >= 128) return { tier: 'extreme', score: 60 }
  if (ramGB >= 64) return { tier: 'enthusiast', score: 50 }
  if (ramGB >= 32) return { tier: 'elite', score: 40 }
  if (ramGB >= 24) return { tier: 'professional', score: 30 }
  if (ramGB >= 16) return { tier: 'advanced', score: 20 }
  if (ramGB >= 8) return { tier: 'basic', score: 10 }

  return { tier: 'basic', score: 5 }
}

function calculateOverallTier(gpuScore: number, cpuScore: number, ramScore: number): { tier: HardwareSpecs['tier'], coinsPerHour: number } {
  const avgScore = (gpuScore + cpuScore + ramScore) / 3

  if (avgScore >= 55) return { tier: 'extreme', coinsPerHour: 6 }
  if (avgScore >= 45) return { tier: 'enthusiast', coinsPerHour: 5 }
  if (avgScore >= 35) return { tier: 'elite', coinsPerHour: 4 }
  if (avgScore >= 25) return { tier: 'professional', coinsPerHour: 3 }
  if (avgScore >= 15) return { tier: 'advanced', coinsPerHour: 2 }

  return { tier: 'basic', coinsPerHour: 1 }
}

export async function detectHardwareSpecs(): Promise<HardwareSpecs> {
  const gpu = detectGPU()
  const cpu = detectCPU()
  const ram = detectRAM()

  const gpuTier = classifyGPUTier(gpu.name)
  const cpuTier = classifyCPUTier(cpu.name, cpu.cores || 1)
  const ramTier = classifyRAMTier(ram)

  const overall = calculateOverallTier(gpuTier.score, cpuTier.score, ramTier.score)
  const performanceScore = (gpuTier.score + cpuTier.score + ramTier.score) / 3

  return {
    gpu: gpu.name,
    cpu: cpu.name,
    ram: ram,
    tier: overall.tier,
    coinsPerHour: overall.coinsPerHour,
    performanceScore
  }
}
