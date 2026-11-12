const prefixes = ['Luna', 'Nova', 'Kora', 'Vela', 'Astra', 'Mira', 'Nexa', 'Orbi', 'Zeno', 'Sora', 'Aero', 'Caly']
const suffixes = ['Flow', 'Grid', 'Mint', 'Vale', 'Forge', 'Pulse', 'Nest', 'Arc', 'Link', 'Bloom', 'Core', 'Ray']
const symbols = ['LUM', 'NVA', 'KOR', 'VEL', 'AST', 'MIR', 'NEX', 'ORB', 'ZEN', 'SOR', 'AER', 'CAL']

function randomIndex(max: number) {
  const values = new Uint32Array(1)
  crypto.getRandomValues(values)
  return values[0] % max
}

export function generateTokenIdentity() {
  const name = `${prefixes[randomIndex(prefixes.length)]}${suffixes[randomIndex(suffixes.length)]}`
  const symbol = symbols[randomIndex(symbols.length)]
  return { name, symbol }
}
