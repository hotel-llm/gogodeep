import { useState, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Search, X, FlaskConical, Atom, Globe, BrainCircuit, Telescope, Heart, ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import PageTransition from "@/components/PageTransition";
import ProjectileMotion from "@/components/interact/ProjectileMotion";
import {
  MitosisMeiosis, DNADoubleHelix, Photosynthesis, CirculatorySystem, NitrogenCycle,
  ProteinFolding, ActionPotential, SynapticTransmission, Homeostasis, PhylogeneticTrees,
  CellMembrane, CarbonCycle, OsmosisDiffusion, EnzymeSubstrate, GasExchange,
  WaterCycle, ImmuneResponse, FoodWebs, Pollination, SkeletalBiomechanics,
  BinaryFission, ViralReplication, CRISPRCas9, CarbonSequestration, BiomeDistribution,
} from "@/components/interact/BiologyModels";
import {
  SHM, EMInduction, CentripetalForce, Bernoulli, CarnotCycle, Optics, WaveInterference,
  ElectricCircuits, GeneralRelativity, DopplerEffect, QuantumTunneling, Friction,
  Photoelectric, Momentum, HeatTransfer, KineticTheory, RotationalInertia,
  HydrostaticPressure, NuclearFissionFusion, SolarCell, Aerodynamics,
  ParticleAccelerators, TidalForces, BridgeLoading,
} from "@/components/interact/PhysicsModels";
import {
  BohrModel, VSEPR, CrystalLattice, TitrationCurves, Chromatography, Electrolysis,
  PhaseDiagrams, ReactionKinetics, Colligative, IonicCovalent, LeChatelier, Polymers,
  RadioactiveDecay, IdealGasLaw, OrbitalHybridization, GalvanicCells, MassSpectrometry,
  EndoExo, HydrogenBonding, Superconductivity, Stoichiometry, FunctionalGroups,
  SolubilityRules, PHScale, MetallicBonding,
} from "@/components/interact/ChemistryModels";
import {
  PlateTectonics, StellarLifecycle, BlackHole, KeplerLaws, BigBang, ExoplanetTransit,
  Volcanism, AtmosphereLayers, OceanCurrents, GlacialRetreat, GreenhouseEffect,
} from "@/components/interact/EarthSpaceModels";
import {
  Fibonacci, Fractals, NormalDistribution, VectorCalculus, NeuralNetworks,
  BinarySearchTrees, GraphTheory, MarkovChains, GameTheory, ChaosTheory,
  SphericalTrig, Encryption, BigO, Blockchain,
} from "@/components/interact/MathCSModels";
import {
  QuadraticEquations, SystemsOfEquations, Logarithms, ComplexNumbers,
  SequencesSeries, BinomialTheorem, InverseFunctions, LimitsAndContinuity,
  TheDerivative, DefiniteIntegrals, TaylorSeries, DifferentialEquations,
  PythagoreanTheorem, UnitCircle, LawOfSinesCosines, ConicSections,
  Vectors2D, BinomialDistribution, LinearRegression, MatrixTransformations,
  ModularArithmetic, SetTheory, MeanMedianMode, ConditionalProbability,
  BayesTheorem, BooleanAlgebra, PrimeFactorization, Optimization,
  VolumesOfRevolution, SimilarTriangles, TrigIdentities, Inequalities,
} from "@/components/interact/MathModels2";

// ── Types ────────────────────────────────────────────────────────────────────
type Category = "Biology" | "Physics" | "Chemistry" | "Earth & Space" | "Math & CS";

interface Model {
  id: string;
  title: string;
  description: string;
  category: Category;
  component?: React.ComponentType;
}

// ── Category config ───────────────────────────────────────────────────────────
const CATEGORIES: { label: Category | "All"; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: "All",         icon: Search       },
  { label: "Physics",     icon: Atom          },
  { label: "Math & CS",   icon: BrainCircuit  },
  { label: "Biology",     icon: FlaskConical  },
  { label: "Chemistry",   icon: Globe         },
  { label: "Earth & Space", icon: Telescope  },
];

