import confetti from 'canvas-confetti';

export const fireEcoModeConfetti = () => {
  void confetti({
    particleCount: 180,
    spread: 120,
    origin: { y: 0.7 },
    colors: ['#8DDCFF', '#73B1FF', '#FEE140', '#F95700'],
    scalar: 1.2,
  });
};

export default fireEcoModeConfetti;
