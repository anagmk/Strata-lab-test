export type Group = 'A' | 'B' | 'C' | 'D'
export type Material = 'Soil' | 'Aggregate' | 'Cement' | 'Steel' | 'Brick' | 'Bitumen' | 'Concrete' | 'NDT'
export interface TestDef { code: string; name: string; material: Material; group: Group; standard: string; live?: 'cube' | 'sieve' | 'proctor' | 'crack' }

/* The 40 tests from the coverage report. `live` marks the four built in this prototype. */
const t = (code: string, name: string, material: Material, group: Group, standard: string, live?: TestDef['live']): TestDef =>
  ({ code, name, material, group, standard, live })

export const TESTS: TestDef[] = [
  // Concrete
  t('CON-01', 'Concrete Slump', 'Concrete', 'A', 'IS 1199 (Pt 2)'),
  t('CON-02', 'Concrete Compressive Strength (cube)', 'Concrete', 'A', 'IS 516 (Pt 1)', 'cube'),
  t('CON-03', 'Concrete Flexural Strength', 'Concrete', 'A', 'IS 516 (Pt 1)'),
  t('CON-04', 'Concrete Split Tensile Strength', 'Concrete', 'A', 'IS 5816'),
  t('CON-05', 'Concrete Water Absorption', 'Concrete', 'A', 'IS 1199 (Pt 5)'),
  t('CON-06', 'Concrete Permeability', 'Concrete', 'A', 'IS 3085'),
  // Cement
  t('CEM-01', 'Cement Fineness', 'Cement', 'A', 'IS 4031 (Pt 1)'),
  t('CEM-02', 'Cement Standard Consistency', 'Cement', 'A', 'IS 4031 (Pt 4)'),
  t('CEM-03', 'Cement Setting Time', 'Cement', 'A', 'IS 4031 (Pt 5)'),
  t('CEM-04', 'Cement Soundness', 'Cement', 'A', 'IS 4031 (Pt 3)'),
  t('CEM-05', 'Cement Compressive Strength', 'Cement', 'A', 'IS 4031 (Pt 6)'),
  // Aggregate
  t('AGG-01', 'Aggregate Sieve Analysis', 'Aggregate', 'A', 'IS 2386 (Pt 1)', 'sieve'),
  t('AGG-02', 'Aggregate Flakiness Index', 'Aggregate', 'A', 'IS 2386 (Pt 1)'),
  t('AGG-03', 'Aggregate Elongation Index', 'Aggregate', 'A', 'IS 2386 (Pt 1)'),
  t('AGG-04', 'Aggregate Crushing Value', 'Aggregate', 'A', 'IS 2386 (Pt 4)'),
  t('AGG-05', 'Aggregate Impact Value', 'Aggregate', 'A', 'IS 2386 (Pt 4)'),
  t('AGG-06', 'Aggregate Specific Gravity', 'Aggregate', 'A', 'IS 2386 (Pt 3)'),
  // Soil
  t('SOL-01', 'Soil Sieve Analysis', 'Soil', 'A', 'IS 2720 (Pt 4)'),
  t('SOL-02', 'Atterberg Limits', 'Soil', 'A', 'IS 2720 (Pt 5)'),
  t('SOL-03', 'Proctor Compaction', 'Soil', 'A', 'IS 2720 (Pt 7)', 'proctor'),
  t('SOL-04', 'California Bearing Ratio (CBR)', 'Soil', 'A', 'IS 2720 (Pt 16)'),
  t('SOL-05', 'Soil Permeability', 'Soil', 'A', 'IS 2720 (Pt 17)'),
  t('SOL-06', 'Direct Shear', 'Soil', 'A', 'IS 2720 (Pt 13)'),
  t('SOL-07', 'Triaxial', 'Soil', 'A', 'IS 2720 (Pt 11)'),
  // Steel
  t('STL-01', 'Steel Tensile Strength', 'Steel', 'A', 'IS 1608 / IS 1786'),
  t('STL-02', 'Steel Bend', 'Steel', 'A', 'IS 1599'),
  // Brick & tile
  t('BRK-01', 'Brick Compressive Strength', 'Brick', 'A', 'IS 3495 (Pt 1)'),
  t('BRK-02', 'Brick Water Absorption', 'Brick', 'A', 'IS 3495 (Pt 2)'),
  t('BRK-03', 'Tile Breaking Strength', 'Brick', 'A', 'IS 13630'),
  // Bitumen
  t('BIT-01', 'Bitumen Penetration', 'Bitumen', 'A', 'IS 1203'),
  t('BIT-02', 'Bitumen Ductility', 'Bitumen', 'A', 'IS 1208'),
  t('BIT-03', 'Asphalt Mix Analysis (Marshall)', 'Bitumen', 'A', 'MoRTH 500'),
  // NDT
  t('NDT-01', 'Rebound Hammer', 'NDT', 'B', 'IS 13311 (Pt 2)'),
  t('NDT-02', 'Ultrasonic Pulse Velocity (UPV)', 'NDT', 'B', 'IS 13311 (Pt 1)'),
  t('NDT-03', 'Concrete Crack Width Measurement', 'NDT', 'C', 'IS 456 cl. 35.3', 'crack'),
  t('NDT-04', 'Concrete Surface Defect Inspection', 'NDT', 'C', 'Visual / image'),
  t('NDT-05', 'Thermal Imaging Inspection', 'NDT', 'C', 'ASTM C1060'),
  t('NDT-06', 'Weld Defect Inspection', 'NDT', 'C', 'IS 2595'),
  t('NDT-07', 'Ground-Penetrating Radar (GPR)', 'NDT', 'D', 'ASTM D6432'),
  t('NDT-08', 'Structural Health Monitoring', 'NDT', 'D', 'Project-specific'),
]

export const GROUP_LABEL = {
  A: 'Full software support',
  B: 'Needs instrument',
  C: 'Image-based',
  D: 'Specialist hardware',
} as const