const CATEGORY_COLORS: Record<Category, { badge: string; dot: string }> = {
  "Biology":      { badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", dot: "bg-emerald-400" },
  "Physics":      { badge: "bg-blue-500/15 text-blue-400 border-blue-500/25",         dot: "bg-blue-400"    },
  "Chemistry":    { badge: "bg-purple-500/15 text-purple-400 border-purple-500/25",   dot: "bg-purple-400"  },
  "Earth & Space":{ badge: "bg-amber-500/15 text-amber-400 border-amber-500/25",      dot: "bg-amber-400"   },
  "Math & CS":    { badge: "bg-rose-500/15 text-rose-400 border-rose-500/25",         dot: "bg-rose-400"    },
};

// ── Model catalog ─────────────────────────────────────────────────────────────
const MODELS: Model[] = [
  // ── Physics ─────────────────────────────────────────────────────────────
  { id: "projectile-motion",  category: "Physics", title: "Projectile Motion",            description: "Parabolic trajectories under gravity — drag to set angle.", component: ProjectileMotion },
  { id: "shm",                category: "Physics", title: "Simple Harmonic Motion",       description: "Oscillation of pendulums and springs.", component: SHM },
  { id: "em-induction",       category: "Physics", title: "Electromagnetic Induction",    description: "Generating current via moving magnetic fields.", component: EMInduction },
  { id: "centripetal-force",  category: "Physics", title: "Centripetal Force",            description: "Objects moving in circular paths.", component: CentripetalForce },
  { id: "bernoulli",          category: "Physics", title: "Bernoulli's Principle",        description: "Pressure changes in moving fluids.", component: Bernoulli },
  { id: "carnot-cycle",       category: "Physics", title: "Carnot Cycle",                 description: "Heat engine efficiency model.", component: CarnotCycle },
  { id: "optics",             category: "Physics", title: "Optics — Refraction & Reflection", description: "Light bending through lenses and prisms.", component: Optics },
  { id: "bridge-loading",     category: "Physics", title: "Bridge Loading",               description: "Compression and tension forces in truss bridges.", component: BridgeLoading },
  { id: "electric-circuits",  category: "Physics", title: "Electric Circuits",            description: "Series and parallel layouts with resistors and capacitors.", component: ElectricCircuits },
  { id: "wave-interference",  category: "Physics", title: "Wave Interference",            description: "Constructive and destructive overlap of waves.", component: WaveInterference },
  { id: "general-relativity", category: "Physics", title: "General Relativity",           description: "Spacetime curvature around massive objects.", component: GeneralRelativity },
  { id: "particle-accelerators", category: "Physics", title: "Particle Accelerators",    description: "Magnetic steering of subatomic particles.", component: ParticleAccelerators },
  { id: "nuclear-fission-fusion", category: "Physics", title: "Nuclear Fission & Fusion", description: "Splitting and joining of atomic nuclei.", component: NuclearFissionFusion },
  { id: "doppler-effect",     category: "Physics", title: "Doppler Effect",               description: "Frequency shifts in sound or light from moving sources.", component: DopplerEffect },
  { id: "quantum-tunneling",  category: "Physics", title: "Quantum Tunneling",            description: "Particles passing through potential energy barriers.", component: QuantumTunneling },
  { id: "solar-cell",         category: "Physics", title: "Solar Cell Function",          description: "The photovoltaic effect in semiconductors.", component: SolarCell },
  { id: "aerodynamics",       category: "Physics", title: "Aerodynamics — Lift",          description: "Air pressure differentials on wing aerofoils.", component: Aerodynamics },
  { id: "friction",           category: "Physics", title: "Friction & Normal Force",      description: "Interaction between surfaces on an incline.", component: Friction },
  { id: "photoelectric",      category: "Physics", title: "Photoelectric Effect",         description: "Light-induced electron emission.", component: Photoelectric },
  { id: "rotational-inertia", category: "Physics", title: "Rotational Inertia",           description: "Distribution of mass in spinning objects.", component: RotationalInertia },
  { id: "tidal-forces",       category: "Physics", title: "Tidal Forces",                 description: "Gravitational interaction between Earth and the Moon.", component: TidalForces },
  { id: "hydrostatic-pressure", category: "Physics", title: "Hydrostatic Pressure",      description: "Pressure gradients in deep water.", component: HydrostaticPressure },
  { id: "kinetic-theory",     category: "Physics", title: "Kinetic Theory of Gases",      description: "Particle collisions in a closed container.", component: KineticTheory },
  { id: "momentum",           category: "Physics", title: "Momentum Conservation",        description: "Elastic and inelastic collisions.", component: Momentum },
  { id: "heat-transfer",      category: "Physics", title: "Heat Transfer",                description: "Conduction, convection, and radiation.", component: HeatTransfer },

  // ── Math & CS ────────────────────────────────────────────────────────────
  { id: "fibonacci",          category: "Math & CS",     title: "Fibonacci Sequence",     description: "Mathematical patterns in nature — shells, flowers, spirals.", component: Fibonacci },
  { id: "fractals",           category: "Math & CS",     title: "Fractals (Mandelbrot)",  description: "Self-similar geometric patterns and the Mandelbrot set.", component: Fractals },
  { id: "normal-distribution", category: "Math & CS",   title: "Normal Distribution",    description: "Bell curve probability modelling.", component: NormalDistribution },
  { id: "vector-calculus",    category: "Math & CS",     title: "Vector Calculus",        description: "Gradient, divergence, and curl in field models.", component: VectorCalculus },
  { id: "neural-networks",    category: "Math & CS",     title: "Neural Networks",        description: "Mathematical nodes mimicking brain architecture.", component: NeuralNetworks },
  { id: "binary-search-trees", category: "Math & CS",   title: "Binary Search Trees",    description: "Logarithmic data organisation — insert, search, delete.", component: BinarySearchTrees },
  { id: "graph-theory",       category: "Math & CS",     title: "Graph Theory",           description: "Nodes and edges in network analysis.", component: GraphTheory },
  { id: "markov-chains",      category: "Math & CS",     title: "Markov Chains",          description: "Probability-based state transitions.", component: MarkovChains },
  { id: "game-theory",        category: "Math & CS",     title: "Game Theory",            description: "Strategic interaction models — Prisoner's Dilemma.", component: GameTheory },
  { id: "chaos-theory",       category: "Math & CS",     title: "Chaos Theory",           description: "The butterfly effect in sensitive dynamical systems.", component: ChaosTheory },
  { id: "spherical-trig",     category: "Math & CS",     title: "Spherical Trigonometry", description: "Navigation and mapping on curved surfaces.", component: SphericalTrig },
  { id: "encryption",         category: "Math & CS",     title: "Encryption Algorithms",  description: "RSA and public/private key mechanics.", component: Encryption },
  { id: "big-o",              category: "Math & CS",     title: "Big O Notation",         description: "Complexity scaling in computer algorithms.", component: BigO },
  { id: "blockchain",         category: "Math & CS",     title: "Blockchain Ledger",      description: "Distributed, sequential data verification.", component: Blockchain },

  // ── Math (Algebra & Functions) ───────────────────────────────────────────
  { id: "quadratic-equations",   category: "Math & CS", title: "Quadratic Equations",      description: "Parabolas, roots, vertex and discriminant with live sliders.", component: QuadraticEquations },
  { id: "systems-of-equations",  category: "Math & CS", title: "Systems of Equations",     description: "Two intersecting lines — substitution and elimination visualised.", component: SystemsOfEquations },
  { id: "logarithms",            category: "Math & CS", title: "Logarithms",               description: "Log curves, their exponential inverse, and key properties.", component: Logarithms },
  { id: "complex-numbers",       category: "Math & CS", title: "Complex Numbers",          description: "Addition and multiplication of complex numbers on the Argand plane.", component: ComplexNumbers },
  { id: "sequences-series",      category: "Math & CS", title: "Sequences & Series",       description: "Arithmetic and geometric progressions with partial sum visualisation.", component: SequencesSeries },
  { id: "binomial-theorem",      category: "Math & CS", title: "Binomial Theorem",         description: "Pascal's triangle and (x+y)^n expansions.", component: BinomialTheorem },
  { id: "inverse-functions",     category: "Math & CS", title: "Inverse Functions",        description: "f(x) and f⁻¹(x) reflected over y = x.", component: InverseFunctions },
  { id: "inequalities",          category: "Math & CS", title: "Inequalities",             description: "Shaded solution regions for linear and quadratic inequalities.", component: Inequalities },

  // ── Math (Calculus) ──────────────────────────────────────────────────────
  { id: "limits-continuity",     category: "Math & CS", title: "Limits & Continuity",      description: "Left- and right-hand limits, holes, and discontinuities.", component: LimitsAndContinuity },
  { id: "the-derivative",        category: "Math & CS", title: "The Derivative",           description: "Tangent line sliding along a curve — slope as rate of change.", component: TheDerivative },
  { id: "optimization",          category: "Math & CS", title: "Optimization",             description: "Finding maxima and minima of functions within a domain.", component: Optimization },
  { id: "definite-integrals",    category: "Math & CS", title: "Definite Integrals",       description: "Riemann sums converging to the area under a curve.", component: DefiniteIntegrals },
  { id: "taylor-series",         category: "Math & CS", title: "Taylor & Maclaurin Series", description: "Polynomial approximations converging to sin, cos, and eˣ.", component: TaylorSeries },
  { id: "differential-equations",category: "Math & CS", title: "Differential Equations",   description: "Slope fields and solution curves for dy/dt = ky.", component: DifferentialEquations },
  { id: "volumes-of-revolution", category: "Math & CS", title: "Volumes of Revolution",    description: "Disk and shell methods for rotating a curve around an axis.", component: VolumesOfRevolution },

  // ── Math (Geometry & Trig) ───────────────────────────────────────────────
  { id: "pythagorean-theorem",   category: "Math & CS", title: "Pythagorean Theorem",      description: "Visual square-area proof of a² + b² = c².", component: PythagoreanTheorem },
  { id: "unit-circle",           category: "Math & CS", title: "Unit Circle",              description: "sin, cos, and tan in all four quadrants — animatable.", component: UnitCircle },
  { id: "law-sines-cosines",     category: "Math & CS", title: "Law of Sines & Cosines",   description: "Solving non-right triangles with sliders for angles and sides.", component: LawOfSinesCosines },
  { id: "conic-sections",        category: "Math & CS", title: "Conic Sections",           description: "Eccentricity slider morphs between circle, ellipse, and hyperbola.", component: ConicSections },
  { id: "vectors-2d",            category: "Math & CS", title: "Vectors in 2D",            description: "Addition, dot product, and angle between two vectors.", component: Vectors2D },
  { id: "similar-triangles",     category: "Math & CS", title: "Similar Triangles",        description: "Scale factor and proportional sides under AA similarity.", component: SimilarTriangles },
  { id: "trig-identities",       category: "Math & CS", title: "Trig Identities",          description: "Pythagorean, double-angle and tan identities verified numerically.", component: TrigIdentities },

  // ── Math (Statistics & Probability) ─────────────────────────────────────
  { id: "binomial-distribution", category: "Math & CS", title: "Binomial Distribution",    description: "P(X=k) bar chart with adjustable n and p.", component: BinomialDistribution },
  { id: "linear-regression",     category: "Math & CS", title: "Linear Regression",        description: "Least-squares line of best fit and r² correlation coefficient.", component: LinearRegression },
  { id: "mean-median-mode",      category: "Math & CS", title: "Mean, Median & Mode",      description: "How outliers shift the mean while the median stays robust.", component: MeanMedianMode },
  { id: "conditional-probability",category:"Math & CS", title: "Conditional Probability",  description: "P(A|B) from proportional Venn diagram areas.", component: ConditionalProbability },
  { id: "bayes-theorem",         category: "Math & CS", title: "Bayes' Theorem",           description: "Prior, likelihood and posterior in a medical-test scenario.", component: BayesTheorem },

  // ── Math (Discrete & Logic) ──────────────────────────────────────────────
  { id: "matrix-transformations",category: "Math & CS", title: "Matrix Transformations",   description: "2×2 matrix warping of a unit grid — determinant and presets.", component: MatrixTransformations },
  { id: "modular-arithmetic",    category: "Math & CS", title: "Modular Arithmetic",       description: "Clock-face visualisation of mod n and step cycles.", component: ModularArithmetic },
  { id: "set-theory",            category: "Math & CS", title: "Set Theory",               description: "Venn diagram for union, intersection, difference and complement.", component: SetTheory },
  { id: "boolean-algebra",       category: "Math & CS", title: "Boolean Algebra",          description: "Truth tables and gate diagrams for AND, OR, XOR and more.", component: BooleanAlgebra },
  { id: "prime-factorization",   category: "Math & CS", title: "Prime Factorization",      description: "Factor tree breaking any number into its prime bases.", component: PrimeFactorization },

  // ── Chemistry ────────────────────────────────────────────────────────────
  { id: "bohr-model",         category: "Chemistry", title: "Bohr Atomic Model",          description: "Electrons orbiting a central nucleus in energy shells.", component: BohrModel },
  { id: "vsepr",              category: "Chemistry", title: "VSEPR Theory",               description: "Molecular geometry and 3D shapes from electron pairs.", component: VSEPR },
  { id: "crystal-lattice",    category: "Chemistry", title: "Crystal Lattice Structures", description: "Atomic arrangements in solids — FCC, BCC, simple cubic.", component: CrystalLattice },
  { id: "titration-curves",   category: "Chemistry", title: "Titration Curves",           description: "pH changes during acid-base neutralization.", component: TitrationCurves },
  { id: "chromatography",     category: "Chemistry", title: "Chromatography",             description: "Separation of mixtures based on affinity.", component: Chromatography },
  { id: "electrolysis",       category: "Chemistry", title: "Electrolysis",               description: "Chemical decomposition via electric current.", component: Electrolysis },
  { id: "phase-diagrams",     category: "Chemistry", title: "Phase Diagrams",             description: "Transitions between solid, liquid, and gas states.", component: PhaseDiagrams },
  { id: "reaction-kinetics",  category: "Chemistry", title: "Reaction Kinetics",          description: "Activation energy barriers in chemical reactions.", component: ReactionKinetics },
  { id: "colligative",        category: "Chemistry", title: "Colligative Properties",     description: "Boiling point elevation and freezing point depression.", component: Colligative },
  { id: "ionic-covalent",     category: "Chemistry", title: "Ionic vs. Covalent Bonding", description: "Electron transfer versus electron sharing.", component: IonicCovalent },
  { id: "le-chatelier",       category: "Chemistry", title: "Le Chatelier's Principle",   description: "Equilibrium shifts under stress.", component: LeChatelier },
  { id: "polymers",           category: "Chemistry", title: "Polymers",                   description: "Long-chain molecular structures.", component: Polymers },
  { id: "radioactive-decay",  category: "Chemistry", title: "Radioactive Decay",          description: "Alpha, beta, and gamma emission over time.", component: RadioactiveDecay },
  { id: "ideal-gas-law",      category: "Chemistry", title: "Ideal Gas Law",              description: "Relationships between P, V, n, and T.", component: IdealGasLaw },
  { id: "orbital-hybridization", category: "Chemistry", title: "Orbital Hybridization",  description: "Mixing of atomic orbitals — sp, sp², sp³.", component: OrbitalHybridization },
  { id: "galvanic-cells",     category: "Chemistry", title: "Galvanic Cells",             description: "Chemical energy converting to electrical energy.", component: GalvanicCells },
  { id: "mass-spectrometry",  category: "Chemistry", title: "Mass Spectrometry",          description: "Sorting ions by mass-to-charge ratio.", component: MassSpectrometry },
  { id: "endo-exo",           category: "Chemistry", title: "Endothermic vs. Exothermic", description: "Heat absorption and release in reactions.", component: EndoExo },
  { id: "hydrogen-bonding",   category: "Chemistry", title: "Hydrogen Bonding",           description: "Intermolecular forces in water and DNA.", component: HydrogenBonding },
  { id: "superconductivity",  category: "Chemistry", title: "Superconductivity",          description: "Zero electrical resistance at low temperatures.", component: Superconductivity },
  { id: "stoichiometry",      category: "Chemistry", title: "Stoichiometry",              description: "Balancing chemical equations and molar ratios.", component: Stoichiometry },
  { id: "functional-groups",  category: "Chemistry", title: "Functional Groups",          description: "Hydroxyl, carboxyl, amino, and other molecular appendages.", component: FunctionalGroups },
  { id: "solubility-rules",   category: "Chemistry", title: "Solubility Rules",           description: "Precipitate formation in aqueous solutions.", component: SolubilityRules },
  { id: "ph-scale",           category: "Chemistry", title: "Acidity & Basicity (pH)",    description: "Logarithmic scale of hydrogen ion concentration.", component: PHScale },
  { id: "metallic-bonding",   category: "Chemistry", title: "Metallic Bonding",           description: "The sea-of-electrons model in metals.", component: MetallicBonding },

  // ── Earth & Space ────────────────────────────────────────────────────────
  { id: "plate-tectonics",    category: "Earth & Space", title: "Plate Tectonics",        description: "Subduction, divergence, and transform fault boundaries.", component: PlateTectonics },
  { id: "stellar-lifecycle",  category: "Earth & Space", title: "Stellar Life Cycle",     description: "From nebula to white dwarf or supernova.", component: StellarLifecycle },
  { id: "black-hole",         category: "Earth & Space", title: "Black Hole Event Horizon", description: "The point of no return for light near a black hole.", component: BlackHole },
  { id: "kepler-laws",        category: "Earth & Space", title: "Orbital Mechanics (Kepler)", description: "Planetary paths and elliptical orbits around stars.", component: KeplerLaws },
  { id: "big-bang",           category: "Earth & Space", title: "The Big Bang",           description: "Cosmic expansion over 13.8 billion years.", component: BigBang },
  { id: "exoplanet-transit",  category: "Earth & Space", title: "Exoplanet Transit Method", description: "Detecting planets via star brightness dips.", component: ExoplanetTransit },
  { id: "volcanism",          category: "Earth & Space", title: "Tectonic Volcanism",     description: "Magma chambers and mantle plumes.", component: Volcanism },
  { id: "atmosphere-layers",  category: "Earth & Space", title: "Atmospheric Layers",     description: "Troposphere, stratosphere, mesosphere, and beyond.", component: AtmosphereLayers },
  { id: "ocean-currents",     category: "Earth & Space", title: "Ocean Currents",         description: "The global thermohaline conveyor belt.", component: OceanCurrents },
  { id: "glacial-retreat",    category: "Earth & Space", title: "Glacial Retreat",        description: "Ice mass changes over geological time.", component: GlacialRetreat },
  { id: "greenhouse-effect",  category: "Earth & Space", title: "The Greenhouse Effect",  description: "Trap-and-release of infrared radiation in the atmosphere.", component: GreenhouseEffect },

  // ── Biology ─────────────────────────────────────────────────────────────
  { id: "mitosis-meiosis",    category: "Biology", title: "Mitosis & Meiosis",            description: "Stages of cell division and chromosome alignment.", component: MitosisMeiosis },
  { id: "dna-helix",          category: "Biology", title: "DNA Double Helix",             description: "Molecular structure of base pairs and sugar-phosphate backbones.", component: DNADoubleHelix },
  { id: "photosynthesis",     category: "Biology", title: "Photosynthesis",               description: "Chemical conversion process inside chloroplasts.", component: Photosynthesis },
  { id: "circulatory-system", category: "Biology", title: "Human Circulatory System",     description: "Flow of oxygenated and deoxygenated blood through the heart.", component: CirculatorySystem },
  { id: "nitrogen-cycle",     category: "Biology", title: "The Nitrogen Cycle",           description: "How nitrogen moves through the biosphere and atmosphere.", component: NitrogenCycle },
  { id: "protein-folding",    category: "Biology", title: "Protein Folding",              description: "How amino acid chains form complex 3D structures.", component: ProteinFolding },
  { id: "action-potential",   category: "Biology", title: "Action Potential",             description: "Electrical signal travelling down a neuron's axon.", component: ActionPotential },
  { id: "synaptic-transmission", category: "Biology", title: "Synaptic Transmission",    description: "Neurotransmitters crossing the synaptic cleft.", component: SynapticTransmission },
  { id: "homeostasis",        category: "Biology", title: "Homeostasis",                  description: "Feedback loops — insulin/glucagon regulation.", component: Homeostasis },
  { id: "phylogenetic-trees", category: "Biology", title: "Phylogenetic Trees",           description: "Mapping common ancestry across evolutionary time.", component: PhylogeneticTrees },
  { id: "cell-membrane",      category: "Biology", title: "Cell Membrane Fluid Mosaic",  description: "Phospholipid bilayer and embedded membrane proteins.", component: CellMembrane },
  { id: "carbon-cycle",       category: "Biology", title: "The Carbon Cycle",             description: "Carbon exchange between oceans, land, and atmosphere.", component: CarbonCycle },
  { id: "osmosis-diffusion",  category: "Biology", title: "Osmosis & Diffusion",          description: "Movement of molecules across semi-permeable membranes.", component: OsmosisDiffusion },
  { id: "enzyme-substrate",   category: "Biology", title: "Enzyme-Substrate Lock & Key", description: "The mechanics of biological catalysis.", component: EnzymeSubstrate },
  { id: "gas-exchange",       category: "Biology", title: "Respiratory Gas Exchange",     description: "Alveoli function in the lungs.", component: GasExchange },
  { id: "water-cycle",        category: "Biology", title: "The Water Cycle",              description: "Evaporation, condensation, and precipitation.", component: WaterCycle },
  { id: "immune-response",    category: "Biology", title: "Immune Response",              description: "Pathogen recognition by T-cells and B-cells.", component: ImmuneResponse },
  { id: "food-webs",          category: "Biology", title: "Food Webs",                    description: "Energy transfer across trophic levels.", component: FoodWebs },
  { id: "pollination",        category: "Biology", title: "Pollination Cycles",           description: "Reproductive mechanics of flowering plants.", component: Pollination },
  { id: "skeletal-biomechanics", category: "Biology", title: "Skeletal Biomechanics",    description: "Pivot, hinge, and ball-and-socket joints.", component: SkeletalBiomechanics },
  { id: "binary-fission",     category: "Biology", title: "Bacterial Binary Fission",    description: "Asexual reproduction in prokaryotes.", component: BinaryFission },
  { id: "viral-replication",  category: "Biology", title: "Viral Replication",            description: "The lytic and lysogenic cycles.", component: ViralReplication },
  { id: "crispr",             category: "Biology", title: "CRISPR-Cas9",                  description: "Mechanism of targeted gene editing.", component: CRISPRCas9 },
  { id: "carbon-sequestration", category: "Biology", title: "Carbon Sequestration",      description: "How plants and soil store atmospheric carbon.", component: CarbonSequestration },
  { id: "biome-distribution", category: "Biology", title: "Biome Distribution",          description: "Global mapping of climates and ecosystems.", component: BiomeDistribution },
];

// ── Page component ────────────────────────────────────────────────────────────
const FAVORITES_KEY = "interact_favorites";

function loadFavorites(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]")); }
  catch { return new Set(); }
}

