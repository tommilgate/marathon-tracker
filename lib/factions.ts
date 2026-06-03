export interface FactionPreset {
  id: string
  name: string
  color: string        // tailwind text color
  borderColor: string  // tailwind border color
  bgColor: string      // tailwind bg color
  tbc: boolean
  materials: { materialId: string; need: number }[]
}

export const factions: FactionPreset[] = [
  {
    id: 'cyberacme',
    name: 'CyberAcme',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-400',
    bgColor: 'bg-cyan-400/10',
    tbc: false,
    materials: [
      { materialId: 'unstable-biomass',  need: 42  },
      { materialId: 'unstable-gunmetal', need: 27  },
      { materialId: 'unstable-gel',      need: 136 },
      { materialId: 'unstable-diode',    need: 45  },
      { materialId: 'unstable-lead',     need: 56  },
    ],
  },
  {
    id: 'nucaloric',
    name: 'NuCaloric',
    color: 'text-orange-400',
    borderColor: 'border-orange-400',
    bgColor: 'bg-orange-400/10',
    tbc: false,
    materials: [
      { materialId: 'neural-insulation',      need: 1   },
      { materialId: 'biolens-seed',           need: 2   },
      { materialId: 'neurochem-pack',         need: 38  },
      { materialId: 'tarax-seed',             need: 41  },
      { materialId: 'sterilized-biostripping',need: 37  },
      { materialId: 'reclaimed-biostripping', need: 90  },
      { materialId: 'spark-leaf',             need: 86  },
      { materialId: 'dermachem-pack',         need: 17  },
      { materialId: 'unstable-biomass',       need: 112 },
    ],
  },
  {
    id: 'traxus',
    name: 'Traxus',
    color: 'text-red-400',
    borderColor: 'border-red-400',
    bgColor: 'bg-red-400/10',
    tbc: false,
    materials: [
      { materialId: 'predictive-framework', need: 1  },
      { materialId: 'ballistic-turbine',    need: 1  },
      { materialId: 'anomalous-wire',       need: 15 },
      { materialId: 'centinite-rods',       need: 6  },
      { materialId: 'tachyon-filament',     need: 12 },
      { materialId: 'deimosite-rods',       need: 46 },
      { materialId: 'plasma-filament',      need: 35 },
      { materialId: 'altered-wire',         need: 26 },
      { materialId: 'unstable-gunmetal',    need: 99 },
    ],
  },
  {
    id: 'mida',
    name: 'MIDA',
    color: 'text-lime-400',
    borderColor: 'border-lime-400',
    bgColor: 'bg-lime-400/10',
    tbc: false,
    materials: [
      { materialId: 'ballistic-turbine',   need: 1   },
      { materialId: 'biolens-seed',        need: 1   },
      { materialId: 'volatile-compounds',  need: 43  },
      { materialId: 'thoughtwave-lens',    need: 53  },
      { materialId: 'surveillance-lens',   need: 134 },
      { materialId: 'dynamic-compounds',   need: 116 },
      { materialId: 'unstable-lead',       need: 174 },
    ],
  },
  {
    id: 'arachne',
    name: 'Arachne',
    color: 'text-pink-400',
    borderColor: 'border-pink-400',
    bgColor: 'bg-pink-400/10',
    tbc: false,
    materials: [
      { materialId: 'reflex-coil',         need: 2   },
      { materialId: 'enzyme-replicator',   need: 1   },
      { materialId: 'biomata-resin',       need: 60  },
      { materialId: 'biomata-node',        need: 87  },
      { materialId: 'drone-node',          need: 182 },
      { materialId: 'drone-resin',         need: 126 },
      { materialId: 'unstable-gel',        need: 220 },
    ],
  },
  {
    id: 'sekiguchi',
    name: 'Sekiguchi',
    color: 'text-violet-400',
    borderColor: 'border-violet-400',
    bgColor: 'bg-violet-400/10',
    tbc: false,
    materials: [
      { materialId: 'unstable-diode',       need: 113 },
      { materialId: 'paradox-circuit',      need: 46  },
      { materialId: 'storage-drive',        need: 156 },
      { materialId: 'neural-insulation',    need: 1   },
      { materialId: 'amygdala-drive',       need: 22  },
      { materialId: 'fractal-circuit',      need: 69  },
      { materialId: 'predictive-framework', need: 1   },
    ],
  },
]
