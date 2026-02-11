/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      animation: {
        'shake': 'shake 0.5s ease-in-out',
        'scale-in': 'scale-in 0.4s ease-out forwards',
        'confetti-fall': 'confetti-fall 2s ease-in forwards',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-6px)' },
          '40%, 80%': { transform: 'translateX(6px)' },
        },
        'scale-in': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'confetti-fall': {
          '0%': {
            transform: 'translate(-50%, 0) translate(0, 0) rotate(var(--confetti-rotation))',
            opacity: '1',
          },
          '10%': {
            transform: 'translate(-50%, 0) translate(calc(sin(var(--confetti-angle)) * var(--confetti-velocity)), calc(cos(var(--confetti-angle)) * var(--confetti-velocity) * -0.5)) rotate(calc(var(--confetti-rotation) + var(--confetti-rotation-speed) * 0.1))',
            opacity: '1',
          },
          '100%': {
            transform: 'translate(-50%, 0) translate(calc(sin(var(--confetti-angle)) * var(--confetti-velocity) * 1.5), calc(100vh + cos(var(--confetti-angle)) * var(--confetti-velocity) * -0.3)) rotate(calc(var(--confetti-rotation) + var(--confetti-rotation-speed)))',
            opacity: '0',
          },
        },
      },
    },
  },
  plugins: [],
}
