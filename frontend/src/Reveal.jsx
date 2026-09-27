import { motion, useReducedMotion } from 'framer-motion'

const EASE = [0.22, 0.61, 0.36, 1]

const viewport = { once: true, amount: 0.2, margin: '0px 0px -12% 0px' }

function Reveal({ as = 'div', delay = 0, distance = 26, hover, children, ...rest }) {
  const reducedMotion = useReducedMotion()
  const Element = motion[as]

  if (reducedMotion) {
    const Static = as
    return <Static {...rest}>{children}</Static>
  }

  return (
    <Element
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={hover}
      viewport={viewport}
      transition={{ duration: 0.55, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </Element>
  )
}

export default Reveal