export default function Interact() {
  const [activeCategory, setActiveCategory] = useState<Category | "All">("All");
  const [search, setSearch] = useState("");
  const [openModel, setOpenModel] = useState<Model | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const [collapsed, setCollapsed] = useState<Set<Category>>(new Set(["Physics", "Math & CS", "Biology", "Chemistry", "Earth & Space"]));

  function toggleCollapsed(category: Category) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category); else next.add(category);
      return next;
    });
  }

  function toggleFavorite(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return MODELS.filter((m) => {
      if (activeCategory !== "All" && m.category !== activeCategory) return false;
      if (q && !m.title.toLowerCase().includes(q) && !m.description.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [activeCategory, search]);

  // Group by category for display
  const grouped = useMemo(() => {
    const order: Category[] = ["Physics", "Math & CS", "Biology", "Chemistry", "Earth & Space"];
    const map: Partial<Record<Category, Model[]>> = {};
    filtered.forEach((m) => {
      if (!map[m.category]) map[m.category] = [];
      map[m.category]!.push(m);
    });
    return order.filter((c) => map[c]?.length).map((c) => ({ category: c, models: map[c]! }));
  }, [filtered]);

  return (
    <PageTransition>
      <Helmet>
        <title>Interact</title>
        <meta name="description" content="Explore 100+ interactive STEM diagrams and models. Drag, adjust, and animate concepts across biology, physics, chemistry, and mathematics." />
      </Helmet>

      <div className="relative z-10 min-h-screen pt-14">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="border-b border-border bg-card/60 backdrop-blur-sm">
          <div className="container py-8">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Interactive</p>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">Interactive Models</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Click any concept to explore an interactive diagram or simulation.
              </p>
            </div>

            {/* Search + Category tabs */}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search concepts…"
                  className="h-8 border-border bg-secondary pl-8 text-xs"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map(({ label }) => (
                  <button
                    key={label}
                    onClick={() => setActiveCategory(label as Category | "All")}
                    className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors
                      ${activeCategory === label
                        ? "border-primary bg-primary/15 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Model grid ──────────────────────────────────────────────────── */}
        <div className="container py-8 space-y-10">
          {/* Favorites section */}
          {favorites.size > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                <h2 className="text-sm font-semibold text-foreground">Favorites</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {MODELS.filter((m) => favorites.has(m.id)).map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    isFavorite={true}
                    onToggleFavorite={(e) => toggleFavorite(model.id, e)}
                    onClick={() => model.component && setOpenModel(model)}
                  />
                ))}
              </div>
            </section>
          )}

          {grouped.length === 0 ? (
            <div className="py-24 text-center text-muted-foreground text-sm">No models match "{search}".</div>
          ) : (
            grouped.map(({ category, models }) => {
              const isCollapsed = collapsed.has(category);
              return (
                <section key={category}>
                  <button
                    onClick={() => toggleCollapsed(category)}
                    className={`flex w-full items-center gap-2 rounded-xl border px-4 py-3 text-left transition-colors hover:border-primary/40 hover:bg-accent ${isCollapsed ? "border-border bg-card" : "mb-4 border-border bg-card"}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${CATEGORY_COLORS[category].dot}`} />
                    <h2 className="text-sm font-semibold text-foreground flex-1">{category}</h2>
                    <span className="text-xs text-muted-foreground mr-1">{models.length}</span>
                    <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${isCollapsed ? "" : "rotate-180"}`} />
                  </button>
                  {!isCollapsed && (
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {models.map((model) => (
                        <ModelCard
                          key={model.id}
                          model={model}
                          isFavorite={favorites.has(model.id)}
                          onToggleFavorite={(e) => toggleFavorite(model.id, e)}
                          onClick={() => model.component && setOpenModel(model)}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })
          )}
        </div>
      </div>

      {/* ── Interactive modal ────────────────────────────────────────────── */}
      <Dialog open={!!openModel} onOpenChange={(o) => !o && setOpenModel(null)}>
        <DialogContent className="border border-border bg-card p-0 sm:max-w-5xl" style={{ height: "min(85vh, 600px)" }}>
          {openModel && (
            <>
              {/* pr-10 leaves room for the absolute-positioned DialogContent X button */}
              <DialogHeader className="flex-shrink-0 border-b border-border px-5 pr-10 py-3.5">
                <div className="flex items-center gap-3">
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_COLORS[openModel.category].badge}`}>
                    {openModel.category}
                  </span>
                  <DialogTitle className="text-base font-bold text-foreground">{openModel.title}</DialogTitle>
                  <button
                    onClick={(e) => toggleFavorite(openModel.id, e)}
                    className="ml-auto flex-shrink-0 rounded-full p-1 transition-colors hover:bg-rose-500/10"
                    title={favorites.has(openModel.id) ? "Remove from favorites" : "Add to favorites"}
                  >
                    <Heart className={`h-4 w-4 transition-colors ${favorites.has(openModel.id) ? "fill-rose-500 text-rose-500" : "text-muted-foreground hover:text-rose-400"}`} />
                  </button>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{openModel.description}</p>
              </DialogHeader>
              <div className="flex-1 overflow-hidden p-4" style={{ height: "calc(100% - 72px)" }}>
                {openModel.component && <openModel.component />}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}

// ── Model card ────────────────────────────────────────────────────────────────
function ModelCard({
  model, onClick, isFavorite = false, onToggleFavorite,
}: {
  model: Model;
  onClick: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
}) {
  const colors = CATEGORY_COLORS[model.category];
  const isLive = !!model.component;

  return (
    <button
      onClick={onClick}
      disabled={!isLive}
      className={`group relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-all duration-200
        ${isLive
          ? "border-border bg-card hover:border-primary/50 hover:bg-accent hover:shadow-lg hover:shadow-primary/5 cursor-pointer"
          : "border-border/50 bg-card/50 cursor-default opacity-60"}`}
    >
      {/* Top row: category dot + heart */}
      <div className="flex items-center justify-between">
        <span className={`h-1.5 w-1.5 rounded-full ${colors.dot}`} />
        {isLive && onToggleFavorite && (
          <button
            onClick={onToggleFavorite}
            className="rounded-full p-0.5 transition-colors hover:bg-rose-500/10"
            title={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className={`h-3.5 w-3.5 transition-colors ${isFavorite ? "fill-rose-500 text-rose-500" : "text-muted-foreground/40 group-hover:text-rose-400"}`} />
          </button>
        )}
      </div>

      {/* Title */}
      <p className={`text-sm font-semibold leading-snug text-foreground ${isLive ? "group-hover:text-primary transition-colors" : ""}`}>
        {model.title}
      </p>

      {/* Description */}
      <p className="text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
        {model.description}
      </p>

    </button>
  );
}
