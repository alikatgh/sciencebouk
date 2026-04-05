export interface EquationHook {
  hook: string
  hookAction: string
}

export const equationHooks: Record<number, EquationHook> = {
  1: {
    hook: "You're building a ramp for wheelchair access. The wall is 3 feet high, you want the ramp to start 4 feet away. How long does the ramp need to be?",
    hookAction: "Drag the wall height and distance to find out.",
  },
  2: {
    hook: "An earthquake measures 7.0 on the Richter scale. Another measures 8.0. Is the second one 'a little bigger'? It's actually 10\u00D7 more powerful. That's what logarithms do.",
    hookAction: "Drag x and y to see how log turns multiplication into addition.",
  },
  3: {
    hook: "You're driving and your GPS shows speed = 60 mph. But the speedometer is broken \u2014 you only have the odometer. How do you figure out your speed from distance alone?",
    hookAction: "Drag the point along the curve to see speed appear as the steepness of the line.",
  },
  4: {
    hook: "Why do astronauts float in space? They don't \u2014 gravity is still pulling them. The force barely changes at space station altitude. They float because they're falling sideways.",
    hookAction: "Drag the masses and distance to see how gravity changes.",
  },
  5: {
    hook: "Pluck a guitar string. Why does it make a musical note instead of random noise? Because only certain wave shapes can fit on the string.",
    hookAction: "Adjust frequency and amplitude to see how waves behave.",
  },
  6: {
    hook: "Your phone screen can rotate 90\u00B0. How does the software know where each pixel goes? It multiplies every coordinate by i.",
    hookAction: "Tap 'Multiply by i' and watch every point rotate exactly 90\u00B0.",
  },
  7: {
    hook: "Count the corners, edges, and flat faces of any 3D shape you can imagine. Corners minus edges plus faces always equals 2. Always.",
    hookAction: "Tap different shapes and try to break the rule.",
  },
  8: {
    hook: "In a class of 1000 students, how many score above 90%? This curve answers that question. It's why 'grading on a curve' exists \u2014 and why average isn't an insult.",
    hookAction: "Drag the center and width of the curve to see how scores spread.",
  },
  9: {
    hook: "Every sound your phone plays is just a recipe of pure tones mixed together. This is how MP3 compression, voice recognition, and autotune work.",
    hookAction: "Toggle individual tones on and off to hear how they combine into complex sounds.",
  },
  10: {
    hook: "Why does smoke curl instead of going straight up? Why do airplanes have that specific wing shape? This equation governs every fluid on Earth \u2014 and we still can't fully solve it.",
    hookAction: "Adjust viscosity and flow speed to see how fluid behaves around objects.",
  },
  11: {
    hook: "How does your WiFi signal get through walls? An electric field shaking back and forth launches a wave that travels at the speed of light. You just made a radio wave.",
    hookAction: "Place charges and watch electromagnetic field lines appear.",
  },
  12: {
    hook: "Why can't you unscramble an egg? Technically possible, but the odds are 1 in a number with more digits than atoms in the universe. That's entropy.",
    hookAction: "Drag the temperature slider and watch order dissolve into chaos.",
  },
  13: {
    hook: "GPS satellites move fast and sit in weaker gravity. Without Einstein's corrections, your phone's location would drift by 10 km per day. Time itself runs at different speeds.",
    hookAction: "Drag the speed slider to see time slow down and objects shrink.",
  },
  14: {
    hook: "An electron isn't a tiny ball \u2014 it's a cloud of probability. Confine it more, and it gets MORE energetic. This is why atoms don't collapse and why transistors get weird when they get small.",
    hookAction: "Change the quantum number n and box width to see the wave function change.",
  },
  15: {
    hook: "You're playing 20 Questions. If the answer is almost certainly 'yes', the question was useless. The most useful question is the one you're most uncertain about.",
    hookAction: "Drag the probability to see how uncertainty (entropy) changes.",
  },
  16: {
    hook: "Weather forecasts are useless past 10 days. Why? The tiniest change in starting conditions leads to a completely different outcome. This is the butterfly effect.",
    hookAction: "Drag the r parameter and watch order dissolve into chaos.",
  },
  17: {
    hook: "You can buy the RIGHT to purchase a stock at today's price, but in the future. How much is that right worth? It depends on how unpredictable the stock is.",
    hookAction: "Drag volatility and time to see how option prices change.",
  },
}
